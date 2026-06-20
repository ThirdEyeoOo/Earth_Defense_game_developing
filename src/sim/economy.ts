import { CONFIG } from './config';
import { greatCircleKm } from './geo';
import { sizeMultiplier } from './population';
import type { Cost, ResourceType } from './resources';
import { RESOURCE_TYPES, emptyStockpile } from './resources';
import type { CityState, GameState } from './state';

// Economia post-collasso (vedi Economy-model/ECONOMIA.md): producono e pagano
// tasse solo le città collegate alla rete della nuova umanità (QG + ambasciate).
// Tutto scala con la popolazione superstite; un rapimento in corso sospende
// produzione e gettito della città.

export function isConnected(state: GameState, city: CityState): boolean {
  return city.alive && (city.id === state.hqCityId || city.embassy);
}

export function underAbduction(state: GameState, cityId: string): boolean {
  return state.ufos.some(u => u.targetCityId === cityId && u.phase === 'abducting');
}

function popFactor(city: CityState): number {
  return city.initialPopulation > 0 ? city.population / city.initialPopulation : 0;
}

// Potenziale della città = somma non pesata dei 10 amount (0–100 ciascuno) → max 1000.
// È la produzione su `cycleDays` giorni di una città pienamente sviluppata a popolazione piena.
export function cityPotential(city: CityState): number {
  return city.resources.reduce((sum, r) => sum + r.amount, 0);
}

// gettito GIORNALIERO della città: il gettito su 30g = potenziale × popolazione ×
// sizeMultiplier × aliquota; al giorno è quel valore diviso cycleDays.
export function cityIncomePerDay(city: CityState): number {
  const e = CONFIG.economy;
  return (cityPotential(city) * popFactor(city) * sizeMultiplier(city.population) * e.taxRatePerDay) / e.cycleDays;
}

export function dailyIncome(state: GameState): number {
  let total = 0;
  for (const c of state.cities) {
    if (!isConnected(state, c) || underAbduction(state, c.id)) continue;
    total += cityIncomePerDay(c);
  }
  // float: con la base 30 giorni il gettito/giorno è < 1; l'HumT si accumula a frazioni
  // (la UI mostra il floor), esattamente come le risorse — evita che si arrotondi a 0.
  return total;
}

// produzione GIORNALIERA della città per tipo (unità di magazzino): la produzione su 30g
// per risorsa = amount × popFactor × sizeMultiplier; al giorno è quel valore / cycleDays.
export function cityProductionPerDay(city: CityState): Partial<Record<ResourceType, number>> {
  const out: Partial<Record<ResourceType, number>> = {};
  const sm = sizeMultiplier(city.population);
  const pf = popFactor(city);
  for (const r of city.resources) {
    out[r.type] = (r.amount * pf * sm) / CONFIG.economy.cycleDays;
  }
  return out;
}

export function dailyProductionByType(state: GameState): Record<ResourceType, number> {
  const total = emptyStockpile();
  for (const c of state.cities) {
    if (!isConnected(state, c) || underAbduction(state, c.id)) continue;
    const sm = sizeMultiplier(c.population);
    const pf = popFactor(c);
    for (const r of c.resources) {
      total[r.type] += (r.amount * pf * sm) / CONFIG.economy.cycleDays;
    }
  }
  return total;
}

export function applyDailyEconomy(state: GameState): void {
  state.humt += dailyIncome(state);
  const produced = dailyProductionByType(state);
  for (const type of RESOURCE_TYPES) state.resources[type] += produced[type];
}

// distanza dalla città collegata più vicina (Infinity se la rete non esiste ancora)
export function nearestConnectedKm(state: GameState, cityId: string): number {
  const target = state.cities.find(c => c.id === cityId);
  if (!target) return Infinity;
  let min = Infinity;
  for (const c of state.cities) {
    if (c.id === cityId || !isConnected(state, c)) continue;
    min = Math.min(min, greatCircleKm(c.lat, c.lon, target.lat, target.lon));
  }
  return min;
}

// l'ambasciata costa di più lontano dalla rete: i "doni diplomatici" viaggiano
export function embassyCost(state: GameState, cityId: string): Cost {
  const e = CONFIG.economy.embassy;
  const factor = 1 + nearestConnectedKm(state, cityId) / e.distanceDivisorKm;
  return {
    humt: Math.round(e.baseHumt * factor),
    resources: { agroalimentare: Math.round(e.baseAgro * factor) },
  };
}
