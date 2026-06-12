import type { ResourceType } from './resources';

export const CONFIG = {
  ticksPerDay: 20,
  startDateIso: '2026-01-01',
  economy: {
    // valore in HumT di 1 punto di capacità produttiva (vedi Economy-model/ECONOMIA.md):
    // se cambiano, ricalcolare gdp_post_apoc_humt in cities.json
    resourceWeights: {
      agroalimentare: 10,
      energia: 9,
      chimica: 8,
      combustibili_fossili: 8,
      materiali_da_costruzione: 7,
      industria: 6,
      metalli_preziosi_e_minerali: 5,
      tecnologia: 4,
      tessuti: 3,
      finanza: 1,
    } satisfies Record<ResourceType, number>,
    conversionRate: 0.1, // unità prodotte al giorno per punto di capacità
    taxRatePerDay: 0.09, // gettito = Σ(peso×amount) × popFactor × aliquota (~52–203 Ħ/g per città)
    embassy: { baseHumt: 150, baseAgro: 20, distanceDivisorKm: 5000 },
    // riserve recuperate dalle macerie alla fondazione del QG: bastano per il
    // primo squadrone subito, o squadrone + ambasciata vicina in 1-2 giorni
    starterKit: {
      humt: 450,
      resources: { industria: 30, combustibili_fossili: 20, agroalimentare: 25 },
    },
  },
  squadron: {
    attack: 6,
    shotsPerTick: 1,
    hp: 100,
    armor: 2,
    speedKmPerDay: 24000,
    baseCost: 300, // in HumT; si aggiunge resourceCost
    resourceCost: { industria: 25, combustibili_fossili: 15 } satisfies Partial<
      Record<ResourceType, number>
    >,
    costGrowth: 0.5,
  },
  ufoAbductor: {
    attack: 4,
    shotsPerTick: 1,
    hp: 60,
    armor: 1,
    abductionPerDay: 10,
    abductionDays: 1,
    // velocità per fase di viaggio: in futuro ogni nemico/difesa avrà le sue
    travel: {
      approachDays: 1, // spazio profondo → inserimento in orbita
      orbits: 3, // orbite complete prima della discesa
      orbitDaysPerOrbit: 1 / 3, // durata di una singola orbita
      descentKm: 2000, // discesa atmosferica (e fuga)
      atmosphereKmPerDay: 8000,
    },
  },
  waves: {
    firstWaveDayMin: 10,
    firstWaveDayMax: 15,
    intervalBaseDays: 14,
    intervalShrinkPerWave: 1,
    intervalMinDays: 5,
    ufosBase: 1,
    ufosPerWave: 1,
    victoryWaves: 10,
  },
  saveVersion: 4,
} as const;
