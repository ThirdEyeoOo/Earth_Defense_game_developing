import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import {
  applyDailyEconomy,
  cityIncomePerDay,
  cityPotential,
  cityProductionPerDay,
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

// output(città) = (popolazione × potenziale)^outputExponent (curva unica, vedi economy.ts)
function output(population: number, potential: number): number {
  return Math.pow(population * potential, CONFIG.economy.outputExponent);
}

describe('economia HumT', () => {
  it('senza QG nessuna città è collegata: zero entrate e produzione', () => {
    const s = createNewGame(1);
    expect(s.cities.some(c => isConnected(s, c))).toBe(false);
    expect(dailyIncome(s)).toBe(0);
    expect(Object.values(dailyProductionByType(s)).every(v => v === 0)).toBe(true);
  });

  it('gettito città = incomeCoeff × (pop × potenziale)^outputExponent', () => {
    const s = newGameWithHq(1, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const e = CONFIG.economy;
    const pot = cityPotential(rome);
    expect(cityIncomePerDay(rome)).toBeCloseTo(e.incomeCoeff * output(rome.population, pot));
    expect(dailyIncome(s)).toBeCloseTo(cityIncomePerDay(rome)); // float, non arrotondato
  });

  it('il gettito cresce con la popolazione attuale (niente initialPopulation)', () => {
    const s = newGameWithHq(1, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const base = cityIncomePerDay(rome);
    // dimezzare la popolazione abbassa il gettito (sublineare, non più 1:1)
    rome.population = rome.initialPopulation / 2;
    expect(cityIncomePerDay(rome)).toBeLessThan(base);
    // crescere OLTRE la popolazione iniziale aumenta il gettito: nessun tetto su initialPopulation
    rome.population = rome.initialPopulation * 3;
    expect(cityIncomePerDay(rome)).toBeGreaterThan(base);
  });

  it('ancoraggi della curva: Shanghai ≈ 25, Suva ≈ 1, beni di Tokyo ≈ 18', () => {
    const s = createNewGame(1);
    const shanghai = s.cities.find(c => c.id === 'shanghai')!;
    const suva = s.cities.find(c => c.id === 'suva')!;
    const tokyo = s.cities.find(c => c.id === 'tokyo')!;
    expect(cityIncomePerDay(shanghai)).toBeCloseTo(25, 0); // città col max pop·potenziale
    expect(cityIncomePerDay(suva)).toBeCloseTo(1, 1); // città col min pop·potenziale
    const tokyoGoods = Object.values(cityProductionPerDay(tokyo)).reduce((a, b) => a + b, 0);
    expect(tokyoGoods).toBeCloseTo(18.1, 0);
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

  it('produzione per tipo = productionCoeff × output × (amount / potenziale); somma = totale beni', () => {
    const s = newGameWithHq(1, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const pot = cityPotential(rome);
    const total = CONFIG.economy.productionCoeff * output(rome.population, pot);
    const prod = cityProductionPerDay(rome);
    for (const r of rome.resources) {
      expect(prod[r.type]).toBeCloseTo((total * r.amount) / pot);
    }
    const sum = Object.values(prod).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(total);
    // la stessa città dà gli stessi beni nel totale globale, se è l'unica collegata
    const byType = dailyProductionByType(s);
    expect(Object.values(byType).reduce((a, b) => a + b, 0)).toBeCloseTo(total);
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
    const prod = cityProductionPerDay(rome);
    for (const r of rome.resources) {
      expect(s.resources[r.type] - before[r.type]).toBeCloseTo(prod[r.type]!);
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
