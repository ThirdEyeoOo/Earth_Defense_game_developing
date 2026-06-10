import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { progressUfos, removeUfo, spawnUfo, travelTicks } from './ufos';

describe('ufos', () => {
  // 2000 km a 8000 km/giorno = 0.25 giorni = 5 tick
  it('travelTicks dalla scheda statistiche', () => {
    expect(travelTicks()).toBe(5);
  });

  it('ciclo completo: discesa → rapimento (10 in 1 giorno) → fuga → -10 popolazione', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const popBefore = rome.population;
    const total = travelTicks() + CONFIG.ticksPerDay + travelTicks();
    for (let i = 0; i < total; i++) progressUfos(s);
    expect(s.ufos).toHaveLength(0);
    expect(rome.population).toBe(popBefore - 10);
    expect(s.stats.populationLost).toBe(10);
    expect(s.stats.ufosShotDown).toBe(0);
  });

  it('abbattuto prima di atterrare = zero perdite', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    progressUfos(s); // ancora in discesa
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
    // 5 tick di discesa + 7 tick di rapimento → abducted = 3.5
    for (let i = 0; i < travelTicks() + 7; i++) progressUfos(s);
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
