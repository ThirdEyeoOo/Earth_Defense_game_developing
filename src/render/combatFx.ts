import type { PerspectiveCamera } from 'three';
import type { GameState } from '../sim/state';
import type { CityStructuresLayer } from './cityStructures';
import type { Shot } from './combatEngine';
import type { SquadronWeaponLayer } from './squadronWeapons';
import type { UfoLayer } from './ufoLayer';
import type { UnitLayer } from './units';

// Proiettili di combattimento sul GLOBO: overlay in coordinate-schermo (NON CSS2D) sopra
// il canvas, come selection.ts. Disegna gli shot del CombatEngine in ENTRAMBE le direzioni:
// torrette UFO → caccia (plasma, verde) e minigun caccia → UFO (tracciante, giallo). Origine
// e bersaglio si ricavano dal tipo di sorgente/bersaglio dello shot; l'interpolazione è per
// `gameMinutes` (così accelerano/si congelano col tempo di gioco). Il danno NON è qui: lo
// applica il motore; questa è pura visualizzazione.

type Pt = { x: number; y: number };

// classe del proiettile/impatto per arma: minigun tracciante giallo, torre bolide ciano,
// plasma UFO bolide verde
function projClass(shot: Shot): string {
  if (shot.weapon === 'minigun') return 'combat-tracer';
  if (shot.weapon === 'defense-tower') return 'combat-proj combat-proj--cyan';
  return 'combat-proj';
}
function impactClass(shot: Shot): string {
  if (shot.weapon === 'minigun') return 'combat-spark';
  if (shot.weapon === 'defense-tower') return 'combat-impact combat-impact--cyan';
  return 'combat-impact';
}

export class CombatFxLayer {
  private readonly overlay: HTMLDivElement;
  private readonly projs = new Map<number, HTMLDivElement>(); // shot.id → proiettile
  private readonly landed = new Set<number>(); // shot già esplosi (impatto una volta)

  constructor(parent: HTMLElement = document.body) {
    this.overlay = document.createElement('div');
    this.overlay.id = 'combat-fx-globe';
    parent.appendChild(this.overlay);
  }

  reset(): void {
    this.projs.forEach(el => el.remove());
    this.projs.clear();
    this.landed.clear();
  }

  update(
    shots: Shot[],
    gameMinutes: number,
    _state: GameState,
    units: UnitLayer,
    ufos: UfoLayer,
    squadronWeapons: SquadronWeaponLayer,
    cityStructures: CityStructuresLayer,
    camera: PerspectiveCamera,
  ): void {
    const alive = new Set<number>();
    for (const shot of shots) {
      alive.add(shot.id);
      const from = this.originOf(shot, units, ufos, squadronWeapons, cityStructures, camera);
      const target = this.targetOf(shot, units, ufos, cityStructures, camera);
      if (!from || !target) {
        this.removeProj(shot.id);
        continue;
      }
      const span = Math.max(1e-6, shot.t1 - shot.t0);
      const k = Math.min(1, Math.max(0, (gameMinutes - shot.t0) / span));
      if (k < 1) {
        const x = from.x + (target.x - from.x) * k;
        const y = from.y + (target.y - from.y) * k;
        const ang = (Math.atan2(target.y - from.y, target.x - from.x) * 180) / Math.PI;
        const proj = this.proj(shot.id, shot);
        proj.style.left = `${x.toFixed(1)}px`;
        proj.style.top = `${y.toFixed(1)}px`;
        proj.style.transform = `translate(-50%,-50%) rotate(${ang.toFixed(1)}deg)`;
      } else {
        this.removeProj(shot.id);
        if (!this.landed.has(shot.id)) {
          this.landed.add(shot.id);
          this.spawnImpact(target.x, target.y, shot);
        }
      }
    }
    // pulizia di shot non più presenti
    for (const id of [...this.projs.keys()]) if (!alive.has(id)) this.removeProj(id);
    for (const id of [...this.landed]) if (!alive.has(id)) this.landed.delete(id);
  }

  private originOf(
    shot: Shot,
    units: UnitLayer,
    ufos: UfoLayer,
    squadronWeapons: SquadronWeaponLayer,
    cityStructures: CityStructuresLayer,
    camera: PerspectiveCamera,
  ): Pt | null {
    if (shot.from.kind === 'ufo') {
      return ufos.turretMuzzleRect(shot.from.id, shot.from.side) ?? this.ufoCenter(ufos, shot.from.id);
    }
    if (shot.from.kind === 'tower') return cityStructures.towerMuzzleRect(shot.from.id);
    const muzzle = squadronWeapons.minigunMuzzleRect(shot.from.id, shot.from.side);
    if (muzzle) return muzzle;
    const r = units.squadronRect(shot.from.id, camera);
    return r ? { x: r.cx, y: r.cy } : null;
  }

  private targetOf(
    shot: Shot,
    units: UnitLayer,
    ufos: UfoLayer,
    cityStructures: CityStructuresLayer,
    camera: PerspectiveCamera,
  ): Pt | null {
    if (shot.to.kind === 'squadron') {
      const r = units.squadronRect(shot.to.id, camera);
      return r ? { x: r.cx, y: r.cy } : null;
    }
    if (shot.to.kind === 'tower') return cityStructures.towerMuzzleRect(shot.to.id);
    // bersaglio UFO: ufoCombatRect (non ufoBodyRect) così funziona ANCHE in rapimento
    const r = ufos.ufoCombatRect(shot.to.id);
    return r ? { x: r.cx, y: r.cy } : null;
  }

  private ufoCenter(ufos: UfoLayer, id: number): Pt | null {
    const r = ufos.ufoCombatRect(id);
    return r ? { x: r.cx, y: r.cy } : null;
  }

  private proj(id: number, shot: Shot): HTMLDivElement {
    let el = this.projs.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = projClass(shot);
      this.overlay.appendChild(el);
      this.projs.set(id, el);
    }
    return el;
  }

  private removeProj(id: number): void {
    const el = this.projs.get(id);
    if (el) {
      el.remove();
      this.projs.delete(id);
    }
  }

  private spawnImpact(x: number, y: number, shot: Shot): void {
    const imp = document.createElement('div');
    imp.className = impactClass(shot);
    imp.style.left = `${x.toFixed(1)}px`;
    imp.style.top = `${y.toFixed(1)}px`;
    this.overlay.appendChild(imp);
    window.setTimeout(() => imp.remove(), 420);
  }
}
