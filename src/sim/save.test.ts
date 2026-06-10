import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { deserialize, serialize } from './save';
import { createNewGame } from './state';
import { tick } from './tick';
import { spawnUfo } from './ufos';

describe('save', () => {
  it('roundtrip: salva → carica → la partita prosegue identica', () => {
    const s = createNewGame(11);
    for (let i = 0; i < 250; i++) tick(s);
    const loaded = deserialize(serialize(s))!;
    expect(loaded).toEqual(s);
    // entrambe proseguono identiche
    for (let i = 0; i < 100; i++) {
      tick(s);
      tick(loaded);
    }
    expect(loaded).toEqual(s);
  });

  it('rifiuta JSON corrotto', () => {
    expect(deserialize('{non-json')).toBeNull();
    expect(deserialize('{"a":1}')).toBeNull();
  });

  it('rifiuta versioni future', () => {
    const s = createNewGame(1);
    const raw = JSON.parse(serialize(s));
    raw.version = CONFIG.saveVersion + 1;
    expect(deserialize(JSON.stringify(raw))).toBeNull();
  });

  it('migra i salvataggi v1: gli UFO acquisiscono spawnDir', () => {
    const s = createNewGame(7);
    spawnUfo(s, 'rome');
    const raw = JSON.parse(serialize(s));
    raw.version = 1;
    for (const u of raw.ufos) delete u.spawnDir; // com'era in v1
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(CONFIG.saveVersion);
    const d = loaded.ufos[0].spawnDir;
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
    // la partita migrata prosegue senza errori
    for (let i = 0; i < 50; i++) tick(loaded);
  });

  it('rifiuta salvataggi con versione valida ma forma errata', () => {
    expect(deserialize('{"version":1}')).toBeNull();
    expect(deserialize('{"version":1,"cities":"x","squadrons":[],"ufos":[],"tick":0,"credits":1}')).toBeNull();
  });
});
