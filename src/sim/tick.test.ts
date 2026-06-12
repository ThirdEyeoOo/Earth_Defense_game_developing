import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { newGameWithHq } from './testUtils';
import { tick } from './tick';

describe('tick', () => {
  it('prima della fondazione del QG il tick è un no-op', () => {
    const s = createNewGame(1);
    tick(s);
    tick(s);
    expect(s.tick).toBe(0);
    expect(s.humt).toBe(0);
  });

  it('l\'economia si applica una volta al giorno', () => {
    const s = newGameWithHq(1);
    const humt = s.humt;
    for (let i = 0; i < CONFIG.ticksPerDay - 1; i++) tick(s);
    expect(s.humt).toBe(humt);
    tick(s); // tick 20 → fine giornata
    expect(s.humt).toBeGreaterThan(humt);
  });

  it('determinismo: stesso seed e stessi comandi → stato identico', () => {
    const a = newGameWithHq(42);
    const b = newGameWithHq(42);
    for (let i = 0; i < 15 * CONFIG.ticksPerDay; i++) {
      tick(a);
      tick(b);
    }
    expect(a).toEqual(b);
  });

  it('sconfitta a popolazione mondiale zero', () => {
    const s = newGameWithHq(1);
    for (const c of s.cities) {
      c.population = 0;
      c.alive = false;
    }
    tick(s);
    expect(s.outcome).toBe('defeat');
  });

  it('vittoria dopo le ondate richieste, a cielo sgombro', () => {
    const s = newGameWithHq(1);
    s.wavesSpawned = CONFIG.waves.victoryWaves;
    s.nextWave.arrivalTick = 999999;
    tick(s);
    expect(s.outcome).toBe('victory');
  });

  it('a esito deciso il tick non avanza più', () => {
    const s = newGameWithHq(1);
    s.outcome = 'victory';
    const t = s.tick;
    tick(s);
    expect(s.tick).toBe(t);
  });

  it('una partita giocata a lungo senza difese spawna ondate e perde popolazione', () => {
    const s = newGameWithHq(3);
    for (let i = 0; i < 40 * CONFIG.ticksPerDay; i++) tick(s);
    expect(s.wavesSpawned).toBeGreaterThanOrEqual(2);
    expect(s.stats.populationLost).toBeGreaterThan(0);
  });
});
