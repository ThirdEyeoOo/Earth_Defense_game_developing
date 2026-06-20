import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { cmdAbduct } from './commands';
import { ufoSpeedKmH } from './measure';
import { advanceUfoToPhase, advanceUfosUntilGone } from './testUtils';
import { progressUfos, removeUfo, spawnUfo } from './ufos';

describe('ufos', () => {
  it('spawn: parametri orbitali e durata di fase derivati dalla fisica', () => {
    const s = createNewGame(9);
    spawnUfo(s, 'rome');
    const ufo = s.ufos[0];
    expect(ufo.phase).toBe('approaching');
    expect(ufo.orbit.orbitRadius).toBeGreaterThan(ufo.orbit.surfaceRadius);
    expect(ufo.phaseTotalTicks).toBeGreaterThan(0);
    expect(Number.isInteger(ufo.phaseTotalTicks)).toBe(true);
    expect(ufo.ticksRemaining).toBe(ufo.phaseTotalTicks);
    expect(ufo.lunarCrossTick).toBeGreaterThanOrEqual(0);
    expect(ufo.lunarCrossTick).toBeLessThanOrEqual(ufo.phaseTotalTicks);
  });

  it('spawn: direzione di arrivo unitaria e deterministica dal seed', () => {
    const a = createNewGame(9);
    const b = createNewGame(9);
    spawnUfo(a, 'rome');
    spawnUfo(b, 'rome');
    expect(a.ufos[0].spawnDir).toEqual(b.ufos[0].spawnDir);
    expect(a.ufos[0].orbit.cityDir).toEqual(b.ufos[0].orbit.cityDir);
    const d = a.ufos[0].spawnDir;
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
  });

  it('catena di fasi: avvicinamento → orbita → discesa', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    advanceUfoToPhase(s, 'orbiting');
    expect(s.ufos[0].phase).toBe('orbiting');
    advanceUfoToPhase(s, 'descending');
    expect(s.ufos[0].phase).toBe('descending');
  });

  it('ciclo completo: rapimento a capienza piena → fuga → -100 popolazione', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome'); // Roma ha milioni di abitanti: si riempie alla capienza (100)
    const rome = s.cities.find(c => c.id === 'rome')!;
    const popBefore = rome.population;
    advanceUfoToPhase(s, 'abducting');
    const cap = CONFIG.ufoAbductor.captureCapacity;
    for (let i = 0; i < cap; i++) cmdAbduct(s, s.ufos[0].id); // rapimento in tempo reale → fuga a capienza
    expect(s.ufos[0].phase).toBe('escaping');
    advanceUfosUntilGone(s); // completa la fuga
    expect(s.ufos).toHaveLength(0);
    expect(rome.population).toBe(popBefore - cap);
    expect(s.stats.populationLost).toBe(cap);
    expect(s.stats.ufosShotDown).toBe(0);
  });

  it('abbattuto prima di atterrare = zero perdite', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    progressUfos(s); // ancora in avvicinamento
    removeUfo(s, s.ufos[0].id, 'shotDown');
    expect(s.cities.find(c => c.id === 'rome')!.population).toBe(
      s.cities.find(c => c.id === 'rome')!.initialPopulation,
    );
    expect(s.stats.ufosShotDown).toBe(1);
    expect(s.stats.populationLost).toBe(0);
  });

  it('abbattuto a metà rapimento = persi solo i rapiti fino a quel momento', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const popBefore = rome.population;
    advanceUfoToPhase(s, 'abducting');
    // il rapimento ora è in tempo reale, uno alla volta (cmdAbduct): 60 < capienza 100
    for (let i = 0; i < 60; i++) cmdAbduct(s, s.ufos[0].id);
    expect(s.ufos[0].phase).toBe('abducting');
    removeUfo(s, s.ufos[0].id, 'shotDown');
    expect(rome.population).toBe(popBefore - 60);
    expect(s.stats.populationLost).toBe(60);
  });

  it('rapisce uno alla volta fino alla capienza, poi parte in fuga (niente sforo)', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome'); // Roma ha milioni di abitanti: il limite è la capienza
    advanceUfoToPhase(s, 'abducting');
    const cap = CONFIG.ufoAbductor.captureCapacity;
    for (let i = 0; i < cap + 10; i++) cmdAbduct(s, s.ufos[0].id); // oltre la capienza: no-op dopo il pieno
    expect(s.ufos[0].abducted).toBe(cap); // esatto, niente overshoot da blocco-tick
    expect(s.ufos[0].phase).toBe('escaping');
  });

  it('spawn: arriva dallo spazio profondo già veloce (≥10.000 km/h)', () => {
    const s = createNewGame(7);
    spawnUfo(s, 'rome');
    expect(s.ufos[0].phase).toBe('approaching');
    expect(ufoSpeedKmH(s.ufos[0], 0)).toBeGreaterThanOrEqual(10000);
  });

  it("se la città bersaglio è distrutta, l'UFO passa in fuga", () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    s.cities.find(c => c.id === 'rome')!.alive = false;
    progressUfos(s);
    expect(s.ufos[0].phase).toBe('escaping');
  });
});
