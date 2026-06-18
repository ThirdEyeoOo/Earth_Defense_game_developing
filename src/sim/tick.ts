import { CONFIG } from './config';
import { applyDailyEconomy } from './economy';
import { trimEvents } from './events';
import { progressTransfers } from './squadrons';
import type { GameState } from './state';
import { worldPopulation } from './state';
import { progressUfos } from './ufos';
import { processWaves } from './waves';

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
  processWaves(state);
  progressUfos(state);
  if (state.tick % CONFIG.ticksPerDay === 0) applyDailyEconomy(state);
  checkOutcome(state);
  trimEvents(state);
}
