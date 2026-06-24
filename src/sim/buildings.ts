import { CONFIG } from './config';
import type { Cost } from './resources';
import type { CityState, StructureType } from './state';

// Strutture da città (griglia esagonale di hardpoint). Modulo PURO: niente i18n/THREE.
// La capienza della griglia (numero di hardpoint) scala con la popolazione; la geometria
// esagonale è la stessa del prototipo Design (Griglia Strutture.html), condivisa con la UI.

export const STRUCTURE_TYPES: StructureType[] = ['tower', 'lab'];

// minuti-gioco per tick: 1 giorno = ticksPerDay tick = 1440 minuti ⇒ 72 min/tick (a 20 tick/g)
const GAME_MINUTES_PER_TICK = (24 * 60) / CONFIG.ticksPerDay;

// configurazione della struttura (cost/buildMinutes/hp comuni ai due tipi)
export function structureDef(type: StructureType) {
  return CONFIG.buildings[type];
}

export function structureCost(type: StructureType): Cost {
  const c = CONFIG.buildings[type].cost;
  return { humt: c.humt, resources: { ...c.resources } };
}

// durata di costruzione in TICK (deterministica): la costruzione termina a tick + questo
export function buildTicksFor(type: StructureType): number {
  return Math.max(1, Math.ceil(CONFIG.buildings[type].buildMinutes / GAME_MINUTES_PER_TICK));
}

// capienza della griglia = hardpoint disponibili nella città
export function gridCapacity(city: CityState): number {
  const b = CONFIG.buildings;
  return b.baseSlots + Math.floor(city.population / b.popPerSlot);
}

export function cellOccupied(city: CityState, cell: number): boolean {
  return city.structures.some(s => s.cell === cell);
}

// ── geometria esagonale (pointy-top, righe sfalsate) — fonte di verità visiva del prototipo ──
export const HEX_R = 45; // centro → vertice
export const HEX_W = Math.sqrt(3) * HEX_R; // larghezza esagono
export const HEX_ROWSTEP = 1.5 * HEX_R; // passo verticale fra righe

export interface HexCell {
  index: number;
  cx: number;
  cy: number;
}

// disposizione a nido d'ape di `capacity` celle: righe da max 7 colonne, dispari sfalsate
export function hexCells(capacity: number): HexCell[] {
  const cols = Math.min(7, Math.max(1, capacity));
  const cells: HexCell[] = [];
  for (let i = 0; i < capacity; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const cx = HEX_W / 2 + c * HEX_W + (r % 2 ? HEX_W / 2 : 0);
    const cy = HEX_R + r * HEX_ROWSTEP;
    cells.push({ index: i, cx, cy });
  }
  return cells;
}
