import { describe, expect, it } from 'vitest';
import citiesData from '../data/cities.json';
import { CONFIG } from './config';
import type { CityResource, ResourceType } from './resources';
import { RESOURCE_TYPES } from './resources';
import { createNewGame } from './state';

interface CityRow {
  id: string;
  gdp_post_apoc_humt: number;
  resources: CityResource[];
}

const rows = citiesData as CityRow[];

describe('dataset cities.json (modello economico)', () => {
  it('contiene 50 città con 2-5 risorse ciascuna', () => {
    expect(rows).toHaveLength(50);
    for (const c of rows) {
      expect(c.resources.length).toBeGreaterThanOrEqual(2);
      expect(c.resources.length).toBeLessThanOrEqual(5);
    }
  });

  it('ogni risorsa ha tipo noto e amount in 0-100, senza tipi duplicati per città', () => {
    for (const c of rows) {
      const seen = new Set<ResourceType>();
      for (const r of c.resources) {
        expect(RESOURCE_TYPES).toContain(r.type);
        expect(r.amount).toBeGreaterThan(0);
        expect(r.amount).toBeLessThanOrEqual(100);
        expect(seen.has(r.type)).toBe(false);
        seen.add(r.type);
      }
    }
  });

  it('energia e finanza sono universali', () => {
    for (const c of rows) {
      const types = c.resources.map(r => r.type);
      expect(types).toContain('energia');
      expect(types).toContain('finanza');
    }
  });

  it('gdp_post_apoc_humt = Σ peso × amount (invariante dati ↔ pesi CONFIG)', () => {
    const weights = CONFIG.economy.resourceWeights;
    for (const c of rows) {
      const expected = c.resources.reduce((sum, r) => sum + weights[r.type] * r.amount, 0);
      expect(c.gdp_post_apoc_humt, c.id).toBe(Math.round(expected));
    }
  });
});

describe('risorse nello stato di gioco', () => {
  it('createNewGame copia le risorse dal dataset', () => {
    const s = createNewGame(1);
    const tokyo = s.cities.find(c => c.id === 'tokyo')!;
    const row = rows.find(c => c.id === 'tokyo')!;
    expect(tokyo.resources).toEqual(row.resources);
  });

  it('le risorse sono deep-copy: mutare una partita non tocca le successive', () => {
    const a = createNewGame(1);
    a.cities[0].resources[0].amount = 1;
    const b = createNewGame(1);
    expect(b.cities[0].resources[0].amount).not.toBe(1);
    expect(b.cities[0].resources[0]).toEqual(rows[0].resources[0]);
  });
});
