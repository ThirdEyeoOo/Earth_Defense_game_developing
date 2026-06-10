import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { approachTicks, descentTicks, orbitTicks, progressUfos, removeUfo, spawnUfo } from './ufos';

describe('ufos', () => {
  it('durate delle fasi dalla scheda statistiche', () => {
    expect(approachTicks()).toBe(20); // 1 giorno
    expect(orbitTicks()).toBe(20); // 3 orbite da 1/3 di giorno
    expect(descentTicks()).toBe(5); // 2000 km a 8000 km/giorno
  });

  it('spawn: parte dallo spazio profondo con direzione unitaria deterministica', () => {
    const a = createNewGame(9);
    const b = createNewGame(9);
    spawnUfo(a, 'rome');
    spawnUfo(b, 'rome');
    expect(a.ufos[0].phase).toBe('approaching');
    expect(a.ufos[0].spawnDir).toEqual(b.ufos[0].spawnDir);
    const d = a.ufos[0].spawnDir;
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
  });

  it('catena di fasi: avvicinamento → orbita → discesa', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    for (let i = 0; i < approachTicks(); i++) progressUfos(s);
    expect(s.ufos[0].phase).toBe('orbiting');
    for (let i = 0; i < orbitTicks(); i++) progressUfos(s);
    expect(s.ufos[0].phase).toBe('descending');
  });

  it('ciclo completo: orbita → discesa → rapimento (10 in 1 giorno) → fuga → -10 popolazione', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const popBefore = rome.population;
    const total =
      approachTicks() + orbitTicks() + descentTicks() + CONFIG.ticksPerDay + descentTicks();
    for (let i = 0; i < total; i++) progressUfos(s);
    expect(s.ufos).toHaveLength(0);
    expect(rome.population).toBe(popBefore - 10);
    expect(s.stats.populationLost).toBe(10);
    expect(s.stats.ufosShotDown).toBe(0);
  });

  it('abbattuto prima di atterrare = zero perdite', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    progressUfos(s); // ancora in avvicinamento
    removeUfo(s, s.ufos[0].id, 'shotDown');
    expect(s.cities.find(c => c.id === 'rome')!.population)
      .toBe(s.cities.find(c => c.id === 'rome')!.initialPopulation);
    expect(s.stats.ufosShotDown).toBe(1);
    expect(s.stats.populationLost).toBe(0);
  });

  it('abbattuto a metà rapimento = persi solo i rapiti fino a quel momento (floor)', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const popBefore = rome.population;
    // fino all'atterraggio + 7 tick di rapimento → abducted = 3.5
    const toLanding = approachTicks() + orbitTicks() + descentTicks();
    for (let i = 0; i < toLanding + 7; i++) progressUfos(s);
    expect(s.ufos[0].phase).toBe('abducting');
    removeUfo(s, s.ufos[0].id, 'shotDown');
    expect(rome.population).toBe(popBefore - 3);
    expect(s.stats.populationLost).toBe(3);
  });

  it('se la città bersaglio è distrutta, l\'UFO passa in fuga', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.alive = false;
    progressUfos(s);
    expect(s.ufos[0].phase).toBe('escaping');
  });
});
