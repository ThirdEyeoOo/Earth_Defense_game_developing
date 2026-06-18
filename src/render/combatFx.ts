import type { PerspectiveCamera } from 'three';
import type { GameState } from '../sim/state';
import type { Shot } from './combatEngine';
import type { UfoLayer } from './ufoLayer';
import type { UnitLayer } from './units';

// Proiettili di combattimento sul GLOBO: overlay in coordinate-schermo (NON CSS2D) sopra
// il canvas, come selection.ts. Disegna gli shot del CombatEngine — origine = volata della
// torretta (ufoLayer.turretMuzzleRect), bersaglio = hitbox del caccia (unitLayer.squadronRect)
// — interpolando per `gameMinutes` (così accelerano/si congelano col tempo di gioco).
// Il danno NON è qui: lo applica il motore; questa è pura visualizzazione.
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
    camera: PerspectiveCamera,
  ): void {
    const alive = new Set<number>();
    for (const shot of shots) {
      alive.add(shot.id);
      const from = ufos.turretMuzzleRect(shot.ufoId, shot.side) ?? this.ufoCenter(ufos, shot.ufoId);
      const target = units.squadronRect(shot.targetSquadronId, camera);
      if (!from || !target) {
        this.removeProj(shot.id);
        continue;
      }
      const span = Math.max(1e-6, shot.t1 - shot.t0);
      const k = Math.min(1, Math.max(0, (gameMinutes - shot.t0) / span));
      if (k < 1) {
        const x = from.x + (target.cx - from.x) * k;
        const y = from.y + (target.cy - from.y) * k;
        const ang = (Math.atan2(target.cy - from.y, target.cx - from.x) * 180) / Math.PI;
        const proj = this.proj(shot.id);
        proj.style.left = `${x.toFixed(1)}px`;
        proj.style.top = `${y.toFixed(1)}px`;
        proj.style.transform = `translate(-50%,-50%) rotate(${ang.toFixed(1)}deg)`;
      } else {
        this.removeProj(shot.id);
        if (!this.landed.has(shot.id)) {
          this.landed.add(shot.id);
          this.spawnImpact(target.cx, target.cy);
        }
      }
    }
    // pulizia di shot non più presenti
    for (const id of [...this.projs.keys()]) if (!alive.has(id)) this.removeProj(id);
    for (const id of [...this.landed]) if (!alive.has(id)) this.landed.delete(id);
  }

  private ufoCenter(ufos: UfoLayer, id: number): { x: number; y: number } | null {
    const r = ufos.ufoBodyRect(id);
    return r ? { x: r.cx, y: r.cy } : null;
  }

  private proj(id: number): HTMLDivElement {
    let el = this.projs.get(id);
    if (!el) {
      el = document.createElement('div');
      el.className = 'combat-proj';
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

  private spawnImpact(x: number, y: number): void {
    const imp = document.createElement('div');
    imp.className = 'combat-impact';
    imp.style.left = `${x.toFixed(1)}px`;
    imp.style.top = `${y.toFixed(1)}px`;
    this.overlay.appendChild(imp);
    window.setTimeout(() => imp.remove(), 420);
  }
}
