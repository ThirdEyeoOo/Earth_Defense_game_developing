import { CONFIG } from './config';
import { emitEvent } from './events';
import { greatCircleKm } from './geo';
import { squadronCost, transferTicks } from './squadrons';
import type { GameState } from './state';

// La sim non conosce i testi: gli errori sono codici (+ parametri numerici)
// che la UI traduce con t(`cmd.${code}`) — vedi src/i18n/.
export type CommandErrorCode =
  | 'cityUnavailable'
  | 'insufficientCredits'
  | 'squadronNotFound'
  | 'squadronInTransfer'
  | 'destinationUnavailable'
  | 'sameCity';

export type CommandResult =
  | { ok: true }
  | { ok: false; code: 'insufficientCredits'; params: { cost: number } }
  | { ok: false; code: Exclude<CommandErrorCode, 'insufficientCredits'> };

export function cmdBuildSquadron(state: GameState, cityId: string): CommandResult {
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, code: 'cityUnavailable' };
  const cost = squadronCost(state, cityId);
  if (state.credits < cost) {
    return { ok: false, code: 'insufficientCredits', params: { cost } };
  }
  state.credits -= cost;
  state.squadrons.push({
    id: state.nextSquadronId++,
    hp: CONFIG.squadron.hp,
    cityId,
    transfer: null,
  });
  return { ok: true };
}

export function cmdRelocateSquadron(
  state: GameState,
  squadronId: number,
  toCityId: string,
): CommandResult {
  const sq = state.squadrons.find(s => s.id === squadronId);
  if (!sq) return { ok: false, code: 'squadronNotFound' };
  if (sq.transfer) return { ok: false, code: 'squadronInTransfer' };
  // la città di partenza può anche essere distrutta: l'evacuazione è sempre permessa
  const from = state.cities.find(c => c.id === sq.cityId)!;
  const to = state.cities.find(c => c.id === toCityId);
  if (!to || !to.alive) return { ok: false, code: 'destinationUnavailable' };
  if (to.id === from.id) return { ok: false, code: 'sameCity' };
  const ticks = transferTicks(greatCircleKm(from.lat, from.lon, to.lat, to.lon));
  sq.transfer = { fromCityId: from.id, toCityId: to.id, ticksRemaining: ticks, totalTicks: ticks };
  sq.cityId = to.id;
  emitEvent(state, {
    type: 'squadronTransferStarted',
    unitKind: 'squadron',
    unitId: sq.id,
    cityId: from.id,
  });
  return { ok: true };
}

export function cmdSetSpeed(state: GameState, speed: 0 | 1 | 2 | 4 | 10): CommandResult {
  state.speed = speed;
  return { ok: true };
}
