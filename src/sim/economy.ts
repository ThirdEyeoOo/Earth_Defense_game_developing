import { CONFIG } from './config';
import type { GameState } from './state';

// tasse: 1 credito al giorno per milione di abitanti vivi (CONFIG.taxPerMillionPerDay)
export function dailyIncome(state: GameState): number {
  const alivePop = state.cities
    .filter(c => c.alive)
    .reduce((sum, c) => sum + c.population, 0);
  return Math.round((alivePop / 1_000_000) * CONFIG.taxPerMillionPerDay);
}

export function applyDailyEconomy(state: GameState): void {
  state.credits += dailyIncome(state);
}
