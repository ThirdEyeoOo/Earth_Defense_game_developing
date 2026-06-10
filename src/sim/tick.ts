import { CONFIG } from './config';
import { resolveCombat } from './combat';
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

// Ordine fisso del tick: trasferimenti → ondate → combattimento →
// progressione UFO → economia (a fine giornata) → esito.
export function tick(state: GameState): void {
  if (state.outcome !== 'playing') return;
  state.tick++;
  progressTransfers(state);
  processWaves(state);
  resolveCombat(state);
  progressUfos(state);
  if (state.tick % CONFIG.ticksPerDay === 0) applyDailyEconomy(state);
  checkOutcome(state);
  trimEvents(state);
}
