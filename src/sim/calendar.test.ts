import { describe, expect, it } from 'vitest';
import { dateOfTick, dayOfTick } from './calendar';

describe('calendar', () => {
  it('20 tick = 1 giorno', () => {
    expect(dayOfTick(0)).toBe(0);
    expect(dayOfTick(19)).toBe(0);
    expect(dayOfTick(20)).toBe(1);
  });

  it('parte dal 1 gennaio 2026', () => {
    expect(dateOfTick(0).toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(dateOfTick(20 * 31).toISOString().slice(0, 10)).toBe('2026-02-01');
  });
});
