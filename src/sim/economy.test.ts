import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { sizeMultiplier } from './population';
import {
  applyDailyEconomy,
  cityIncomePerDay,
  dailyIncome,
  dailyProductionByType,
  embassyCost,
  isConnected,
  nearestConnectedKm,
  underAbduction,
} from './economy';
import { createNewGame } from './state';
import { newGameWithHq } from './testUtils';
import { spawnUfo } from './ufos';

describe('economia HumT', () => {
  it('senza QG nessuna città è collegata: zero entrate e produzione', () => {
    const s = createNewGame(1);
    expect(s.cities.some(c => isConnected(s, c))).toBe(false);
    expect(dailyIncome(s)).toBe(0);
    expect(Object.values(dailyProductionByType(s)).every(v => v === 0)).toBe(true);
  });

  it('gettito città = potenziale × popFactor × sizeMultiplier × aliquota / cycleDays', () => {
    const s = newGameWithHq(1, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const e = CONFIG.economy;
    const pot = rome.resources.reduce((sum, r) => sum + r.amount, 0); // somma non pesata
    const sm = sizeMultiplier(rome.population);
    expect(cityIncomePerDay(rome)).toBeCloseTo((pot * sm * e.taxRatePerDay) / e.cycleDays);
    expect(dailyIncome(s)).toBeCloseTo(cityIncomePerDay(rome)); // float, non arrotondato
    // dimezzare la popolazione dimezza il popFactor E può abbassare la fascia
    rome.population = rome.initialPopulation / 2;
    const sm2 = sizeMultiplier(rome.population);
    expect(cityIncomePerDay(rome)).toBeCloseTo((pot * 0.5 * sm2 * e.taxRatePerDay) / e.cycleDays);
  });

  it('producono solo le città collegate (QG + ambasciate), non le neutrali o distrutte', () => {
    const s = newGameWithHq(1, 'rome');
    const before = dailyIncome(s);
    const paris = s.cities.find(c => c.id === 'paris')!;
    paris.embassy = true;
    expect(dailyIncome(s)).toBeCloseTo(before + cityIncomePerDay(paris));
    paris.alive = false;
    expect(dailyIncome(s)).toBeCloseTo(before);
  });

  it('produzione giornaliera = amount × popFactor × sizeMultiplier / cycleDays, per tipo', () => {
    const s = newGameWithHq(1, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const sm = sizeMultiplier(rome.population);
    const prod = dailyProductionByType(s);
    for (const r of rome.resources) {
      expect(prod[r.type]).toBeCloseTo((r.amount * sm) / CONFIG.economy.cycleDays);
    }
  });

  it('un rapimento attivo sospende produzione e gettito della città', () => {
    const s = newGameWithHq(1, 'rome');
    spawnUfo(s, 'rome');
    const ufo = s.ufos[0];
    ufo.phase = 'abducting';
    expect(underAbduction(s, 'rome')).toBe(true);
    expect(dailyIncome(s)).toBe(0);
    expect(Object.values(dailyProductionByType(s)).every(v => v === 0)).toBe(true);
    ufo.phase = 'escaping';
    expect(underAbduction(s, 'rome')).toBe(false);
    expect(dailyIncome(s)).toBeGreaterThan(0);
  });

  it('applyDailyEconomy accredita HumT e riempie il magazzino', () => {
    const s = newGameWithHq(1, 'rome');
    const humt = s.humt;
    const before = { ...s.resources }; // il kit di partenza è già nel magazzino
    applyDailyEconomy(s);
    expect(s.humt).toBe(humt + dailyIncome(s));
    const rome = s.cities.find(c => c.id === 'rome')!;
    const sm = sizeMultiplier(rome.population);
    for (const r of rome.resources) {
      expect(s.resources[r.type] - before[r.type]).toBeCloseTo(
        (r.amount * sm) / CONFIG.economy.cycleDays,
      );
    }
  });

  it("il costo dell'ambasciata cresce con la distanza dalla rete", () => {
    const s = newGameWithHq(1, 'rome');
    const e = CONFIG.economy.embassy;
    // Roma→Parigi ~1100 km, Roma→Tokyo ~9900 km
    const paris = embassyCost(s, 'paris');
    const tokyo = embassyCost(s, 'tokyo');
    expect(nearestConnectedKm(s, 'paris')).toBeGreaterThan(1000);
    expect(nearestConnectedKm(s, 'paris')).toBeLessThan(1300);
    expect(paris.humt).toBe(
      Math.round(e.baseHumt * (1 + nearestConnectedKm(s, 'paris') / e.distanceDivisorKm)),
    );
    expect(tokyo.humt).toBeGreaterThan(paris.humt);
    expect(tokyo.resources.agroalimentare!).toBeGreaterThan(paris.resources.agroalimentare!);
    // una rete più estesa avvicina le ambasciate successive (Londra dista meno da Parigi)
    const londonFromRome = embassyCost(s, 'london').humt;
    s.cities.find(c => c.id === 'paris')!.embassy = true;
    expect(embassyCost(s, 'london').humt).toBeLessThan(londonFromRome);
  });
});
