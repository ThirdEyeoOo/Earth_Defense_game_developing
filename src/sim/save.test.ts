import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { deserialize, serialize } from './save';
import { createNewGame } from './state';
import { tick } from './tick';

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
});
