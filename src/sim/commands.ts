import { CONFIG } from './config';
import { embassyCost, isConnected } from './economy';
import { emitEvent } from './events';
import { greatCircleKm } from './geo';
import type { Cost, ResourceType } from './resources';
import { squadronCost, transferTicks } from './squadrons';
import type { GameState } from './state';

// La sim non conosce i testi: gli errori sono codici (+ parametri)
// che la UI traduce con t(`cmd.${code}`) — vedi src/i18n/.
export type CommandErrorCode =
  | 'cityUnavailable'
  | 'insufficientHumt'
  | 'insufficientResources'
  | 'squadronNotFound'
  | 'squadronInTransfer'
  | 'destinationUnavailable'
  | 'sameCity'
  | 'hqAlreadyFounded'
  | 'hqNotFounded'
  | 'alreadyConnected';

export type CommandResult =
  | { ok: true }
  | { ok: false; code: 'insufficientHumt'; params: { cost: number } }
  | { ok: false; code: 'insufficientResources'; params: { type: ResourceType; amount: number } }
  | {
      ok: false;
      code: Exclude<CommandErrorCode, 'insufficientHumt' | 'insufficientResources'>;
    };

// verifica e scala un costo composito; in caso di rifiuto non tocca nulla
function payCost(state: GameState, cost: Cost): CommandResult {
  if (state.humt < cost.humt) {
    return { ok: false, code: 'insufficientHumt', params: { cost: cost.humt } };
  }
  const entries = Object.entries(cost.resources) as [ResourceType, number][];
  for (const [type, amount] of entries) {
    if (state.resources[type] < amount) {
      return { ok: false, code: 'insufficientResources', params: { type, amount } };
    }
  }
  state.humt -= cost.humt;
  for (const [type, amount] of entries) state.resources[type] -= amount;
  return { ok: true };
}

// fonda il QG della nuova umanità: gratuito, una tantum, istituisce l'economia
// e accredita il kit di partenza (riserve recuperate dalle macerie)
export function cmdFoundHq(state: GameState, cityId: string): CommandResult {
  if (state.hqCityId !== null) return { ok: false, code: 'hqAlreadyFounded' };
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, code: 'cityUnavailable' };
  state.hqCityId = cityId;
  const kit = CONFIG.economy.starterKit;
  state.humt += kit.humt;
  for (const [type, amount] of Object.entries(kit.resources)) {
    state.resources[type as ResourceType] += amount;
  }
  return { ok: true };
}

// apre un'ambasciata: collega la città alla rete (produzione + tasse)
export function cmdBuildEmbassy(state: GameState, cityId: string): CommandResult {
  if (state.hqCityId === null) return { ok: false, code: 'hqNotFounded' };
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, code: 'cityUnavailable' };
  if (isConnected(state, city)) return { ok: false, code: 'alreadyConnected' };
  const paid = payCost(state, embassyCost(state, cityId));
  if (!paid.ok) return paid;
  city.embassy = true;
  return { ok: true };
}

export function cmdBuildSquadron(state: GameState, cityId: string): CommandResult {
  if (state.hqCityId === null) return { ok: false, code: 'hqNotFounded' };
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, code: 'cityUnavailable' };
  const paid = payCost(state, squadronCost(state, cityId));
  if (!paid.ok) return paid;
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
