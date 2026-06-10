import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { processWaves, scheduleNextWave } from './waves';

describe('waves', () => {
  it('non spawna prima del tick di arrivo', () => {
    const s = createNewGame(1);
    processWaves(s);
    expect(s.ufos).toHaveLength(0);
    expect(s.wavesSpawned).toBe(0);
  });

  it('al tick di arrivo spawna gli UFO nella regione e pianifica la successiva', () => {
    const s = createNewGame(1);
    const wave = s.nextWave;
    s.tick = wave.arrivalTick;
    processWaves(s);
    expect(s.ufos).toHaveLength(wave.ufoCount);
    expect(s.wavesSpawned).toBe(1);
    for (const u of s.ufos) {
      expect(s.cities.find(c => c.id === u.targetCityId)!.region).toBe(wave.region);
    }
    expect(s.nextWave.waveNumber).toBe(2);
    expect(s.nextWave.arrivalTick).toBeGreaterThan(s.tick);
    expect(s.nextWave.ufoCount).toBe(CONFIG.waves.ufosBase + CONFIG.waves.ufosPerWave);
  });

  it('l\'intervallo si accorcia col progredire ma non sotto il minimo', () => {
    const s = createNewGame(1);
    s.wavesSpawned = 100;
    s.tick = 5000;
    scheduleNextWave(s);
    const days = (s.nextWave.arrivalTick - s.tick) / CONFIG.ticksPerDay;
    expect(days).toBeGreaterThanOrEqual(CONFIG.waves.intervalMinDays);
    expect(days).toBeLessThanOrEqual(CONFIG.waves.intervalMinDays + 2); // jitter max 2 giorni
  });

  it('è deterministico a parità di seed', () => {
    const a = createNewGame(5);
    const b = createNewGame(5);
    a.tick = a.nextWave.arrivalTick;
    b.tick = b.nextWave.arrivalTick;
    processWaves(a);
    processWaves(b);
    expect(a.ufos).toEqual(b.ufos);
    expect(a.nextWave).toEqual(b.nextWave);
  });
});
