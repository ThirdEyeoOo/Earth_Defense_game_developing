import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { SimEvent, SimEventType } from '../sim/events';
import type { GameState } from '../sim/state';
import { cityPosition } from './cities';
import { isOccludedByGlobe } from './horizon';
import type { UnitLayer } from './units';

const TOAST_MS = 2000; // durata dell'animazione float-up in style.css
const MAX_TOASTS = 24;
const STACK_OFFSET_PX = 14; // toast nati nello stesso frame sulla stessa unità

const EVENT_TEXT: Record<SimEventType, string> = {
  squadronTransferStarted: 'squadrone in viaggio',
  ufoOrbiting: 'in orbita',
  ufoDescending: 'atterraggio',
  ufoAbducting: 'rapimenti in corso',
};

interface Toast {
  object: CSS2DObject;
  anchor: HTMLDivElement;
  bornMs: number;
  unitKind: 'squadron' | 'ufo';
  unitId: number;
}

interface Counter {
  object: CSS2DObject;
  anchor: HTMLDivElement;
  span: HTMLSpanElement;
  lastText: string;
}

// Scritte di feedback agganciate alle unità: toast effimeri generati dal
// registro eventi della sim (letto con un cursore, mai mutato) e contatore
// persistente dei rapimenti per gli UFO in fase abducting.
export class FloatingTextLayer {
  private toasts: Toast[] = [];
  private counters = new Map<number, Counter>();
  private lastSeenId = 0;
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  // da chiamare a inizio partita/caricamento: gli eventi conservati nel
  // salvataggio descrivono il passato e non vanno rigiocati
  reset(state: GameState): void {
    this.lastSeenId = state.events.length > 0 ? state.events[state.events.length - 1].id : 0;
    while (this.toasts.length > 0) this.killToast(0);
    for (const id of [...this.counters.keys()]) this.removeCounter(id);
  }

  update(state: GameState, units: UnitLayer, camera: THREE.Camera): void {
    const now = performance.now();
    this.consumeEvents(state, units, now);
    // invecchiamento, inseguimento dell'unità e culling oltre l'orizzonte
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      if (now - t.bornMs > TOAST_MS) {
        this.killToast(i);
        continue;
      }
      const pos =
        t.unitKind === 'ufo' ? units.ufoPosition(t.unitId) : units.squadronPosition(t.unitId);
      if (pos) t.object.position.copy(pos); // se l'unità sparisce resta congelato
      t.object.visible = !isOccludedByGlobe(t.object.position, camera);
    }
    this.updateAbductionCounters(state, units, camera);
  }

  private consumeEvents(state: GameState, units: UnitLayer, now: number): void {
    const events = state.events;
    let firstNew = events.length;
    while (firstNew > 0 && events[firstNew - 1].id > this.lastSeenId) firstNew--;
    if (firstNew === events.length) return;
    this.lastSeenId = events[events.length - 1].id;
    const stacks = new Map<string, number>();
    for (let i = firstNew; i < events.length; i++) {
      const e = events[i];
      const pos = this.eventAnchor(e, state, units);
      if (!pos) continue; // unità e città entrambe fuori scena: niente ancora
      const key = `${e.unitKind}:${e.unitId}`;
      const stack = stacks.get(key) ?? 0;
      stacks.set(key, stack + 1);
      this.spawnToast(e, pos, stack, now);
    }
    while (this.toasts.length > MAX_TOASTS) this.killToast(0);
  }

  private eventAnchor(
    e: SimEvent,
    state: GameState,
    units: UnitLayer,
  ): THREE.Vector3 | null {
    const unitPos =
      e.unitKind === 'ufo' ? units.ufoPosition(e.unitId) : units.squadronPosition(e.unitId);
    if (unitPos) return unitPos;
    // l'unità può essere già uscita di scena nello stesso batch di tick
    const city = e.cityId ? state.cities.find(c => c.id === e.cityId) : undefined;
    return city ? cityPosition(city, 1.05) : null;
  }

  private spawnToast(e: SimEvent, position: THREE.Vector3, stack: number, now: number): void {
    const anchor = document.createElement('div');
    anchor.className = 'float-text-anchor';
    if (stack > 0) anchor.style.marginTop = `${-stack * STACK_OFFSET_PX}px`;
    const span = document.createElement('span');
    span.className = 'float-text';
    span.textContent = EVENT_TEXT[e.type];
    anchor.appendChild(span);
    const object = new CSS2DObject(anchor);
    object.position.copy(position);
    this.group.add(object);
    this.toasts.push({ object, anchor, bornMs: now, unitKind: e.unitKind, unitId: e.unitId });
  }

  private killToast(index: number): void {
    const t = this.toasts[index];
    this.group.remove(t.object);
    t.anchor.remove(); // CSS2DRenderer non rimuove i nodi DOM da solo
    this.toasts.splice(index, 1);
  }

  private updateAbductionCounters(
    state: GameState,
    units: UnitLayer,
    camera: THREE.Camera,
  ): void {
    const abducting = new Set<number>();
    for (const ufo of state.ufos) {
      if (ufo.phase !== 'abducting') continue;
      abducting.add(ufo.id);
      let counter = this.counters.get(ufo.id);
      if (!counter) {
        const anchor = document.createElement('div');
        anchor.className = 'float-text-anchor';
        const span = document.createElement('span');
        span.className = 'abduction-counter';
        anchor.appendChild(span);
        const object = new CSS2DObject(anchor);
        this.group.add(object);
        counter = { object, anchor, span, lastText: '' };
        this.counters.set(ufo.id, counter);
      }
      const text = `Abductions = ${Math.floor(ufo.abducted)}`;
      if (text !== counter.lastText) {
        counter.lastText = text;
        counter.span.textContent = text;
      }
      const pos = units.ufoPosition(ufo.id);
      if (pos) counter.object.position.copy(pos);
      counter.object.visible = pos !== null && !isOccludedByGlobe(counter.object.position, camera);
    }
    for (const id of [...this.counters.keys()]) {
      if (!abducting.has(id)) this.removeCounter(id);
    }
  }

  private removeCounter(ufoId: number): void {
    const counter = this.counters.get(ufoId);
    if (!counter) return;
    this.group.remove(counter.object);
    counter.anchor.remove();
    this.counters.delete(ufoId);
  }
}
