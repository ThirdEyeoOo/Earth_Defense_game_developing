import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame, worldPopulation } from './state';

describe('state', () => {
  it('createNewGame carica 50 città vive con popolazione iniziale', () => {
    const s = createNewGame(123);
    expect(s.cities).toHaveLength(50);
    expect(s.cities.every(c => c.alive && c.population === c.initialPopulation)).toBe(true);
    expect(s.credits).toBe(CONFIG.startingCredits);
    expect(s.outcome).toBe('playing');
    expect(s.tick).toBe(0);
  });

  it('la prima ondata arriva tra il giorno 10 e il 15, con regione valida', () => {
    for (const seed of [1, 2, 3, 99]) {
      const s = createNewGame(seed);
      const day = s.nextWave.arrivalTick / CONFIG.ticksPerDay;
      expect(day).toBeGreaterThanOrEqual(CONFIG.waves.firstWaveDayMin);
      expect(day).toBeLessThanOrEqual(CONFIG.waves.firstWaveDayMax);
      expect(s.cities.some(c => c.region === s.nextWave.region)).toBe(true);
      expect(s.nextWave.ufoCount).toBe(CONFIG.waves.ufosBase);
    }
  });

  it('è deterministico: stesso seed, stesso stato', () => {
    expect(createNewGame(7)).toEqual(createNewGame(7));
  });

  it('worldPopulation somma le città', () => {
    const s = createNewGame(1);
    expect(worldPopulation(s)).toBeGreaterThan(400_000_000);
  });
});
