import { describe, expect, it as test } from 'vitest';
import { it } from '../i18n/it';
import { ENCYCLOPEDIA_ENTRIES } from './encyclopediaEntries';

describe('voci enciclopedia', () => {
  test('ogni voce ha titolo e corpo presenti nel dizionario', () => {
    for (const entry of ENCYCLOPEDIA_ENTRIES) {
      expect(it[entry.titleKey], `manca ${entry.titleKey}`).toBeDefined();
      expect(it[entry.bodyKey], `manca ${entry.bodyKey}`).toBeDefined();
    }
  });

  test('gli id sono unici', () => {
    const ids = ENCYCLOPEDIA_ENTRIES.map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
