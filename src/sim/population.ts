// Fascia di popolazione di una città → moltiplicatore economico (gettito +
// produzione). Modulo PURO (vedi confine sim): importa solo CONFIG.
// La tabella delle fasce (soglie, moltiplicatori) vive in
// CONFIG.economy.populationTiers; qui solo la logica di selezione.
import { CONFIG } from './config';

export type PopulationTierKey = (typeof CONFIG.economy.populationTiers)[number]['key'];

// fascia = l'ultima voce (in ordine crescente) con minPopulation <= popolazione
function tierFor(population: number) {
  const tiers = CONFIG.economy.populationTiers;
  let result: (typeof tiers)[number] = tiers[0]!;
  for (const tier of tiers) {
    if (population >= tier.minPopulation) result = tier;
  }
  return result;
}

export function populationTier(population: number): PopulationTierKey {
  return tierFor(population).key;
}

export function sizeMultiplier(population: number): number {
  return tierFor(population).multiplier;
}
