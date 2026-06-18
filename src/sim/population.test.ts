import { describe, expect, it } from 'vitest';
import { populationTier, sizeMultiplier } from './population';

describe('fasce di popolazione', () => {
  it('mappa ogni popolazione alla fascia giusta sui confini', () => {
    expect(populationTier(999_999)).toBe('cittadina');
    expect(populationTier(1_000_000)).toBe('citta');
    expect(populationTier(3_999_999)).toBe('citta');
    expect(populationTier(4_000_000)).toBe('metropoli');
    expect(populationTier(9_999_999)).toBe('metropoli');
    expect(populationTier(10_000_000)).toBe('megacitta');
    expect(populationTier(17_999_999)).toBe('megacitta');
    expect(populationTier(18_000_000)).toBe('metacitta');
    expect(populationTier(26_000_000)).toBe('metacitta'); // Seul
    expect(populationTier(26_000_001)).toBe('megalopoli');
    expect(populationTier(37_000_000)).toBe('megalopoli'); // Tokyo
  });

  it('sizeMultiplier ritorna il moltiplicatore della fascia', () => {
    expect(sizeMultiplier(330_000)).toBe(0.2); // Suva
    expect(sizeMultiplier(2_800_000)).toBe(0.3); // Vancouver
    expect(sizeMultiplier(4_300_000)).toBe(0.4); // Roma
    expect(sizeMultiplier(12_300_000)).toBe(0.56); // Parigi
    expect(sizeMultiplier(19_500_000)).toBe(0.76); // New York
    expect(sizeMultiplier(37_000_000)).toBe(1); // Tokyo
  });

  it('la fascia non decresce al crescere della popolazione (monotonìa)', () => {
    const order = ['cittadina', 'citta', 'metropoli', 'megacitta', 'metacitta', 'megalopoli'];
    let last = -1;
    for (const pop of [0, 1e6, 4e6, 10e6, 18e6, 27e6]) {
      const idx = order.indexOf(populationTier(pop));
      expect(idx).toBeGreaterThan(last);
      last = idx;
    }
  });
});
