import { describe, expect, it } from 'vitest';
import { EVENT_RETENTION_TICKS, emitEvent } from './events';
import { createNewGame } from './state';
import { tick } from './tick';

describe('events', () => {
  it('trimming: gli eventi più vecchi della finestra spariscono, gli id non si riusano', () => {
    const s = createNewGame(1);
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
