import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import ufoArtRaw from '../../Assets/Alieni/UFO/alien_abductor.svg?raw';
import type { GameState, UfoState } from '../sim/state';
import { cityPosition } from './cities';
import { isOccludedByGlobe } from './horizon';
import type { ScreenRect } from './selection';
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
const VIEW_H = 860; // altezza del viewBox dell'asset
const BEAM_BASE_VIEW_Y = 800; // y del contatto a terra del raggio (#scorch/#pool) nel viewBox
const LANDED_SCALE = 2 / 3; // l'UFO "atterrato" (in rapimento) è 2/3 della scala prospettica
const LABEL_CLEARANCE_PX = 14; // distanza a cui la base del raggio resta sopra il centro del nome città

// proietta un punto 3D nelle sue coordinate di schermo in px (stessa mappatura del
// calcolo prospettico qui sotto, basata su window.innerWidth/Height)
function projectScreen(p: THREE.Vector3, camera: THREE.Camera): { x: number; y: number } {
  const ndc = p.clone().project(camera);
  return { x: (ndc.x * 0.5 + 0.5) * window.innerWidth, y: (1 - ndc.y) * 0.5 * window.innerHeight };
}

// progresso continuo della fase (tick svolti + frazione del tick corrente), in [0,1]
function phaseProgress(ufo: UfoState, tickFraction: number): number {
  const total = Math.max(1, ufo.phaseTotalTicks);
  return Math.min(1, Math.max(0, (total - ufo.ticksRemaining + tickFraction) / total));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

interface Ufo {
  object: CSS2DObject;
  anchor: HTMLDivElement;
  host: HTMLDivElement;
  svgEl: SVGSVGElement;
  ship: SVGGraphicsElement | null; // gruppo #ufo (solo la nave, niente raggio)
  lastOn: boolean;
}

const DRAG_TOLERANCE_PX = 5; // oltre questa distanza è una rotazione del globo, non un click

export class UfoLayer {
  private ufos = new Map<number, Ufo>();
  readonly group = new THREE.Group();
  private pointerDownAt = { x: 0, y: 0 };

  constructor(
    scene: THREE.Scene,
    private readonly onUfoClick?: (id: number) => void,
  ) {
    scene.add(this.group);
    // guardia anti-drag: il click a fine rotazione del globo non deve selezionare
    window.addEventListener('pointerdown', event => {
      this.pointerDownAt = { x: event.clientX, y: event.clientY };
    });
  }

  update(
    state: GameState,
    units: UnitLayer,
    camera: THREE.PerspectiveCamera,
    tickFraction: number,
  ): void {
    const halfFovTan = Math.tan((camera.fov * Math.PI) / 360);
    const seen = new Set<number>();
    for (const ufo of state.ufos) {
      seen.add(ufo.id);
      const pos = units.ufoPosition(ufo.id);
      let inst = this.ufos.get(ufo.id);
      if (!inst) {
        inst = this.createUfo(ufo.id);
        this.ufos.set(ufo.id, inst);
      }
      if (pos) inst.object.position.copy(pos);
      inst.object.visible = pos !== null && !isOccludedByGlobe(inst.object.position, camera);

      // shrink prospettico: la dimensione in px è quella che proietterebbe un
      // oggetto 3D largo WORLD_WIDTH alla distanza dell'UFO dalla camera
      // (px = W · H / (2 · d · tan(fov/2))); così rimpicciolisce con la distanza.
      const distance = inst.object.position.distanceTo(camera.position);
      const px = (WORLD_WIDTH * window.innerHeight) / (2 * Math.max(0.001, distance) * halfFovTan);
      const sPersp = Math.min(MAX_SCALE, Math.max(MIN_SCALE, px / BASE_WIDTH_PX));

      // raggio traente + ante: solo in fase di rapimento ("atterrato")
      const on = ufo.phase === 'abducting';
      if (on !== inst.lastOn) {
        inst.svgEl.classList.toggle('on', on);
        inst.lastOn = on;
      }

      // Scala: l'UFO atterrato (rapimento) è 2/3 della scala prospettica; in DISCESA
      // ci si rimpicciolisce progressivamente fino a quella dimensione, per dare senso
      // prospettico (continuità: a fine discesa la scala combacia con quella di hover).
      const descending = ufo.phase === 'descending';
      const progress = phaseProgress(ufo, tickFraction);
      let landFactor = 1;
      if (on) landFactor = LANDED_SCALE;
      else if (descending) landFactor = 1 - (1 - LANDED_SCALE) * smoothstep(0, 1, progress);
      const s = sPersp * landFactor;

      // Orientamento FISSO (vista di profilo): l'asset è un billboard sempre rivolto alla
      // camera e NON va ruotato in-piano, altrimenti orbitando la Terra l'UFO girerebbe.
      // La discesa è radiale sulla verticale della città, quindi un asset verticale (raggio
      // verso il basso) già "punta" al punto in cui comparirà sopra la città.

      // In rapimento ancoriamo la BASE del raggio appena sopra il nome della città
      // bersaglio (così resta leggibile): dato l'offset verticale in px tra l'ancora 3D
      // dell'UFO e la targhetta, spostiamo l'asset perché la sua base ci cada sopra.
      // Fuori dal rapimento vale l'offset classico (centro della NAVE sull'ancora).
      const target = on ? state.cities.find(c => c.id === ufo.targetCityId) : undefined;
      let translateY = SHIP_OFFSET_PX * s;
      if (target) {
        const fullHeightPx = BASE_WIDTH_PX * ASPECT * s;
        const beamBaseBelowCenter = ((BEAM_BASE_VIEW_Y - VIEW_H / 2) / VIEW_H) * fullHeightPx;
        const cityScreenY = projectScreen(cityPosition(target, 1.01), camera).y;
        const ufoScreenY = projectScreen(inst.object.position, camera).y;
        translateY = cityScreenY - LABEL_CLEARANCE_PX - ufoScreenY - beamBaseBelowCenter;
      }
      inst.host.style.transform = `translateY(${translateY.toFixed(1)}px) scale(${s.toFixed(4)})`;
    }
    for (const id of [...this.ufos.keys()]) {
      if (!seen.has(id)) this.removeUfo(id);
    }
  }

  // Rettangolo (px schermo) della SOLA nave (#ufo), per il reticolo di selezione:
  // getBoundingClientRect tiene conto di scala/offset/animazioni correnti ed
  // esclude il raggio traente. null se non visibile, occluso o in rapimento.
  ufoBodyRect(id: number): ScreenRect | null {
    const inst = this.ufos.get(id);
    if (!inst || !inst.object.visible || inst.lastOn || !inst.ship) return null;
    const r = inst.ship.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height };
  }

  reset(): void {
    for (const id of [...this.ufos.keys()]) this.removeUfo(id);
  }

  private createUfo(id: number): Ufo {
    const anchor = document.createElement('div');
    anchor.className = 'ufo-anchor';
    const host = document.createElement('div');
    host.className = 'ufo-host';
    anchor.appendChild(host);
    // click → tracciamento (con guardia anti-drag); stopPropagation così il click
    // sul canvas non deseleziona subito dopo
    anchor.addEventListener('click', event => {
      const moved = Math.hypot(
        event.clientX - this.pointerDownAt.x,
        event.clientY - this.pointerDownAt.y,
      );
      if (moved > DRAG_TOLERANCE_PX) return;
      event.stopPropagation();
      this.onUfoClick?.(id);
    });
    // shadow DOM: isola id/stili dell'asset, replicato in N istanze
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = ufoArtRaw;
    const svgEl = shadow.querySelector('svg') as SVGSVGElement;
    svgEl.setAttribute('width', String(BASE_WIDTH_PX));
    svgEl.setAttribute('height', (BASE_WIDTH_PX * ASPECT).toFixed(1));
    // Solo la NAVE (#ufo) cattura i click (per il tracciamento): il riquadro
    // trasparente e il raggio NON devono intercettare i click destinati alla
    // città sottostante. Senza questo, durante un rapimento l'overlay copre il
    // nome della città e impedisce di selezionarla come destinazione di un
    // trasferimento (quindi di mandare lo squadrone a ingaggiare l'UFO).
    const ship = shadow.querySelector('#ufo') as SVGGraphicsElement | null;
    if (ship) {
      ship.style.pointerEvents = 'auto';
      ship.style.cursor = 'pointer';
    }
    const object = new CSS2DObject(anchor);
    this.group.add(object);
    return { object, anchor, host, svgEl, ship, lastOn: false };
  }

  private removeUfo(id: number): void {
    const inst = this.ufos.get(id);
    if (!inst) return;
    this.group.remove(inst.object); // CSS2DRenderer non rimuove il nodo DOM da solo
    inst.anchor.remove();
    this.ufos.delete(id);
  }
}
