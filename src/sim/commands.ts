import { CONFIG } from './config';
import { greatCircleKm } from './geo';
import { squadronCost, transferTicks } from './squadrons';
import type { GameState } from './state';

export type CommandResult = { ok: true } | { ok: false; reason: string };

export function cmdBuildSquadron(state: GameState, cityId: string): CommandResult {
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, reason: 'Città non disponibile' };
  const cost = squadronCost(state, cityId);
  if (state.credits < cost) {
    return { ok: false, reason: `Crediti insufficienti (servono ${cost})` };
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
  if (!sq) return { ok: false, reason: 'Squadrone inesistente' };
  if (sq.transfer) return { ok: false, reason: 'Squadrone già in trasferimento' };
  // la città di partenza può anche essere distrutta: l'evacuazione è sempre permessa
  const from = state.cities.find(c => c.id === sq.cityId)!;
  const to = state.cities.find(c => c.id === toCityId);
  if (!to || !to.alive) return { ok: false, reason: 'Destinazione non disponibile' };
  if (to.id === from.id) return { ok: false, reason: 'Lo squadrone è già qui' };
  const ticks = transferTicks(greatCircleKm(from.lat, from.lon, to.lat, to.lon));
  sq.transfer = { fromCityId: from.id, toCityId: to.id, ticksRemaining: ticks, totalTicks: ticks };
  sq.cityId = to.id;
  return { ok: true };
}

export function cmdSetSpeed(state: GameState, speed: 0 | 1 | 2 | 4 | 10): CommandResult {
  // TODO(debug): strumentazione temporanea per il bug della pausa-fantasma —
  // rimuovere appena individuata la causa
  console.warn('[setSpeed]', state.speed, '→', speed);
  console.trace();
  state.speed = speed;
  return { ok: true };
}
