import { describe, expect, it } from 'vitest';
import { applyDailyEconomy, dailyIncome } from './economy';
import { createNewGame, worldPopulation } from './state';

describe('economy', () => {
  it('reddito = popolazione viva in milioni × aliquota, arrotondato', () => {
    const s = createNewGame(1);
    expect(dailyIncome(s)).toBe(Math.round(worldPopulation(s) / 1_000_000));
  });

  it('le città distrutte non pagano tasse', () => {
    const s = createNewGame(1);
    const before = dailyIncome(s);
    const tokyo = s.cities.find(c => c.id === 'tokyo')!;
    tokyo.alive = false;
    expect(dailyIncome(s)).toBe(before - Math.round(tokyo.population / 1_000_000));
  });

  it('applyDailyEconomy accredita il reddito', () => {
    const s = createNewGame(1);
    const credits = s.credits;
    applyDailyEconomy(s);
    expect(s.credits).toBe(credits + dailyIncome(s));
  });
});
