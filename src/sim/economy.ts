import { CONFIG } from './config';
import { greatCircleKm } from './geo';
import type { Cost, ResourceType } from './resources';
import { RESOURCE_TYPES, emptyStockpile } from './resources';
import type { CityState, GameState } from './state';

// Economia post-collasso (vedi Economy-model/ECONOMIA.md): producono e pagano
// tasse solo le città collegate alla rete della nuova umanità (QG + ambasciate).
// Tutto scala con la popolazione ATTUALE; un rapimento in corso sospende
// produzione e gettito della città.

export function isConnected(state: GameState, city: CityState): boolean {
  return city.alive && (city.id === state.hqCityId || city.embassy);
}

export function underAbduction(state: GameState, cityId: string): boolean {
  return state.ufos.some(u => u.targetCityId === cityId && u.phase === 'abducting');
}

// Potenziale della città = somma non pesata dei 10 amount (0–100 ciascuno) → max 1000.
// Indice di sviluppo della città (peso nella curva e mix delle risorse prodotte).
export function cityPotential(city: CityState): number {
  return city.resources.reduce((sum, r) => sum + r.amount, 0);
}

// Output economico della città: una sola curva sublineare (rendimenti decrescenti) sulla
// POPOLAZIONE ATTUALE e sul potenziale. Gettito e produzione di beni ne sono due scalature.
// Niente initialPopulation: cresce se la città cresce, cala se viene spopolata.
function cityOutput(city: CityState): number {
  const e = CONFIG.economy;
  return Math.pow(city.population * cityPotential(city), e.outputExponent);
}

// gettito GIORNALIERO della città (HumT): incomeCoeff × output.
export function cityIncomePerDay(city: CityState): number {
  return CONFIG.economy.incomeCoeff * cityOutput(city);
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

// produzione GIORNALIERA della città per tipo (unità di magazzino): i beni totali =
// productionCoeff × output (stessa curva del gettito), ripartiti per quota amount/potenziale.
export function cityProductionPerDay(city: CityState): Partial<Record<ResourceType, number>> {
  const out: Partial<Record<ResourceType, number>> = {};
  const pot = cityPotential(city);
  const total = CONFIG.economy.productionCoeff * cityOutput(city);
  for (const r of city.resources) {
    out[r.type] = pot > 0 ? (total * r.amount) / pot : 0;
  }
  return out;
}

export function dailyProductionByType(state: GameState): Record<ResourceType, number> {
  const total = emptyStockpile();
  for (const c of state.cities) {
    if (!isConnected(state, c) || underAbduction(state, c.id)) continue;
    const pot = cityPotential(c);
    if (pot <= 0) continue;
    const cityTotal = CONFIG.economy.productionCoeff * cityOutput(c);
    for (const r of c.resources) {
      total[r.type] += (cityTotal * r.amount) / pot;
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
