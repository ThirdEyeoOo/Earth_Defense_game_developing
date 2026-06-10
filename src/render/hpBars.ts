import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import alienBarRaw from '../../Assets/Widgets/Barre/health-bar-aliens.svg?raw';
import humanBarRaw from '../../Assets/Widgets/Barre/health-bar-humans.svg?raw';
import { ENGAGEABLE_PHASES } from '../sim/combat';
import { CONFIG } from '../sim/config';
import type { GameState } from '../sim/state';
import { isOccludedByGlobe } from './horizon';
import type { UnitLayer } from './units';

// dopo la fine dell'ingaggio la barra di un'unità integra resta visibile
// ancora un attimo, poi dissolve (le unità danneggiate la tengono sempre)
const LINGER_MS = 1200;
const CRITICAL_RATIO = 0.25;
const BAR_WIDTH_PX = 72;

type Faction = 'human' | 'alien';

interface Bar {
  object: CSS2DObject;
  anchor: HTMLDivElement;
  host: HTMLDivElement;
  svgEl: SVGSVGElement;
  fillGroup: HTMLElement;
  valueText: HTMLElement;
  lastRelevantMs: number;
  lastRatio: number;
}

// Colori del riempimento richiesti dal design (interpolazione continua sugli
// HP); impostati inline su #hb-root perché lo stile interno dell'asset
// dichiara le variabili --hb-* sullo stesso elemento e vincerebbe sul valore
// ereditato dallo shadow host.
function fillColors(faction: Faction, ratio: number): { a: string; b: string } {
  if (faction === 'human') {
    // verde (100%) → giallo (50%) → rosso (0%)
    const hue = 120 * ratio;
    return { a: `hsl(${hue}, 90%, 55%)`, b: `hsl(${hue}, 90%, 40%)` };
  }
  // verde acido (100%) → viola scuro (0%), passando per il blu bioluminescente
  const hue = 75 + (277 - 75) * (1 - ratio);
  const sat = 95 - 33 * (1 - ratio);
  const light = 56 - 29 * (1 - ratio);
  return { a: `hsl(${hue}, ${sat}%, ${light + 8}%)`, b: `hsl(${hue}, ${sat}%, ${light - 6}%)` };
}

export class HpBarLayer {
  private bars = new Map<string, Bar>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  update(state: GameState, units: UnitLayer, camera: THREE.Camera): void {
    const now = performance.now();
    // ingaggio derivato dallo stato, specchiando le precondizioni di resolveCombat
    const defended = new Set<string>();
    for (const sq of state.squadrons) if (sq.transfer === null) defended.add(sq.cityId);
    const attacked = new Set<string>();
    for (const ufo of state.ufos) {
      if (ENGAGEABLE_PHASES.has(ufo.phase)) attacked.add(ufo.targetCityId);
    }
    const aliveCity = (id: string) => state.cities.find(c => c.id === id)?.alive === true;

    const seen = new Set<string>();
    for (const ufo of state.ufos) {
      const engaged =
        ENGAGEABLE_PHASES.has(ufo.phase) && defended.has(ufo.targetCityId) &&
        aliveCity(ufo.targetCityId);
      seen.add(`u:${ufo.id}`);
      this.updateBar(
        `u:${ufo.id}`, 'alien', ufo.hp / CONFIG.ufoAbductor.hp, engaged,
        units.ufoPosition(ufo.id), now, camera,
      );
    }
    for (const sq of state.squadrons) {
      const engaged = sq.transfer === null && attacked.has(sq.cityId) && aliveCity(sq.cityId);
      seen.add(`s:${sq.id}`);
      this.updateBar(
        `s:${sq.id}`, 'human', sq.hp / CONFIG.squadron.hp, engaged,
        units.squadronPosition(sq.id), now, camera,
      );
    }
    // unità uscite di scena: via subito anche la barra
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

    const clamped = Math.max(0, Math.min(1, ratio));
    if (Math.abs(clamped - bar.lastRatio) < 0.0005) return;
    bar.lastRatio = clamped;
    bar.fillGroup.style.transform = `scaleX(${clamped})`;
    bar.valueText.textContent = `${Math.round(clamped * 100)}%`;
    bar.svgEl.classList.toggle('is-critical', clamped <= CRITICAL_RATIO);
    const { a, b } = fillColors(faction, clamped);
    bar.svgEl.style.setProperty('--hb-fill-a', a);
    bar.svgEl.style.setProperty('--hb-fill-b', b);
  }

  private createBar(faction: Faction): Bar {
    const anchor = document.createElement('div');
    anchor.className = 'unit-hp-anchor';
    const host = document.createElement('div');
    host.className = 'unit-hp-host';
    anchor.appendChild(host);
    // shadow DOM: isola id e stili dell'asset, replicato in N istanze
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = faction === 'human' ? humanBarRaw : alienBarRaw;
    if (faction === 'alien') {
      // in stato critico l'asset forza il gradiente acido hardcoded; la
      // specifica vuole invece la scala continua fino al viola scuro
      const override = document.createElement('style');
      override.textContent = '#hb-root.is-critical #hb-fill { fill: url(#hb-grad-fill); }';
      shadow.appendChild(override);
    }
    const svgEl = shadow.querySelector('#hb-root') as SVGSVGElement;
    const height = (92 / 530) * BAR_WIDTH_PX;
    svgEl.setAttribute('width', String(BAR_WIDTH_PX));
    svgEl.setAttribute('height', height.toFixed(1));
    const bar: Bar = {
      object: new CSS2DObject(anchor),
      anchor,
      host,
      svgEl,
      fillGroup: shadow.querySelector('#hb-fill-group') as HTMLElement,
      valueText: shadow.querySelector('#hb-value') as HTMLElement,
      lastRelevantMs: 0,
      lastRatio: -1,
    };
    this.group.add(bar.object);
    return bar;
  }

  private removeBar(key: string): void {
    const bar = this.bars.get(key);
    if (!bar) return;
    this.group.remove(bar.object);
    bar.anchor.remove(); // CSS2DRenderer non rimuove i nodi DOM da solo
    this.bars.delete(key);
  }
}
