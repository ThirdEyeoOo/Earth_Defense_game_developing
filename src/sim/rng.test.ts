import { describe, expect, it } from 'vitest';
import { pickWeighted, rngNext, stateRand } from './rng';

describe('rng', () => {
  it('è deterministico: stesso seed, stessa sequenza', () => {
    const a1 = rngNext(42);
    const a2 = rngNext(42);
    expect(a1).toEqual(a2);
    expect(a1.value).toBeGreaterThanOrEqual(0);
    expect(a1.value).toBeLessThan(1);
    expect(a1.seed).not.toBe(42);
  });

  it('stateRand avanza il seed nello stato', () => {
    const s = { seed: 7 };
    const v1 = stateRand(s);
    const v2 = stateRand(s);
    expect(v1).not.toBe(v2);
  });

  it('pickWeighted sceglie sempre tra gli elementi e rispetta pesi estremi', () => {
    const s = { seed: 1 };
    const items = [{ w: 0 }, { w: 100 }];
    for (let i = 0; i < 20; i++) {
      expect(pickWeighted(s, items, x => x.w)).toBe(items[1]);
    }
  });
});
