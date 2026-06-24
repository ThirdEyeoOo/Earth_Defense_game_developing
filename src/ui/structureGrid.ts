import { cityName, t, type MessageKey } from '../i18n';
import { cityStructureCatalog } from '../sim/buildables';
import {
  buildTicksFor,
  gridCapacity,
  HEX_R,
  hexCells,
  structureCost,
  type HexCell,
} from '../sim/buildings';
import { isConnected } from '../sim/economy';
import type { Cost, ResourceType } from '../sim/resources';
import type { CityState, GameState, Structure, StructureType } from '../sim/state';
import { buildableIconSVG } from './buildableIcons';
import { fmtInt } from './format';
import { resourceIcon } from './resourceIcons';

// Griglia esagonale delle strutture (porting del prototipo Claude Design "Griglia
// Strutture.html"): celle = hardpoint, drag&drop dalla tavolozza, stati empty/occupied/
// building/damaged, popover ripara/rimuovi. Componente autonomo: monta tutto dentro `host`.
// I listener a livello di window/document sono agganciati UNA volta (la ricostruzione dello
// scheletro ricrea solo i listener sugli elementi interni).

export interface StructureGridCallbacks {
  onBuild(cityId: string, cell: number, type: StructureType): void;
  onRepair(cityId: string, structureId: number): void;
  onRemove(cityId: string, structureId: number): void;
}

const SVGNS = 'http://www.w3.org/2000/svg';
const PROG_R = 28;
const PROG_CIRC = 2 * Math.PI * PROG_R;
const STATE_LABEL: Record<Structure['state'], MessageKey> = {
  occupied: 'struct.state.occupied',
  building: 'struct.state.building',
  damaged: 'struct.state.damaged',
};

function canAfford(state: GameState, cost: Cost): boolean {
  return (
    state.humt >= cost.humt &&
    Object.entries(cost.resources).every(
      ([type, amount]) => state.resources[type as ResourceType] >= amount,
    )
  );
}

// vertici di un esagono pointy-top (vertice in alto) centrato in (cx,cy)
function hexPoints(cx: number, cy: number): string {
  const p: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 90);
    p.push(`${(cx + HEX_R * Math.cos(a)).toFixed(2)},${(cy + HEX_R * Math.sin(a)).toFixed(2)}`);
  }
  return p.join(' ');
}

// ghost di trascinamento, condiviso (uno solo nel documento)
let ghost: HTMLElement | null = null;
function getGhost(): HTMLElement {
  if (!ghost) {
    ghost = document.createElement('div');
    ghost.id = 'struct-ghost';
    document.body.appendChild(ghost);
  }
  return ghost;
}

export function createStructureGrid(
  host: HTMLElement,
  cb: StructureGridCallbacks,
): { update(state: GameState): void; refresh(): void } {
  let built = false;
  let selectedCityId: string | null = null;
  let lastKey = '';
  let cells: HexCell[] = [];
  const vb = { minX: -10, minY: -10, w: 100, h: 100 };

  let svg: SVGSVGElement;
  let plist: HTMLElement;
  let tip: HTMLElement;
  let pop: HTMLElement;
  let citySelect: HTMLSelectElement;
  let occEl: HTMLElement;
  let totEl: HTMLElement;
  const cellEls: SVGGElement[] = [];

  // stato del drag (letto dai listener di window)
  let drag: { type: StructureType } | null = null;
  let targetIdx = -1;
  let popIdx = -1;

  function connectedCities(state: GameState): CityState[] {
    return state.cities.filter(c => isConnected(state, c));
  }
  function currentCity(state: GameState): CityState | null {
    return state.cities.find(c => c.id === selectedCityId && isConnected(state, c)) ?? null;
  }

  function buildSkeleton(): void {
    const legend = (['empty', 'occupied', 'target', 'building', 'damaged'] as const)
      .map(k => `<span class="lg ${k}"><i></i>${t(`struct.legend.${k}` as MessageKey)}</span>`)
      .join('');
    host.innerHTML = `
      <div class="struct-grid">
        <div class="struct-head">
          <p class="struct-subtitle">${t('struct.subtitle')}</p>
          <label class="struct-citysel">${t('build.selectCity')}
            <select class="struct-city"></select>
          </label>
          <div class="struct-legend">${legend}</div>
        </div>
        <div class="struct-body">
          <div class="struct-gridwrap">
            <svg class="struct-svg" xmlns="${SVGNS}">
              <defs>
                <pattern id="struct-hazard" width="13" height="13" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                  <rect width="13" height="13" fill="rgba(38,28,8,.7)"></rect>
                  <rect width="6.5" height="13" fill="rgba(255,215,106,.16)"></rect>
                </pattern>
              </defs>
            </svg>
            <div class="struct-tip"></div>
            <div class="struct-pop">
              <div class="struct-pname"><i></i><span></span></div>
              <div class="struct-pstate"></div>
              <div class="struct-pacts"></div>
            </div>
          </div>
          <div class="struct-palette">
            <h3>${t('struct.palette')}</h3>
            <p class="struct-ph">${t('struct.paletteHint')}</p>
            <div class="struct-plist"></div>
            <div class="struct-pfoot"><span>${t('struct.occupancy')}</span>
              <span><b class="struct-occ">0</b> / <span class="struct-tot">0</span></span></div>
          </div>
        </div>
      </div>`;
    svg = host.querySelector('.struct-svg')!;
    plist = host.querySelector('.struct-plist')!;
    tip = host.querySelector('.struct-tip')!;
    pop = host.querySelector('.struct-pop')!;
    citySelect = host.querySelector('.struct-city')!;
    occEl = host.querySelector('.struct-occ')!;
    totEl = host.querySelector('.struct-tot')!;

    citySelect.addEventListener('change', () => {
      selectedCityId = citySelect.value;
      lastKey = ''; // forza il re-render della griglia per la nuova città
      closePop();
    });
    svg.addEventListener('pointermove', onGridHover);
    svg.addEventListener('pointerleave', hideTip);
    svg.addEventListener('click', onGridClick);
    plist.addEventListener('pointerdown', onPaletteDown);
    built = true;
  }

  // ---- render completo per la città selezionata (celle + tavolozza) ----
  function renderFor(state: GameState): void {
    const cities = connectedCities(state);
    if (cities.length === 0) {
      selectedCityId = null;
      svg.style.display = 'none';
      plist.innerHTML = `<p class="struct-empty">${t('build.noCities')}</p>`;
      citySelect.innerHTML = '';
      return;
    }
    svg.style.display = '';
    if (!selectedCityId || !cities.some(c => c.id === selectedCityId)) {
      selectedCityId = cities[0].id;
    }
    citySelect.innerHTML = cities
      .map(
        c =>
          `<option value="${c.id}" ${c.id === selectedCityId ? 'selected' : ''}>${cityName(c.id, c.name)}</option>`,
      )
      .join('');
    const city = cities.find(c => c.id === selectedCityId)!;
    renderCells(city);
    renderPalette(state);
  }

  function renderCells(city: CityState): void {
    const cap = gridCapacity(city);
    cells = hexCells(cap);
    // viewBox dai limiti delle celle (margine 10)
    const maxX = Math.max(...cells.map(c => c.cx)) + HEX_R;
    const maxY = Math.max(...cells.map(c => c.cy)) + HEX_R;
    vb.w = maxX + 20;
    vb.h = maxY + 20;
    svg.setAttribute('viewBox', `${vb.minX} ${vb.minY} ${vb.w} ${vb.h}`);
    // svuota (tieni <defs>)
    while (svg.childNodes.length > 1) svg.removeChild(svg.lastChild!);
    cellEls.length = 0;
    const byCell = new Map(city.structures.map(s => [s.cell, s] as const));
    for (const cell of cells) {
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'cell');
      g.dataset.i = String(cell.index);
      const poly = document.createElementNS(SVGNS, 'polygon');
      poly.setAttribute('class', 'hex');
      poly.setAttribute('points', hexPoints(cell.cx, cell.cy));
      g.appendChild(poly);
      svg.appendChild(g);
      cellEls[cell.index] = g;
      paintCell(cell.index, byCell.get(cell.index) ?? null);
    }
  }

  function paintCell(i: number, st: Structure | null): void {
    const g = cellEls[i];
    const cell = cells[i];
    g.setAttribute('data-state', st ? st.state : 'empty');
    while (g.childNodes.length > 1) g.removeChild(g.lastChild!);
    if (st) {
      const ico = document.createElementNS(SVGNS, 'g');
      ico.setAttribute('class', 'ico');
      ico.setAttribute('transform', `translate(${cell.cx},${cell.cy}) scale(1.15)`);
      ico.innerHTML = buildableIconSVG(st.type);
      g.appendChild(ico);
    }
    if (st?.state === 'damaged') {
      const cr = document.createElementNS(SVGNS, 'path');
      cr.setAttribute('class', 'crack');
      cr.setAttribute('d', `M${cell.cx - 16},${cell.cy - 14} l9,11 l-6,7 l12,9`);
      g.appendChild(cr);
    }
    if (st?.state === 'building') {
      const track = document.createElementNS(SVGNS, 'circle');
      track.setAttribute('class', 'prog-track');
      track.setAttribute('cx', String(cell.cx));
      track.setAttribute('cy', String(cell.cy));
      track.setAttribute('r', String(PROG_R));
      const prog = document.createElementNS(SVGNS, 'circle');
      prog.setAttribute('class', 'prog');
      prog.setAttribute('cx', String(cell.cx));
      prog.setAttribute('cy', String(cell.cy));
      prog.setAttribute('r', String(PROG_R));
      prog.setAttribute('stroke-dasharray', String(PROG_CIRC));
      prog.dataset.structId = String(st.id);
      const gear = document.createElementNS(SVGNS, 'g');
      gear.setAttribute('class', 'struct-gear');
      gear.setAttribute('transform', `translate(${cell.cx},${cell.cy})`);
      gear.innerHTML = `<circle r="7" fill="none" stroke="#ffd76a" stroke-width="2.4" stroke-dasharray="3 3"/><circle r="2.6" fill="#0b1424"/>`;
      g.appendChild(track);
      g.appendChild(prog);
      g.appendChild(gear);
    }
  }

  function renderPalette(state: GameState): void {
    const catalog = cityStructureCatalog(state);
    if (catalog.length === 0) {
      plist.innerHTML = `<p class="struct-empty">${t('struct.locked')}</p>`;
      return;
    }
    plist.innerHTML = catalog
      .map(b => {
        const cost = structureCost(b.id as StructureType);
        const costHtml =
          `<span class="struct-cost-it">🪙 ${fmtInt(cost.humt)}</span>` +
          Object.entries(cost.resources)
            .map(
              ([type, amt]) =>
                `<span class="struct-cost-it">${resourceIcon(type as ResourceType)}${amt}</span>`,
            )
            .join('');
        return `<div class="struct-pcard" data-struct="${b.id}" style="--c:${b.accent};--g:${b.glow}">
          <span class="struct-pic"><svg viewBox="-20 -20 40 40">${buildableIconSVG(b.id)}</svg></span>
          <span class="struct-pmeta">
            <b>${t(b.nameKey as MessageKey)}</b><small>${t(b.catKey as MessageKey)}</small>
            <span class="struct-pcost">${costHtml}</span>
          </span>
        </div>`;
      })
      .join('');
  }

  // ---- aggiornamento leggero per frame: anelli di costruzione, affordabilità, conteggio ----
  function updateLive(state: GameState): void {
    const city = currentCity(state);
    if (!city) return;
    const cap = gridCapacity(city);
    occEl.textContent = String(city.structures.length);
    totEl.textContent = String(cap);
    // anelli di costruzione (offset = quota residua sul totale)
    const byId = new Map(city.structures.map(s => [s.id, s] as const));
    for (const prog of svg.querySelectorAll<SVGCircleElement>('.prog')) {
      const st = byId.get(Number(prog.dataset.structId));
      if (!st || st.state !== 'building') continue;
      const total = buildTicksFor(st.type);
      const remaining = Math.max(0, st.buildDoneTick - state.tick);
      prog.style.strokeDashoffset = String(PROG_CIRC * Math.min(1, remaining / total));
    }
    // affordabilità delle card della tavolozza (drag disabilitato se non si può pagare)
    for (const card of plist.querySelectorAll<HTMLElement>('.struct-pcard')) {
      const ok = canAfford(state, structureCost(card.dataset.struct as StructureType));
      card.classList.toggle('disabled', !ok);
    }
  }

  // chiave di re-render: cambia con città / strutture (cella,tipo,stato) / capienza / ricerche
  function keyOf(state: GameState): string {
    const city = currentCity(state) ?? connectedCities(state)[0];
    const conn = connectedCities(state)
      .map(c => c.id)
      .join(',');
    if (!city) return `none|${conn}`;
    const structs = city.structures.map(s => `${s.cell}:${s.type}:${s.state}`).join(',');
    return `${city.id}|${conn}|${gridCapacity(city)}|${structs}|${state.research.unlocked.join(',')}`;
  }

  // ---- drag&drop (pointer) ----
  function onPaletteDown(e: PointerEvent): void {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.struct-pcard');
    if (!card || card.classList.contains('disabled')) return;
    e.preventDefault();
    drag = { type: card.dataset.struct as StructureType };
    card.classList.add('dragging');
    const gh = getGhost();
    gh.innerHTML = `<svg viewBox="-20 -20 40 40">${buildableIconSVG(drag.type)}</svg>`;
    gh.style.display = 'flex';
    moveGhost(e.clientX, e.clientY);
    card.setPointerCapture(e.pointerId);
  }
  function moveGhost(x: number, y: number): void {
    const gh = getGhost();
    gh.style.left = `${x}px`;
    gh.style.top = `${y}px`;
  }
  function svgPoint(clientX: number, clientY: number): { x: number; y: number } {
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) * vb.w) / rect.width + vb.minX,
      y: ((clientY - rect.top) * vb.h) / rect.height + vb.minY,
    };
  }
  function nearestEmpty(px: number, py: number): number {
    let best = -1;
    let bd = HEX_R * 0.96;
    for (const cell of cells) {
      if (cellEls[cell.index].getAttribute('data-state') !== 'empty') continue;
      const d = Math.hypot(px - cell.cx, py - cell.cy);
      if (d < bd) {
        bd = d;
        best = cell.index;
      }
    }
    return best;
  }
  function setTarget(i: number): void {
    if (targetIdx === i) return;
    if (targetIdx >= 0) cellEls[targetIdx]?.classList.remove('is-target');
    targetIdx = i;
    if (targetIdx >= 0) cellEls[targetIdx]?.classList.add('is-target');
  }

  window.addEventListener('pointermove', e => {
    if (!drag) return;
    moveGhost(e.clientX, e.clientY);
    const p = svgPoint(e.clientX, e.clientY);
    setTarget(nearestEmpty(p.x, p.y));
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    for (const c of plist.querySelectorAll('.struct-pcard.dragging')) c.classList.remove('dragging');
    getGhost().style.display = 'none';
    const i = targetIdx;
    const type = drag.type;
    setTarget(-1);
    drag = null;
    if (i >= 0 && selectedCityId) {
      cb.onBuild(selectedCityId, i, type);
      hideTip();
    }
  });

  // ---- tooltip ----
  function onGridHover(e: PointerEvent): void {
    if (drag) {
      hideTip();
      return;
    }
    const g = (e.target as Element).closest<SVGGElement>('.cell');
    if (!g) {
      hideTip();
      return;
    }
    const state = g.getAttribute('data-state') as Structure['state'] | 'empty';
    let html: string;
    if (state === 'empty') {
      html = `<span class="ts">${t('struct.dragHint')}</span>`;
    } else {
      const name = nameOfCell(+g.dataset.i!);
      html = `<b>${name}</b><br><span class="ts">${t(STATE_LABEL[state])}</span>`;
    }
    tip.innerHTML = html;
    const wrap = host.querySelector('.struct-gridwrap')!.getBoundingClientRect();
    tip.style.left = `${e.clientX - wrap.left + 12}px`;
    tip.style.top = `${e.clientY - wrap.top - 8}px`;
    tip.classList.add('show');
  }
  function hideTip(): void {
    tip.classList.remove('show');
  }

  // nome della struttura nella cella i (per tooltip/popover): legge il catalogo i18n
  let nameLookup: (cell: number) => string = () => '';
  function nameOfCell(cell: number): string {
    return nameLookup(cell);
  }

  // ---- popover (rimuovi / ripara) ----
  function onGridClick(e: MouseEvent): void {
    const g = (e.target as Element).closest<SVGGElement>('.cell');
    if (!g) return;
    const i = +g.dataset.i!;
    if (popIdx === i) {
      closePop();
      return;
    }
    openPop(i);
  }
  function openPop(i: number): void {
    const state = cellEls[i]?.getAttribute('data-state') as Structure['state'] | 'empty';
    if (state === 'empty' || state === 'building') {
      closePop();
      return;
    }
    popIdx = i;
    hideTip();
    pop.querySelector<HTMLElement>('.struct-pname span')!.textContent = nameOfCell(i);
    pop.querySelector<HTMLElement>('.struct-pstate')!.textContent = t(STATE_LABEL[state]);
    const acts = pop.querySelector<HTMLElement>('.struct-pacts')!;
    acts.innerHTML = '';
    const structId = structIdAtCell(i);
    if (state === 'damaged') {
      const fix = document.createElement('button');
      fix.className = 'struct-pbtn fix';
      fix.textContent = t('struct.repair');
      fix.onclick = ev => {
        ev.stopPropagation();
        if (selectedCityId && structId != null) cb.onRepair(selectedCityId, structId);
        closePop();
      };
      acts.appendChild(fix);
    }
    const rm = document.createElement('button');
    rm.className = 'struct-pbtn rm';
    rm.textContent = t('struct.remove');
    rm.onclick = ev => {
      ev.stopPropagation();
      if (selectedCityId && structId != null) cb.onRemove(selectedCityId, structId);
      closePop();
    };
    acts.appendChild(rm);
    // posiziona sotto la cella
    const cell = cells[i];
    const rect = svg.getBoundingClientRect();
    const wrap = host.querySelector('.struct-gridwrap')!.getBoundingClientRect();
    const kx = rect.width / vb.w;
    const ky = rect.height / vb.h;
    const screenX = rect.left + (cell.cx - vb.minX) * kx;
    const yLocal = rect.top + (cell.cy - vb.minY + HEX_R) * ky - wrap.top;
    pop.classList.add('show');
    const pw = pop.offsetWidth;
    let left = screenX - wrap.left - pw / 2;
    left = Math.max(4, Math.min(wrap.width - pw - 4, left));
    pop.style.left = `${left}px`;
    pop.style.top = `${yLocal + 8}px`;
  }
  function closePop(): void {
    pop.classList.remove('show');
    popIdx = -1;
  }
  // id struttura nella cella i: ricavato al momento del click dal mapping corrente
  let cellToStruct = new Map<number, number>();
  function structIdAtCell(cell: number): number | null {
    return cellToStruct.get(cell) ?? null;
  }

  document.addEventListener('click', e => {
    const target = e.target as Element;
    if (pop.contains(target) || target.closest('.cell')) return;
    closePop();
  });

  return {
    update(state: GameState) {
      if (!built) buildSkeleton();
      const key = keyOf(state);
      if (!drag && key !== lastKey) {
        lastKey = key;
        renderFor(state);
        closePop();
        // aggiorna le lookup usate da tooltip/popover per la città corrente
        const city = currentCity(state);
        cellToStruct = new Map(city ? city.structures.map(s => [s.cell, s.id] as const) : []);
        const byCell = new Map(city ? city.structures.map(s => [s.cell, s] as const) : []);
        nameLookup = cell => {
          const s = byCell.get(cell);
          return s ? t(`buildable.${s.type}.name` as MessageKey) : '';
        };
      }
      updateLive(state);
    },
    refresh() {
      built = false; // ricostruisce scheletro+contenuti (cambio lingua) al prossimo update
      lastKey = '';
    },
  };
}
