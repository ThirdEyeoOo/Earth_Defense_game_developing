import { cmdFoundHq } from './commands';
import { RESOURCE_TYPES } from './resources';
import type { GameState, UfoPhase } from './state';
import { createNewGame } from './state';
import { progressUfos } from './ufos';

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

// Avanza il primo UFO finché non raggiunge `phase` (le durate ora sono fisiche
// e variabili, quindi i test osservano le transizioni invece di contare i tick).
export function advanceUfoToPhase(state: GameState, phase: UfoPhase, max = 5000): void {
  for (let i = 0; i < max; i++) {
    if (state.ufos[0]?.phase === phase) return;
    progressUfos(state);
  }
}

// Avanza finché non restano UFO in scena (ciclo completo).
export function advanceUfosUntilGone(state: GameState, max = 5000): void {
  for (let i = 0; i < max; i++) {
    if (state.ufos.length === 0) return;
    progressUfos(state);
  }
}
