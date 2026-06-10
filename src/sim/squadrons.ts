import { CONFIG } from './config';
import type { GameState } from './state';

export function squadronsInCity(state: GameState, cityId: string): number {
  // conta anche quelli in arrivo (cityId = destinazione)
  return state.squadrons.filter(s => s.cityId === cityId).length;
}

export function squadronCost(state: GameState, cityId: string): number {
  const sq = CONFIG.squadron;
  return Math.round(sq.baseCost * (1 + sq.costGrowth * squadronsInCity(state, cityId)));
}

export function transferTicks(distanceKm: number): number {
  return Math.max(
    1,
    Math.ceil((distanceKm / CONFIG.squadron.speedKmPerDay) * CONFIG.ticksPerDay),
  );
}

export function progressTransfers(state: GameState): void {
  for (const s of state.squadrons) {
    if (!s.transfer) continue;
    s.transfer.ticksRemaining--;
    if (s.transfer.ticksRemaining <= 0) s.transfer = null;
  }
}
