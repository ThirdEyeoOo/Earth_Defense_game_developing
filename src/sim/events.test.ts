import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { cmdBuildSquadron, cmdRelocateSquadron } from './commands';
import { EVENT_RETENTION_TICKS, emitEvent } from './events';
import { createNewGame } from './state';
import { advanceUfoToPhase, advanceUfosUntilGone, newGameWithHq } from './testUtils';
import { tick } from './tick';
import { progressUfos, spawnUfo } from './ufos';

describe('events', () => {
  it('catena di fasi UFO: emette ufoOrbiting → ufoDescending → ufoAbducting e nient\'altro', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    advanceUfosUntilGone(s);
    expect(s.ufos).toHaveLength(0); // ciclo completo: l'UFO è uscito di scena
    expect(s.events.map(e => e.type)).toEqual(['ufoOrbiting', 'ufoDescending', 'ufoAbducting']);
    for (const e of s.events) {
      expect(e.unitKind).toBe('ufo');
      expect(e.unitId).toBe(1);
      expect(e.cityId).toBe('rome');
    }
    expect(s.events.map(e => e.id)).toEqual([1, 2, 3]);
  });

  it('città morta → fuga forzata: nessun evento', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    s.cities.find(c => c.id === 'rome')!.alive = false;
    progressUfos(s);
    expect(s.ufos[0].phase).toBe('escaping');
    expect(s.events).toEqual([]);
  });

  it('trasferimento squadrone: evento con la città di partenza; comando fallito non emette', () => {
    const s = newGameWithHq(1);
    cmdBuildSquadron(s, 'rome');
    cmdRelocateSquadron(s, 1, 'rome'); // stessa città: fallisce
    expect(s.events).toEqual([]);
    cmdRelocateSquadron(s, 1, 'tokyo');
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({
      type: 'squadronTransferStarted',
      unitKind: 'squadron',
      unitId: 1,
      cityId: 'rome',
    });
  });

  it('abductedTotal accumula durante i rapimenti, coerente con il contatore di bordo', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    advanceUfoToPhase(s, 'abducting');
    expect(s.ufos[0].phase).toBe('abducting');
    expect(s.stats.abductedTotal).toBe(0);
    const n = 6;
    for (let i = 0; i < n; i++) progressUfos(s);
    const perTick = CONFIG.ufoAbductor.abductionPerDay / CONFIG.ticksPerDay;
    expect(s.stats.abductedTotal).toBeCloseTo(n * perTick);
    expect(s.stats.abductedTotal).toBeCloseTo(s.ufos[0].abducted);
  });

  it('determinismo: stesso seed e stessi comandi → stesso registro eventi', () => {
    const run = () => {
      const s = newGameWithHq(42);
      cmdBuildSquadron(s, 'rome');
      cmdRelocateSquadron(s, 1, 'tokyo');
      for (let i = 0; i < 400; i++) tick(s);
      return s;
    };
    expect(run().events).toEqual(run().events);
  });
  it('trimming: gli eventi più vecchi della finestra spariscono, gli id non si riusano', () => {
    const s = newGameWithHq(1);
    emitEvent(s, { type: 'ufoOrbiting', unitKind: 'ufo', unitId: 99, cityId: 'rome' });
    expect(s.events).toHaveLength(1);
    const firstId = s.events[0].id;
    for (let i = 0; i < EVENT_RETENTION_TICKS + 2; i++) tick(s);
    expect(s.events.find(e => e.id === firstId)).toBeUndefined();
    // un evento recente sopravvive al trim e l'id continua a crescere
    emitEvent(s, { type: 'ufoDescending', unitKind: 'ufo', unitId: 100, cityId: 'rome' });
    tick(s);
    const recent = s.events.find(e => e.unitId === 100);
    expect(recent).toBeDefined();
    expect(recent!.id).toBeGreaterThan(firstId);
  });
});
