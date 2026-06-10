import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { tick } from './tick';

describe('tick', () => {
  it('l\'economia si applica una volta al giorno', () => {
    const s = createNewGame(1);
    const credits = s.credits;
    for (let i = 0; i < CONFIG.ticksPerDay - 1; i++) tick(s);
    expect(s.credits).toBe(credits);
    tick(s); // tick 20 → fine giornata
    expect(s.credits).toBeGreaterThan(credits);
  });

  it('determinismo: stesso seed e stessi comandi → stato identico', () => {
    const a = createNewGame(42);
    const b = createNewGame(42);
    for (let i = 0; i < 15 * CONFIG.ticksPerDay; i++) {
      tick(a);
      tick(b);
    }
    expect(a).toEqual(b);
  });

  it('sconfitta a popolazione mondiale zero', () => {
    const s = createNewGame(1);
    for (const c of s.cities) {
      c.population = 0;
      c.alive = false;
    }
    tick(s);
    expect(s.outcome).toBe('defeat');
  });

  it('vittoria dopo le ondate richieste, a cielo sgombro', () => {
    const s = createNewGame(1);
    s.wavesSpawned = CONFIG.waves.victoryWaves;
    s.nextWave.arrivalTick = 999999;
    tick(s);
    expect(s.outcome).toBe('victory');
  });

  it('a esito deciso il tick non avanza più', () => {
    const s = createNewGame(1);
    s.outcome = 'victory';
    const t = s.tick;
    tick(s);
    expect(s.tick).toBe(t);
  });

  it('una partita giocata a lungo senza difese spawna ondate e perde popolazione', () => {
    const s = createNewGame(3);
    for (let i = 0; i < 40 * CONFIG.ticksPerDay; i++) tick(s);
    expect(s.wavesSpawned).toBeGreaterThanOrEqual(2);
    expect(s.stats.populationLost).toBeGreaterThan(0);
  });
});
