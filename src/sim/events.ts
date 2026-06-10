import type { GameState } from './state';

export type SimEventType =
  | 'squadronTransferStarted'
  | 'ufoOrbiting'
  | 'ufoDescending'
  | 'ufoAbducting';
// futuri: 'ufoShotDown' | 'squadronDestroyed' | ...

export interface SimEvent {
  id: number; // monotono e persistito (state.nextEventId): cursore UI robusto al trimming
  tick: number;
  type: SimEventType;
  unitKind: 'squadron' | 'ufo';
  unitId: number;
  cityId?: string; // ancora di ripiego per la UI se l'unità è già uscita di scena
}

// ben oltre il peggior burst di tick per frame (dt clampato a 1 s ⇒ ~4 tick a 10x)
export const EVENT_RETENTION_TICKS = 40; // 2 giorni di gioco

export function emitEvent(state: GameState, event: Omit<SimEvent, 'id' | 'tick'>): void {
  state.events.push({ id: state.nextEventId++, tick: state.tick, ...event });
}

export function trimEvents(state: GameState): void {
  const cutoff = state.tick - EVENT_RETENTION_TICKS;
  if (state.events.length > 0 && state.events[0].tick < cutoff) {
    state.events = state.events.filter(e => e.tick >= cutoff);
  }
}
