import { afterEach, describe, expect, it as test } from 'vitest';
import cities from '../data/cities.json';
import {
  cityName,
  countryName,
  detectLanguage,
  getLanguage,
  getLocale,
  onLanguageChange,
  regionName,
  setLanguage,
  t,
} from './index';
import { en } from './en';
import { it } from './it';

afterEach(() => setLanguage('it')); // lo stato del modulo è condiviso tra i test

describe('dizionari', () => {
  test('en copre esattamente le chiavi di it', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(it).sort());
  });

  test('i placeholder {x} coincidono tra it e en per ogni chiave', () => {
    const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();
    for (const key of Object.keys(it) as Array<keyof typeof it>) {
      expect(placeholders(en[key]), `chiave ${key}`).toEqual(placeholders(it[key]));
    }
  });

  test('ogni città di cities.json ha la sua chiave e il valore it coincide col dato', () => {
    for (const city of cities) {
      const key = `city.${city.id}` as keyof typeof it;
      expect(it[key], `manca city.${city.id}`).toBeDefined();
      expect(it[key]).toBe(city.name);
    }
  });

  test('ogni paese di cities.json ha la sua chiave', () => {
    for (const country of new Set(cities.map(c => c.country))) {
      expect(it[`country.${country}` as keyof typeof it], `manca country.${country}`).toBeDefined();
    }
  });
});

describe('t()', () => {
  test('interpola i parametri', () => {
    expect(t('cmd.insufficientCredits', { cost: 500 })).toBe('Crediti insufficienti (servono 500)');
  });

  test('lascia intatti i placeholder senza parametro', () => {
    expect(t('hud.nextWave', { altro: 1 })).toBe('Prossima ondata: {days}g');
  });

  test('chiave senza parametri restituita così com’è', () => {
    expect(t('banner.gameSaved')).toBe('Partita salvata');
  });
});

describe('lingua', () => {
  test('setLanguage cambia traduzioni e locale', () => {
    expect(getLocale()).toBe('it-IT');
    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(getLocale()).toBe('en-US');
    expect(t('hud.save')).toBe('Save');
    expect(t('cmd.insufficientCredits', { cost: 500 })).toBe('Insufficient credits (500 needed)');
  });

  test('onLanguageChange notifica una volta per cambio e l’unsubscribe funziona', () => {
    let calls = 0;
    const off = onLanguageChange(() => calls++);
    setLanguage('en');
    setLanguage('en'); // nessun cambio: nessuna notifica
    expect(calls).toBe(1);
    off();
    setLanguage('it');
    expect(calls).toBe(1);
  });

  test('detectLanguage: it solo per browser italiani', () => {
    expect(detectLanguage('it-IT')).toBe('it');
    expect(detectLanguage('it')).toBe('it');
    expect(detectLanguage('en-GB')).toBe('en');
    expect(detectLanguage('fr-FR')).toBe('en');
  });
});

describe('helper nomi dinamici', () => {
  test('cityName/countryName/regionName traducono e hanno fallback', () => {
    setLanguage('en');
    expect(cityName('beijing', 'Pechino')).toBe('Beijing');
    expect(countryName('Regno Unito')).toBe('United Kingdom');
    expect(regionName('middle-east')).toBe('Middle East');
    expect(cityName('atlantide', 'Atlantide')).toBe('Atlantide');
    expect(countryName('Mu')).toBe('Mu');
    expect(regionName('antartide')).toBe('antartide');
  });
});
