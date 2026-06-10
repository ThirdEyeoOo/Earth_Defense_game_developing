import { describe, expect, it } from 'vitest';
import { clockOfTick, dateOfTick, dayOfTick } from './calendar';

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

  it('clockOfTick: orario nel giorno, anche con tick frazionari', () => {
    expect(clockOfTick(0)).toEqual({ hour: 0, minute: 0 });
    expect(clockOfTick(10)).toEqual({ hour: 12, minute: 0 });
    expect(clockOfTick(5.5)).toEqual({ hour: 6, minute: 36 });
    expect(clockOfTick(20)).toEqual({ hour: 0, minute: 0 }); // giorno nuovo
    expect(clockOfTick(45)).toEqual({ hour: 6, minute: 0 }); // tick 45 = giorno 2 + 5 tick
  });
});
