import { describe, expect, it as test } from 'vitest';
import { en } from '../i18n/en';
import { it } from '../i18n/it';
import {
  RESEARCH_BRANCH_ORDER,
  RESEARCH_CANVAS,
  RESEARCH_TREE,
  type ResearchNode,
} from './researchTree';

const byId = new Map(RESEARCH_TREE.map(n => [n.id, n] as const));

describe('albero della ricerca (struttura)', () => {
  test('gli id dei nodi sono unici', () => {
    expect(byId.size).toBe(RESEARCH_TREE.length);
  });

  test('ogni prerequisito punta a un nodo esistente e diverso da sé', () => {
    for (const node of RESEARCH_TREE) {
      for (const pre of node.prereqs) {
        expect(byId.has(pre), `${node.id} → prereq inesistente ${pre}`).toBe(true);
        expect(pre, `${node.id} dipende da sé stesso`).not.toBe(node.id);
      }
    }
  });

  test('il grafo dei prerequisiti è aciclico (è un DAG)', () => {
    const state = new Map<string, 0 | 1 | 2>(); // 0/undef = bianco, 1 = grigio, 2 = nero
    const hasCycle = (node: ResearchNode): boolean => {
      if (state.get(node.id) === 1) return true;
      if (state.get(node.id) === 2) return false;
      state.set(node.id, 1);
      for (const pre of node.prereqs) {
        if (hasCycle(byId.get(pre)!)) return true;
      }
      state.set(node.id, 2);
      return false;
    };
    for (const node of RESEARCH_TREE) {
      expect(hasCycle(node), `ciclo a partire da ${node.id}`).toBe(false);
    }
  });

  test('ogni nodo appartiene a un ramo previsto e ha coordinate nel canvas', () => {
    for (const node of RESEARCH_TREE) {
      expect(RESEARCH_BRANCH_ORDER, `ramo ignoto per ${node.id}`).toContain(node.branch);
      expect(node.pos.x).toBeGreaterThanOrEqual(0);
      expect(node.pos.x).toBeLessThanOrEqual(RESEARCH_CANVAS.width);
      expect(node.pos.y).toBeGreaterThanOrEqual(0);
      expect(node.pos.y).toBeLessThanOrEqual(RESEARCH_CANVAS.height);
    }
  });

  test('un prerequisito non sta in un tier superiore al nodo che lo richiede', () => {
    for (const node of RESEARCH_TREE) {
      for (const pre of node.prereqs) {
        expect(byId.get(pre)!.tier, `${pre} (tier) deve precedere ${node.id}`).toBeLessThan(
          node.tier,
        );
      }
    }
  });

  test('ogni nodo ha le chiavi i18n titolo/descrizione in it ed en', () => {
    for (const node of RESEARCH_TREE) {
      for (const key of [node.titleKey, node.descKey]) {
        expect(it[key as keyof typeof it], `manca ${key} in it`).toBeDefined();
        expect(en[key as keyof typeof en], `manca ${key} in en`).toBeDefined();
      }
    }
  });

  test('ogni ramo presente ha la sua etichetta i18n', () => {
    for (const branch of RESEARCH_BRANCH_ORDER) {
      const key = `tech.branch.${branch}` as keyof typeof it;
      expect(it[key], `manca ${key} in it`).toBeDefined();
      expect(en[key as keyof typeof en], `manca ${key} in en`).toBeDefined();
    }
  });
});
