import type { PerspectiveCamera } from 'three';
import { activeBattles } from '../sim/combat';
import { CONFIG } from '../sim/config';
import { ufoSquadronDistanceKm } from '../sim/measure';
import { isUnlocked } from '../sim/researchTree';
import type { GameState } from '../sim/state';
import { WEAPON_STATS } from '../sim/weapons';
import type { UfoLayer } from './ufoLayer';
import { HARDPOINT_FORWARD_DY, HARDPOINTS, type UnitLayer } from './units';
import { WEAPON_MODULES } from './weaponModules';

const MINIGUN_RANGE_KM = WEAPON_STATS[CONFIG.squadron.weaponModule].rangeKm; // gittata minigun

// Moduli arma dei CACCIA sul globo (minigun sugli hardpoint delle ali). Speculare a come
// UfoLayer monta le torrette sull'UFO, ma il caccia è una mesh Three.js: qui montiamo il
// modulo come overlay DOM in coordinate-schermo (pattern di combatFx/selection), proiettando
// gli hardpoint reali della mesh (UnitLayer.projectSquadronPoint) e orientando l'arma verso
// l'UFO quando ingaggiata (classe `.on` = spin del rotore + lampo). Ogni minigun è in uno
// shadow root proprio (id/keyframe isolati). Espone la volata per i traccianti (combatFx).

const SIDES = ['left', 'right'] as const;
type Side = (typeof SIDES)[number];

// larghezza del minigun in rapporto alla larghezza proiettata del caccia (pod sull'ala).
// Allineata alla proporzione della finestra di scontro (≈11%): là il modulo è 64×0,34375 ≈ 22
// unità su un jet largo 200 viewBox = 0,11. Con 0,34 risultava ~3× troppo grande sul globo.
const MINIGUN_TO_JET_WIDTH = 0.11;
const MIN_PX = 4; // dimensione minima a distanza (basso: deve rimpicciolirsi col caccia)
const MAX_PX = 40; // tetto quando il caccia è vicinissimo alla camera

interface Minigun {
  host: HTMLDivElement;
  svg: SVGSVGElement;
  on: boolean;
  muzzle: { x: number; y: number } | null; // volata schermo (origine traccianti)
}

export class SquadronWeaponLayer {
  private readonly overlay: HTMLDivElement;
  private readonly guns = new Map<string, Minigun>(); // `squadronId:side` → minigun
  private readonly art = WEAPON_MODULES[CONFIG.squadron.weaponModule]!; // minigun: sempre presente

  constructor(parent: HTMLElement = document.body) {
    this.overlay = document.createElement('div');
    this.overlay.id = 'squadron-weapons';
    parent.appendChild(this.overlay);
  }

  reset(): void {
    this.guns.forEach(g => g.host.remove());
    this.guns.clear();
  }

  // Volata (px schermo) di un minigun montato: origine dei traccianti gialli sul globo.
  minigunMuzzleRect(squadronId: number, side: Side): { x: number; y: number } | null {
    return this.guns.get(`${squadronId}:${side}`)?.muzzle ?? null;
  }

  update(state: GameState, units: UnitLayer, ufos: UfoLayer, camera: PerspectiveCamera): void {
    // minigun non ancora ricercato: nessuna arma montata sui caccia
    if (!isUnlocked(state, 'weapon.minigun')) {
      if (this.guns.size) this.reset();
      return;
    }
    // squadroni ingaggiati → primo UFO bersaglio (lo stesso del motore di combattimento)
    const targetBySquadron = new Map<number, number>();
    for (const battle of activeBattles(state)) {
      const ufo = battle.attackers[0];
      if (!ufo) continue;
      for (const def of battle.defenders) targetBySquadron.set(def.id, ufo.id);
    }

    const live = new Set<string>();
    for (const sq of state.squadrons) {
      // armi montate sempre (pattuglia E trasferimento): il caccia è armato comunque
      const rect = units.squadronRect(sq.id, camera);
      if (!rect) {
        // caccia occluso/non proiettabile: nascondi le sue armi ma non distruggerle
        for (const side of SIDES) this.hide(`${sq.id}:${side}`);
        continue;
      }
      const px = clamp(rect.w * MINIGUN_TO_JET_WIDTH, MIN_PX, MAX_PX);
      const h = px * (this.art.viewH / this.art.viewW);
      const targetUfoId = targetBySquadron.get(sq.id);
      // ufoCombatRect (non ufoBodyRect): la mira deve agganciare l'UFO anche in rapimento
      const aim = targetUfoId != null ? ufos.ufoCombatRect(targetUfoId) : null;
      // GITTATA: il minigun fa fuoco (.on) solo se l'UFO è entro la portata; intanto continua
      // a INSEGUIRLO col puntamento (rotazione) anche fuori gittata
      const targetUfo = targetUfoId != null ? state.ufos.find(u => u.id === targetUfoId) : undefined;
      const inRange = targetUfo != null && ufoSquadronDistanceKm(targetUfo) <= MINIGUN_RANGE_KM;

      for (const side of SIDES) {
        const key = `${sq.id}:${side}`;
        live.add(key);
        const hp = units.projectSquadronPoint(sq.id, HARDPOINTS[side].x, HARDPOINTS[side].y, camera);
        if (!hp) {
          this.hide(key);
          continue;
        }
        // direzione di mira: verso l'UFO se ingaggiato, altrimenti lungo il muso (a riposo)
        let dx: number;
        let dy: number;
        if (aim) {
          dx = aim.cx - hp.x;
          dy = aim.cy - hp.y;
        } else {
          const fwd = units.projectSquadronPoint(
            sq.id,
            HARDPOINTS[side].x,
            HARDPOINTS[side].y - HARDPOINT_FORWARD_DY,
            camera,
          );
          dx = fwd ? fwd.x - hp.x : 0;
          dy = fwd ? fwd.y - hp.y : -1;
        }
        // l'asset ha la volata in alto (−y): ruota perché "su" punti lungo (dx,dy)
        const rot = (Math.atan2(dx, -dy) * 180) / Math.PI;
        const gun = this.ensure(key);
        gun.host.style.width = `${px.toFixed(1)}px`;
        gun.host.style.height = `${h.toFixed(1)}px`;
        gun.host.style.left = `${(hp.x - px / 2).toFixed(1)}px`;
        gun.host.style.top = `${(hp.y - h / 2).toFixed(1)}px`;
        gun.host.style.transform = `rotate(${rot.toFixed(1)}deg)`;
        gun.host.style.display = '';
        const on = aim != null && inRange; // spin/lampo solo in gittata
        if (on !== gun.on) {
          gun.svg.classList.toggle('on', on);
          gun.on = on;
        }
        // volata = centro + direzione di mira × metà altezza (la bocca è in cima all'asset)
        const len = Math.hypot(dx, dy) || 1;
        gun.muzzle = { x: hp.x + (dx / len) * (h / 2), y: hp.y + (dy / len) * (h / 2) };
      }
    }

    // rimuovi le armi degli squadroni spariti
    for (const key of [...this.guns.keys()]) {
      if (!live.has(key)) {
        this.guns.get(key)!.host.remove();
        this.guns.delete(key);
      }
    }
  }

  private hide(key: string): void {
    const g = this.guns.get(key);
    if (g) {
      g.host.style.display = 'none';
      g.muzzle = null;
    }
  }

  private ensure(key: string): Minigun {
    let g = this.guns.get(key);
    if (!g) {
      const host = document.createElement('div');
      host.className = 'squadron-weapon';
      host.style.pointerEvents = 'none'; // i click restano al canvas (picking dei caccia)
      const shadow = host.attachShadow({ mode: 'open' });
      shadow.innerHTML = `<style>:host{display:block}svg{width:100%;height:100%;display:block}${this.art.fireStyleLoop}</style>${this.art.raw}`;
      const svg = shadow.querySelector('svg') as SVGSVGElement;
      svg.classList.add('weapon-module'); // scope dei selettori `.weapon-module.on`
      this.overlay.appendChild(host);
      g = { host, svg, on: false, muzzle: null };
      this.guns.set(key, g);
    }
    return g;
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
