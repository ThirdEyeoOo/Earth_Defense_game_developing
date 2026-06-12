import { cmdFoundHq } from './commands';
import { RESOURCE_TYPES } from './resources';
import type { GameState } from './state';
import { createNewGame } from './state';

// Nuova partita con QG già fondato: senza, tick() è un no-op (fase di fondazione).
// Roma di default, come nei test storici.
export function newGameWithHq(seed: number, cityId = 'rome'): GameState {
  const state = createNewGame(seed);
  cmdFoundHq(state, cityId);
  return state;
}

// scorciatoia per i test che devono permettersi qualunque costo
export function grantRiches(state: GameState, amount = 9999): void {
  state.humt = amount;
  for (const type of RESOURCE_TYPES) state.resources[type] = amount;
}
