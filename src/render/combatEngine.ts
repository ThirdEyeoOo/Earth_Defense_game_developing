import { activeBattles } from '../sim/combat';
import { cmdDamageSquadron } from '../sim/commands';
import { CONFIG } from '../sim/config';
import type { GameState } from '../sim/state';
import { WEAPON_STATS } from '../sim/weapons';

// Motore di combattimento in TEMPO REALE (non più a tick). Possiede l'elenco degli
// "shot" logici: ogni torretta montata (un hardpoint = una sorgente) spara a cadenza in
// MINUTI-GIOCO; il proiettile vola per `FLIGHT_GAME_MIN` minuti-gioco e all'arrivo applica
// il danno via comando (cmdDamageSquadron). Le viste (finestra di scontro, FX sul globo)
// disegnano gli stessi shot interpolando per `gameMinutes`, così il danno è applicato una
// volta sola e le due viste restano sincrone. Coerenza coi timing: tutto è in minuti-gioco
// (accelera con la velocità, si congela in pausa).
//
// Per ora spara solo la torretta dell'UFO (arma dei caccia: prossimo step).

export interface Shot {
  id: number;
  ufoId: number;
  side: 'left' | 'right';
  targetSquadronId: number;
  t0: number; // minuti-gioco allo sparo
  t1: number; // minuti-gioco all'impatto
  landed: boolean;
}

const SIDES = ['left', 'right'] as const;
const FLIGHT_GAME_MIN = 0.8; // durata del volo (~40% della cadenza): a 1× ≈ 0,8 s
const IMPACT_LINGER_GAME_MIN = 0.3; // quanto lo shot resta in lista dopo l'impatto (per l'FX)
const HIGH_SPEED = 10; // oltre: risoluzione in blocco (danno immediato, niente proiettili)
const MAX_QUEUED = 4; // colpi max accodati in un frame (anti-raffica dopo lag/alta velocità)

export class CombatEngine {
  readonly shots: Shot[] = [];
  private nextFireAt = new Map<string, number>(); // `ufoId:side` → prossimo sparo (min-gioco)
  private nextShotId = 1;

  reset(): void {
    this.shots.length = 0;
    this.nextFireAt.clear();
    this.nextShotId = 1;
  }

  update(state: GameState, gameMinutes: number, speed: number): void {
    const weapon = WEAPON_STATS[CONFIG.ufoAbductor.weaponModule];
    const cooldown = weapon.cooldownGameMinutes;
    const battles = activeBattles(state);
    const liveKeys = new Set<string>();

    if (speed > 0) {
      for (const battle of battles) {
        for (const ufo of battle.attackers) {
          for (const side of SIDES) {
            const key = `${ufo.id}:${side}`;
            liveKeys.add(key);
            // sincronizza alla prima comparsa, sfasando dx di mezzo cooldown (alternanza)
            if (!this.nextFireAt.has(key)) {
              this.nextFireAt.set(key, gameMinutes + (side === 'right' ? cooldown / 2 : 0));
            }
            let at = this.nextFireAt.get(key)!;
            let fired = 0;
            while (gameMinutes >= at && fired < MAX_QUEUED) {
              const target = state.squadrons.find(
                s => s.cityId === battle.cityId && s.transfer === null,
              );
              if (!target) break; // nessun difensore vivo: niente bersaglio
              if (speed > HIGH_SPEED) {
                cmdDamageSquadron(state, target.id, Math.max(0, weapon.damage - 0));
              } else {
                this.shots.push({
                  id: this.nextShotId++,
                  ufoId: ufo.id,
                  side,
                  targetSquadronId: target.id,
                  t0: at,
                  t1: at + FLIGHT_GAME_MIN,
                  landed: false,
                });
              }
              at += cooldown;
              fired += 1;
            }
            // backlog enorme (pausa lunga / 1000×): non accodare, riparti da adesso
            if (fired >= MAX_QUEUED && gameMinutes > at) at = gameMinutes;
            this.nextFireAt.set(key, at);
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
        cmdDamageSquadron(state, shot.targetSquadronId, weapon.damage);
        shot.landed = true;
      }
      if (gameMinutes >= shot.t1 + IMPACT_LINGER_GAME_MIN) this.shots.splice(i, 1);
    }
  }
}
