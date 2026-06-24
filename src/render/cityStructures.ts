import type { PerspectiveCamera } from 'three';
import towerRaw from '../../Assets/Umani/Strutture/defense-tower.svg?raw';
import { gridCapacity, HEX_R, HEX_W, hexCells } from '../sim/buildings';
import { isEngageable } from '../sim/combat';
import { ufoAltitudeKm } from '../sim/measure';
import type { CityState, GameState, Structure } from '../sim/state';
import { WEAPON_STATS } from '../sim/weapons';
import { buildableIconSVG } from '../ui/buildableIcons';

// Mini-griglia delle strutture accanto al nome città SUL GLOBO: una versione in piccolo
// della griglia esagonale (ui/structureGrid.ts), agganciata come figlio dell'elemento
// targhetta (CSS2D) così segue la città e l'orizzonte. Le torri operative usano l'asset
// defense-tower (rotta dom) in shadow root per istanza (id/animazioni isolati) e ricevono
// la classe `on` quando un UFO ingaggiabile è in gittata → sparano da QUI (il tracciante del
// globo parte dalla bocca, vedi render/combatFx.ts + CombatEngine sorgente `tower`).

const MINI = 0.17; // scala della griglia grande (R=45) → mini hex ~15px
const TOWER_RANGE = WEAPON_STATS['defense-tower'].rangeKm;
// scala con lo ZOOM: la mini-griglia rimpicciolisce allontanando la camera dal globo
// (camera ∈ [1.4, 8] raggi), così con tante città le finestrelle non si accavallano.
const ZOOM_REF = 1.2;
const ZOOM_MIN = 0.18;
const ZOOM_MAX = 0.9;

// CSS d'animazione dello stato `on` dell'asset (dal manifest defense-tower.integration.json):
// ciclo di fuoco 1,5s, tutte le parti sincronizzate. Iniettata nello shadow root di ogni torre.
const DEFENSE_TOWER_ON_CSS = `
svg{width:100%;height:100%;display:block}
.on #charge-core{transform-origin:120px 246px;animation:dt-charge 1.5s ease-in-out infinite}
.on #status-light{animation:dt-status 0.5s steps(2) infinite}
.on #muzzle-glow{transform-origin:120px 66px;animation:dt-mglow 1.5s ease-in-out infinite}
.on #muzzle-flash{transform-origin:120px 66px;animation:dt-flash 1.5s ease-out infinite}
.on #plasma-bolt{transform-origin:120px 66px;animation:dt-fire 1.5s cubic-bezier(.4,0,.2,1) infinite}
.on #recoil{animation:dt-recoil 1.5s cubic-bezier(.3,0,.2,1) infinite}
.on .coil-orb{animation:dt-coil 1.5s linear infinite}
.on .coil-orb:nth-of-type(2){animation-delay:.16s}
.on .coil-orb:nth-of-type(3){animation-delay:.32s}
.on .coil-orb:nth-of-type(4){animation-delay:.48s}
@keyframes dt-charge{0%{transform:scale(.7);opacity:.5}55%{transform:scale(1.25);opacity:1}62%{transform:scale(.55);opacity:.95}100%{transform:scale(.7);opacity:.5}}
@keyframes dt-status{0%{opacity:1}100%{opacity:.3}}
@keyframes dt-mglow{0%,45%{opacity:.2}58%{opacity:1}80%{opacity:.25}100%{opacity:.2}}
@keyframes dt-flash{0%,52%{opacity:0;transform:scale(.4)}60%{opacity:1;transform:scale(1.15)}74%{opacity:0;transform:scale(1.4)}100%{opacity:0;transform:scale(.4)}}
@keyframes dt-fire{0%,55%{opacity:0;transform:translateY(0) scaleY(.6)}60%{opacity:1;transform:translateY(-6px) scaleY(1)}92%{opacity:.9;transform:translateY(-64px) scaleY(1.25)}100%{opacity:0;transform:translateY(-72px) scaleY(1.3)}}
@keyframes dt-recoil{0%,54%{transform:translateY(0)}62%{transform:translateY(7px)}100%{transform:translateY(0)}}
@keyframes dt-coil{0%{opacity:.2}50%{opacity:1}100%{opacity:.2}}
`;

interface CellRect {
  index: number; // = indice hardpoint (Structure.cell)
  left: number;
  top: number;
  w: number;
  h: number;
}

// geometria scalata di una griglia da `capacity` celle (origine traslata a 0)
function miniLayout(capacity: number): { cells: CellRect[]; width: number; height: number } {
  const raw = hexCells(capacity);
  const minX = Math.min(...raw.map(c => c.cx)) - HEX_R;
  const minY = Math.min(...raw.map(c => c.cy)) - HEX_R;
  const maxX = Math.max(...raw.map(c => c.cx)) + HEX_R;
  const maxY = Math.max(...raw.map(c => c.cy)) + HEX_R;
  const w = HEX_W * MINI;
  const h = 2 * HEX_R * MINI;
  const cells = raw.map(c => {
    const cx = (c.cx - minX) * MINI;
    const cy = (c.cy - minY) * MINI;
    return { index: c.index, left: cx - w / 2, top: cy - h / 2, w, h };
  });
  return { cells, width: (maxX - minX) * MINI, height: (maxY - minY) * MINI };
}

// fattore di scala dallo zoom (distanza camera dal centro globo): vicino → grande, lontano → piccolo
function zoomScale(camera: PerspectiveCamera): number {
  const dist = camera.position.length();
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, ZOOM_REF / dist));
}

export class CityStructuresLayer {
  // host = scatola esterna (riserva lo spazio SCALATO); inner = griglia a dimensione piena
  // con transform scale(k) → niente spazio vuoto sotto il nome a zoom basso. w/h = dims piene.
  private grids = new Map<
    string,
    { host: HTMLDivElement; inner: HTMLDivElement; sig: string; w: number; h: number }
  >();

  constructor(private readonly labelElement: (cityId: string) => HTMLDivElement | undefined) {}

  update(state: GameState, camera: PerspectiveCamera): void {
    const k = zoomScale(camera);
    for (const city of state.cities) {
      const entry = this.grids.get(city.id);
      if (city.structures.length === 0) {
        if (entry) {
          entry.host.remove();
          this.grids.delete(city.id);
        }
        continue;
      }
      const labelEl = this.labelElement(city.id);
      if (!labelEl) continue;
      const sig = `${gridCapacity(city)}|${city.structures.map(s => `${s.cell}:${s.type}:${s.state}`).join(',')}`;
      let rec = entry;
      if (!rec) {
        const host = document.createElement('div');
        host.className = 'city-mini';
        const inner = document.createElement('div');
        inner.className = 'city-mini-inner';
        host.appendChild(inner);
        labelEl.appendChild(host);
        rec = { host, inner, sig: '', w: 0, h: 0 };
        this.grids.set(city.id, rec);
      }
      if (rec.sig !== sig) {
        const dims = this.renderGrid(rec.inner, city);
        rec.sig = sig;
        rec.w = dims.w;
        rec.h = dims.h;
      }
      // applica lo zoom: la scatola riserva lo spazio scalato, l'interno è scalato
      rec.host.style.width = `${(rec.w * k).toFixed(1)}px`;
      rec.host.style.height = `${(rec.h * k).toFixed(1)}px`;
      rec.inner.style.transform = `scale(${k.toFixed(3)})`;
      this.syncFiring(rec.host, city, state);
    }
  }

  private renderGrid(inner: HTMLDivElement, city: CityState): { w: number; h: number } {
    const { cells, width, height } = miniLayout(gridCapacity(city));
    inner.style.width = `${width.toFixed(1)}px`;
    inner.style.height = `${height.toFixed(1)}px`;
    inner.innerHTML = '';
    const byCell = new Map(city.structures.map(s => [s.cell, s] as const));
    for (const cell of cells) {
      const st = byCell.get(cell.index);
      const el = document.createElement('div');
      el.className = `city-mini-cell${st ? ` is-${st.state}` : ''}`;
      el.style.left = `${cell.left.toFixed(1)}px`;
      el.style.top = `${cell.top.toFixed(1)}px`;
      el.style.width = `${cell.w.toFixed(1)}px`;
      el.style.height = `${cell.h.toFixed(1)}px`;
      if (st) this.fillStructure(el, st);
      inner.appendChild(el);
    }
    return { w: width, h: height };
  }

  private fillStructure(el: HTMLDivElement, st: Structure): void {
    if (st.type === 'tower') {
      // torre: asset rotta dom in shadow root (id/animazioni isolati per istanza)
      el.dataset.struct = String(st.id);
      el.classList.add('city-mini-tower');
      const shadow = el.attachShadow({ mode: 'open' });
      const style = document.createElement('style');
      style.textContent = DEFENSE_TOWER_ON_CSS;
      shadow.appendChild(style);
      const wrap = document.createElement('div');
      wrap.innerHTML = towerRaw;
      const svg = wrap.querySelector('svg');
      if (svg) shadow.appendChild(svg);
    } else {
      // strutture semplici (es. laboratorio): iconcina geometrica
      el.innerHTML = `<svg viewBox="-20 -20 40 40">${buildableIconSVG(st.type)}</svg>`;
    }
  }

  // accende le torri (classe `on`) quando un UFO ingaggiabile è in gittata sopra la città
  private syncFiring(host: HTMLDivElement, city: CityState, state: GameState): void {
    const firing = state.ufos.some(
      u => u.targetCityId === city.id && isEngageable(u) && ufoAltitudeKm(u, 0) <= TOWER_RANGE,
    );
    for (const el of host.querySelectorAll<HTMLDivElement>('.city-mini-tower')) {
      const sid = Number(el.dataset.struct);
      const st = city.structures.find(s => s.id === sid);
      const on = firing && st?.state === 'occupied';
      const svg = el.shadowRoot?.querySelector('svg');
      svg?.classList.toggle('on', on);
    }
  }

  // posizione-schermo della bocca della torre (cima dell'asset): origine del tracciante globo
  towerMuzzleRect(structureId: number): { x: number; y: number } | null {
    for (const { host } of this.grids.values()) {
      const el = host.querySelector<HTMLElement>(`.city-mini-tower[data-struct="${structureId}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width === 0) return null; // oltre l'orizzonte / nascosta
        return { x: r.left + r.width / 2, y: r.top + r.height * 0.12 };
      }
    }
    return null;
  }

  dispose(): void {
    for (const { host } of this.grids.values()) host.remove();
    this.grids.clear();
  }
}
