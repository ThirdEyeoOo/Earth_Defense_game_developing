import { CONFIG } from './config';
import type { Cost, ResourceType } from './resources';
import type { GameState } from './state';

export function squadronsInCity(state: GameState, cityId: string): number {
  // conta anche quelli in arrivo (cityId = destinazione)
  return state.squadrons.filter(s => s.cityId === cityId).length;
}

// costo crescente: +costGrowth (50%) per ogni squadrone già in città,
// applicato a ogni componente (HumT, industria, combustibili)
export function squadronCost(state: GameState, cityId: string): Cost {
  const sq = CONFIG.squadron;
  const m = 1 + sq.costGrowth * squadronsInCity(state, cityId);
  const resources: Partial<Record<ResourceType, number>> = {};
  for (const [type, amount] of Object.entries(sq.resourceCost)) {
    resources[type as ResourceType] = Math.round(amount * m);
  }
  return { humt: Math.round(sq.baseCost * m), resources };
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
