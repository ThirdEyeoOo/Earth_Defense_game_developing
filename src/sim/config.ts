export const CONFIG = {
  ticksPerDay: 20,
  startDateIso: '2026-01-01',
  startingCredits: 1000,
  taxPerMillionPerDay: 1,
  squadron: {
    attack: 6,
    shotsPerTick: 1,
    hp: 100,
    armor: 2,
    speedKmPerDay: 24000,
    baseCost: 500,
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
  saveVersion: 2,
} as const;
