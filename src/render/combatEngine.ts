import type { Battle } from '../sim/combat';
import { activeBattles, isEngageable } from '../sim/combat';
import { cmdDamageSquadron, cmdDamageUfo } from '../sim/commands';
import { CONFIG } from '../sim/config';
import { ufoSquadronDistanceKm } from '../sim/measure';
import { isUnlocked } from '../sim/researchTree';
import type { GameState, UfoState } from '../sim/state';
import type { WeaponModuleId } from '../sim/weapons';
import { WEAPON_STATS } from '../sim/weapons';

// Motore di combattimento in TEMPO REALE (non più a tick). Possiede l'elenco degli
// "shot" logici: ogni arma montata (un hardpoint = una sorgente) spara a cadenza in
// MINUTI-GIOCO; il proiettile vola per `FLIGHT_GAME_MIN` minuti-gioco e all'arrivo applica
// il danno via comando. Le viste (finestra di scontro, FX sul globo) disegnano gli stessi
// shot interpolando per `gameMinutes`, così il danno è applicato una volta sola e le due
// viste restano sincrone. Tutto è in minuti-gioco (accelera con la velocità, si congela in pausa).
//
// Il fuoco è a DUE SENSI: torrette dell'UFO → caccia (cmdDamageSquadron) e minigun dei
// caccia → UFO (cmdDamageUfo, che può abbatterlo).

export type UnitKind = 'ufo' | 'squadron';
export type Side = 'left' | 'right';

export interface ShotEnd {
  kind: UnitKind;
  id: number;
}

export interface Shot {
  id: number;
  weapon: WeaponModuleId; // per scegliere colore/FX (plasma verde vs minigun giallo)
  damage: number; // danno congelato allo sparo (applicato a t1)
  from: ShotEnd & { side: Side }; // sorgente: unità + hardpoint
  to: ShotEnd; // bersaglio
  t0: number; // minuti-gioco allo sparo
  t1: number; // minuti-gioco all'impatto
  landed: boolean;
}

const SIDES: readonly Side[] = ['left', 'right'];
const FLIGHT_GAME_MIN = 0.8; // durata del volo (~40% della cadenza torretta): a 1× ≈ 0,8 s
const IMPACT_LINGER_GAME_MIN = 0.3; // quanto lo shot resta in lista dopo l'impatto (per l'FX)
const HIGH_SPEED = 10; // oltre: risoluzione in blocco (danno immediato, niente proiettili)
const MAX_QUEUED = 4; // colpi-proiettile max accodati in un frame (anti-raffica, limita i div)
const BLOCK_CAP = 4096; // fermo anti-runaway per la risoluzione in blocco (alta velocità)

export class CombatEngine {
  readonly shots: Shot[] = [];
  private nextFireAt = new Map<string, number>(); // `kind:id:side` → prossimo sparo (min-gioco)
  private nextShotId = 1;

  reset(): void {
    this.shots.length = 0;
    this.nextFireAt.clear();
    this.nextShotId = 1;
  }

  update(state: GameState, gameMinutes: number, speed: number): void {
    const battles = activeBattles(state);
    const liveKeys = new Set<string>();

    if (speed > 0) {
      const ufoWeapon = WEAPON_STATS[CONFIG.ufoAbductor.weaponModule];
      const jetWeapon = WEAPON_STATS[CONFIG.squadron.weaponModule];
      for (const battle of battles) {
        // torrette dell'UFO → un difensore di stanza
        for (const ufo of battle.attackers) {
          if (!state.ufos.some(u => u.id === ufo.id)) continue;
          for (const side of SIDES) {
            this.scheduleFire(state, gameMinutes, speed, liveKeys, {
              from: { kind: 'ufo', id: ufo.id, side },
              weapon: CONFIG.ufoAbductor.weaponModule,
              damage: ufoWeapon.damage,
              cooldown: ufoWeapon.cooldownGameMinutes,
              rangeKm: ufoWeapon.rangeKm,
              targetKind: 'squadron',
              findTarget: () => firstDefender(state, battle),
            });
          }
        }
        // minigun dei caccia difensori → un UFO attaccante (solo se l'arma è ricercata)
        for (const sq of battle.defenders) {
          if (!isUnlocked(state, 'weapon.minigun')) break;
          if (!state.squadrons.some(s => s.id === sq.id)) continue;
          for (const side of SIDES) {
            this.scheduleFire(state, gameMinutes, speed, liveKeys, {
              from: { kind: 'squadron', id: sq.id, side },
              weapon: CONFIG.squadron.weaponModule,
              damage: jetWeapon.damage,
              cooldown: jetWeapon.cooldownGameMinutes,
              rangeKm: jetWeapon.rangeKm,
              targetKind: 'ufo',
              findTarget: () => firstAttacker(state, battle),
            });
          }
        }
      }
    }

    // dimentica le sorgenti non più ingaggiate (evita accumulo di chiavi stantie)
    for (const key of [...this.nextFireAt.keys()]) {
      if (!liveKeys.has(key)) this.nextFireAt.delete(key);
    }

    // avanza gli shot: impatto a t1 (applica il danno, una volta), poi linger e rimozione
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const shot = this.shots[i];
      if (!shot.landed && gameMinutes >= shot.t1) {
        this.applyImpact(state, shot.to.kind, shot.to.id, shot.damage);
        shot.landed = true;
      }
      if (gameMinutes >= shot.t1 + IMPACT_LINGER_GAME_MIN) this.shots.splice(i, 1);
    }
  }

  // Programma il fuoco di un singolo hardpoint: accoda gli shot maturati (o applica il
  // danno in blocco oltre HIGH_SPEED), sincronizzando il lato destro a mezzo cooldown.
  private scheduleFire(
    state: GameState,
    gameMinutes: number,
    speed: number,
    liveKeys: Set<string>,
    spec: {
      from: ShotEnd & { side: Side };
      weapon: WeaponModuleId;
      damage: number;
      cooldown: number;
      rangeKm: number;
      targetKind: UnitKind;
      findTarget: () => { id: number } | null | undefined;
    },
  ): void {
    const key = `${spec.from.kind}:${spec.from.id}:${spec.from.side}`;
    liveKeys.add(key);
    if (!this.nextFireAt.has(key)) {
      this.nextFireAt.set(key, gameMinutes + (spec.from.side === 'right' ? spec.cooldown / 2 : 0));
    }
    // GITTATA: l'UFO della coppia è `from` (torretta) o il bersaglio (minigun). Fuori gittata
    // niente fuoco e niente arretrati (riparte da adesso quando rientra), così non si scarica
    // una raffica accumulata appena il bersaglio entra in portata.
    const target0 = spec.findTarget();
    const pairUfo = this.pairUfo(state, spec.from, target0);
    if (!pairUfo || ufoSquadronDistanceKm(pairUfo) > spec.rangeKm) {
      this.nextFireAt.set(key, gameMinutes);
      return;
    }
    let at = this.nextFireAt.get(key)!;
    let fired = 0;
    // In blocco (alta velocità) il cap NON deve strozzare le armi a cadenza alta — altrimenti
    // un minigun (8 colpi/blocco) e una torretta (1 colpo/blocco) verrebbero pareggiati,
    // falsando il bilanciamento. Si applica il danno per ogni colpo maturato (il loop si chiude
    // da sé quando il bersaglio muore: findTarget → null). In modalità proiettile resta il cap
    // basso per non generare centinaia di div. `BLOCK_CAP` è solo un fermo anti-runaway.
    const cap = speed > HIGH_SPEED ? BLOCK_CAP : MAX_QUEUED;
    while (gameMinutes >= at && fired < cap) {
      const target = spec.findTarget();
      if (!target) break; // nessun bersaglio vivo
      if (speed > HIGH_SPEED) {
        this.applyImpact(state, spec.targetKind, target.id, spec.damage);
      } else {
        this.shots.push({
          id: this.nextShotId++,
          weapon: spec.weapon,
          damage: spec.damage,
          from: spec.from,
          to: { kind: spec.targetKind, id: target.id },
          t0: at,
          t1: at + FLIGHT_GAME_MIN,
          landed: false,
        });
      }
      at += spec.cooldown;
      fired += 1;
    }
    // backlog enorme (pausa lunga / 1000×): non accodare, riparti da adesso
    if (fired >= cap && gameMinutes > at) at = gameMinutes;
    this.nextFireAt.set(key, at);
  }

  // L'UFO coinvolto in una coppia di fuoco: è la sorgente (torretta UFO) o il bersaglio
  // (minigun caccia). Serve per misurare la distanza caccia↔UFO (gating della gittata).
  private pairUfo(
    state: GameState,
    from: ShotEnd & { side: Side },
    target: { id: number } | null | undefined,
  ): UfoState | null {
    const id = from.kind === 'ufo' ? from.id : target?.id;
    return id != null ? (state.ufos.find(u => u.id === id) ?? null) : null;
  }

  private applyImpact(state: GameState, kind: UnitKind, id: number, damage: number): void {
    if (kind === 'squadron') cmdDamageSquadron(state, id, damage);
    else cmdDamageUfo(state, id, damage);
  }
}

// primo difensore vivo di stanza sulla città della battaglia
function firstDefender(state: GameState, battle: Battle): { id: number } | undefined {
  return state.squadrons.find(s => s.cityId === battle.cityId && s.transfer === null);
}

// primo UFO attaccante ancora vivo e ingaggiabile su quella città
function firstAttacker(state: GameState, battle: Battle): { id: number } | undefined {
  return state.ufos.find(u => u.targetCityId === battle.cityId && isEngageable(u));
}
