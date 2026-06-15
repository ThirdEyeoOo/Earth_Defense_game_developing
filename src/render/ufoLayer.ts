import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import ufoArtRaw from '../../Assets/Alieni/UFO/alien_abductor.svg?raw';
import type { GameState } from '../sim/state';
import { isOccludedByGlobe } from './horizon';
import type { UnitLayer } from './units';

// L'UFO è un SVG DOM ricco (gradienti/filtri/animazioni CSS) → non può essere una
// mesh Three.js: lo renderizziamo come overlay CSS2D, una istanza per UFO in uno
// SHADOW ROOT (isola id e <style> dell'asset, come hpBars.ts). La posizione 3D la
// fornisce UnitLayer (fisica orbitale). Il raggio/ante (#beam) si accende solo in
// rapimento via classe `.on` sul root dell'asset.
const BASE_WIDTH_PX = 96; // larghezza di base dell'asset prima della scala prospettica
const ASPECT = 860 / 600;
const SHIP_OFFSET_PX = 30; // alza l'asset così il centro della NAVE cade sull'ancora
const WORLD_WIDTH = 0.13; // larghezza "mondo" dell'asset → shrink prospettico per distanza
const MIN_SCALE = 0.05; // l'UFO lontanissimo (spazio profondo) non sparisce del tutto
const MAX_SCALE = 4; // l'UFO vicinissimo non diventa gigantesco

interface Ufo {
  object: CSS2DObject;
  anchor: HTMLDivElement;
  host: HTMLDivElement;
  svgEl: SVGSVGElement;
  lastOn: boolean;
}

export class UfoLayer {
  private ufos = new Map<number, Ufo>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  update(state: GameState, units: UnitLayer, camera: THREE.PerspectiveCamera): void {
    const halfFovTan = Math.tan((camera.fov * Math.PI) / 360);
    const seen = new Set<number>();
    for (const ufo of state.ufos) {
      seen.add(ufo.id);
      const pos = units.ufoPosition(ufo.id);
      let inst = this.ufos.get(ufo.id);
      if (!inst) {
        inst = this.createUfo();
        this.ufos.set(ufo.id, inst);
      }
      if (pos) inst.object.position.copy(pos);
      inst.object.visible = pos !== null && !isOccludedByGlobe(inst.object.position, camera);

      // shrink prospettico: la dimensione in px è quella che proietterebbe un
      // oggetto 3D largo WORLD_WIDTH alla distanza dell'UFO dalla camera
      // (px = W · H / (2 · d · tan(fov/2))); così rimpicciolisce con la distanza.
      const distance = inst.object.position.distanceTo(camera.position);
      const px = (WORLD_WIDTH * window.innerHeight) / (2 * Math.max(0.001, distance) * halfFovTan);
      const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, px / BASE_WIDTH_PX));
      inst.host.style.transform = `translateY(${(SHIP_OFFSET_PX * s).toFixed(1)}px) scale(${s.toFixed(4)})`;

      // raggio traente + ante: solo in fase di rapimento
      const on = ufo.phase === 'abducting';
      if (on !== inst.lastOn) {
        inst.svgEl.classList.toggle('on', on);
        inst.lastOn = on;
      }
    }
    for (const id of [...this.ufos.keys()]) {
      if (!seen.has(id)) this.removeUfo(id);
    }
  }

  reset(): void {
    for (const id of [...this.ufos.keys()]) this.removeUfo(id);
  }

  private createUfo(): Ufo {
    const anchor = document.createElement('div');
    anchor.className = 'ufo-anchor';
    const host = document.createElement('div');
    host.className = 'ufo-host';
    anchor.appendChild(host);
    // shadow DOM: isola id/stili dell'asset, replicato in N istanze
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = ufoArtRaw;
    const svgEl = shadow.querySelector('svg') as SVGSVGElement;
    svgEl.setAttribute('width', String(BASE_WIDTH_PX));
    svgEl.setAttribute('height', (BASE_WIDTH_PX * ASPECT).toFixed(1));
    const object = new CSS2DObject(anchor);
    this.group.add(object);
    return { object, anchor, host, svgEl, lastOn: false };
  }

  private removeUfo(id: number): void {
    const inst = this.ufos.get(id);
    if (!inst) return;
    this.group.remove(inst.object); // CSS2DRenderer non rimuove il nodo DOM da solo
    inst.anchor.remove();
    this.ufos.delete(id);
  }
}
