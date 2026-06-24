import { CONFIG } from './config';
import { applyDailyEconomy } from './economy';
import { trimEvents } from './events';
import { researchById, researchRate } from './researchTree';
import { progressTransfers } from './squadrons';
import type { GameState } from './state';
import { worldPopulation } from './state';
import { progressUfos } from './ufos';
import { processWaves } from './waves';

// ore-gioco per tick: 1 giorno = ticksPerDay tick = 24 ore ⇒ 1,2 ore/tick (a 20 tick/g)
const GAME_HOURS_PER_TICK = 24 / CONFIG.ticksPerDay;

// promuove a `occupied` le strutture la cui costruzione è terminata (buildDoneTick).
// Deterministico e pausa/velocità-aware: dipende solo dal contatore di tick.
function progressStructures(state: GameState): void {
  for (const city of state.cities) {
    for (const s of city.structures) {
      if (s.state === 'building' && state.tick >= s.buildDoneTick) s.state = 'occupied';
    }
  }
}

// avanza la ricerca selezionata di `researchRate × ore/tick`; a quota piena sblocca il
// nodo e libera lo slot. Deterministico (dipende da tick, laboratori operativi e QG).
function progressResearch(state: GameState): void {
  const sel = state.research.selected;
  if (!sel) return;
  const node = researchById.get(sel);
  if (!node) {
    state.research.selected = null;
    return;
  }
  state.research.progress += researchRate(state) * GAME_HOURS_PER_TICK;
  // epsilon: l'accumulo di 1,2/tick deriva in virgola mobile (20×1,2 ≈ 23,9999996)
  if (state.research.progress >= node.researchHours - 1e-9) {
    state.research.unlocked.push(sel);
    state.research.selected = null;
    state.research.progress = 0;
  }
}

function checkOutcome(state: GameState): void {
  if (worldPopulation(state) <= 0) {
    state.outcome = 'defeat';
    return;
  }
  if (state.wavesSpawned >= CONFIG.waves.victoryWaves && state.ufos.length === 0) {
    state.outcome = 'victory';
  }
}

// Ordine fisso del tick: trasferimenti → ondate → progressione UFO → economia
// (a fine giornata) → esito. Il COMBATTIMENTO non è più qui: è in tempo reale nel
// loop di rendering (src/render/combatEngine.ts), guidato dall'orologio in minuti-gioco.
export function tick(state: GameState): void {
  // hqCityId null = fase di fondazione: il tempo parte solo col QG fondato
  if (state.outcome !== 'playing' || state.hqCityId === null) return;
  state.tick++;
  progressTransfers(state);
  progressStructures(state);
  progressResearch(state);
  processWaves(state);
  progressUfos(state);
  if (state.tick % CONFIG.ticksPerDay === 0) applyDailyEconomy(state);
  checkOutcome(state);
  trimEvents(state);
}
