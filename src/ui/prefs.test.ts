import { describe, expect, it } from 'vitest';
import { loadPrefs, PREFS_KEY, savePrefs, type Prefs } from './prefs';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

describe('prefs', () => {
  it('default vuoto se non c’è nulla di salvato', () => {
    expect(loadPrefs(memoryStorage())).toEqual({});
  });

  it('default vuoto su JSON corrotto o forma inattesa', () => {
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: '{non-json' }))).toEqual({});
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: '"stringa"' }))).toEqual({});
    expect(loadPrefs(memoryStorage({ [PREFS_KEY]: '{"language":"fr"}' }))).toEqual({});
  });

  it('round-trip salva e ricarica la lingua', () => {
    const storage = memoryStorage();
    const prefs: Prefs = { language: 'en' };
    savePrefs(prefs, storage);
    expect(loadPrefs(storage)).toEqual({ language: 'en' });
  });

  it('savePrefs ingoia gli errori di storage', () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    };
    expect(() => savePrefs({ language: 'it' }, broken)).not.toThrow();
  });
});
