import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { activeBattles, ENGAGEABLE_PHASES } from '../sim/combat';
import { CONFIG } from '../sim/config';
import type { GameState } from '../sim/state';
import { createHpBar, type Faction } from './hpBar';
import { isOccludedByGlobe } from './horizon';
import type { TrackedUnit } from './selection';
import type { UnitLayer } from './units';

// dopo la fine dell'ingaggio la barra di un'unità integra resta visibile
// ancora un attimo, poi dissolve (le unità danneggiate la tengono sempre)
const LINGER_MS = 1200;
const BAR_WIDTH_PX = 72;

interface Bar {
  object: CSS2DObject;
  anchor: HTMLDivElement;
  host: HTMLDivElement;
  update: (ratio: number) => void;
  lastRelevantMs: number;
}

export class HpBarLayer {
  private bars = new Map<string, Bar>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  // `selected` = unità mostrata dal widget di selezione (render/selection.ts):
  // la sua barra HP la disegna quel widget, quindi qui la si salta (no doppioni).
  update(
    state: GameState,
    units: UnitLayer,
    camera: THREE.Camera,
    selected: TrackedUnit,
  ): void {
    const now = performance.now();
    // città in combattimento: condizione condivisa con la sim (resolveCombat)
    const engagedCities = new Set(activeBattles(state).map(b => b.cityId));
    const selKey = selected
      ? selected.kind === 'ufo'
        ? `u:${selected.id}`
        : `s:${selected.id}`
      : null;

    const seen = new Set<string>();
    for (const ufo of state.ufos) {
      const key = `u:${ufo.id}`;
      if (key === selKey) continue;
      const engaged = ENGAGEABLE_PHASES.has(ufo.phase) && engagedCities.has(ufo.targetCityId);
      seen.add(key);
      this.updateBar(
        key, 'alien', ufo.hp / CONFIG.ufoAbductor.hp, engaged,
        units.ufoPosition(ufo.id), now, camera,
      );
    }
    for (const sq of state.squadrons) {
      const key = `s:${sq.id}`;
      if (key === selKey) continue;
      const engaged = sq.transfer === null && engagedCities.has(sq.cityId);
      seen.add(key);
      this.updateBar(
        key, 'human', sq.hp / CONFIG.squadron.hp, engaged,
        units.squadronPosition(sq.id), now, camera,
      );
    }
    // unità uscite di scena (o ora selezionate): via la barra fluttuante
    for (const key of [...this.bars.keys()]) {
      if (!seen.has(key)) this.removeBar(key);
    }
  }

  reset(): void {
    for (const key of [...this.bars.keys()]) this.removeBar(key);
  }

  private updateBar(
    key: string,
    faction: Faction,
    ratio: number,
    engaged: boolean,
    position: THREE.Vector3 | null,
    now: number,
    camera: THREE.Camera,
  ): void {
    const relevant = ratio < 1 || engaged;
    let bar = this.bars.get(key);
    if (!bar) {
      if (!relevant) return;
      bar = this.createBar(faction);
      this.bars.set(key, bar);
    }
    if (relevant) {
      bar.lastRelevantMs = now;
    } else if (now - bar.lastRelevantMs > LINGER_MS) {
      this.removeBar(key);
      return;
    }
    bar.host.classList.toggle('unit-hp-host--fading', !relevant);
    if (position) bar.object.position.copy(position);
    bar.object.visible = position !== null && !isOccludedByGlobe(bar.object.position, camera);
    bar.update(ratio);
  }

  private createBar(faction: Faction): Bar {
    const anchor = document.createElement('div');
    anchor.className = 'unit-hp-anchor';
    const hp = createHpBar(faction, BAR_WIDTH_PX);
    anchor.appendChild(hp.host);
    const object = new CSS2DObject(anchor);
    this.group.add(object);
    return { object, anchor, host: hp.host, update: hp.update, lastRelevantMs: 0 };
  }

  private removeBar(key: string): void {
    const bar = this.bars.get(key);
    if (!bar) return;
    this.group.remove(bar.object);
    bar.anchor.remove(); // CSS2DRenderer non rimuove i nodi DOM da solo
    this.bars.delete(key);
  }
}
