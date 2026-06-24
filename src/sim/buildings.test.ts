import { describe, expect, it } from 'vitest';
import {
  buildTicksFor,
  cellOccupied,
  gridCapacity,
  hexCells,
  structureCost,
  structureDef,
} from './buildings';
import {
  cmdBuildStructure,
  cmdDamageStructure,
  cmdRemoveStructure,
  cmdRepairStructure,
} from './commands';
import { CONFIG } from './config';
import { tick } from './tick';
import { grantRiches, newGameWithHq } from './testUtils';

describe('gridCapacity', () => {
  it('= baseSlots + 1 ogni popPerSlot abitanti', () => {
    const s = newGameWithHq(1);
    const rome = s.cities.find(c => c.id === 'rome')!;
    const b = CONFIG.buildings;
    expect(gridCapacity(rome)).toBe(b.baseSlots + Math.floor(rome.population / b.popPerSlot));
    rome.population = 0;
    expect(gridCapacity(rome)).toBe(b.baseSlots);
  });
});

describe('hexCells', () => {
  it('genera esattamente `capacity` celle con indici progressivi', () => {
    const cells = hexCells(10);
    expect(cells).toHaveLength(10);
    expect(cells.map(c => c.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    // righe dispari sfalsate: la cella 7 (riga 1) parte più a destra della cella 0 (riga 0)
    expect(cells[7].cx).toBeGreaterThan(cells[0].cx);
  });
});

describe('cmdBuildStructure', () => {
  it('paga il costo e crea la struttura in costruzione', () => {
    const s = newGameWithHq(1);
    grantRiches(s);
    const humtBefore = s.humt;
    const r = cmdBuildStructure(s, 'rome', 0, 'tower');
    expect(r.ok).toBe(true);
    const rome = s.cities.find(c => c.id === 'rome')!;
    expect(rome.structures).toHaveLength(1);
    const st = rome.structures[0];
    expect(st).toMatchObject({ cell: 0, type: 'tower', state: 'building' });
    expect(st.hp).toBe(structureDef('tower').hp);
    expect(st.buildDoneTick).toBe(s.tick + buildTicksFor('tower'));
    expect(s.humt).toBe(humtBefore - structureCost('tower').humt);
    expect(cellOccupied(rome, 0)).toBe(true);
  });

  it('rifiuta hardpoint occupati o fuori griglia', () => {
    const s = newGameWithHq(1);
    grantRiches(s);
    const rome = s.cities.find(c => c.id === 'rome')!;
    cmdBuildStructure(s, 'rome', 0, 'tower');
    expect(cmdBuildStructure(s, 'rome', 0, 'lab')).toEqual({ ok: false, code: 'cellUnavailable' });
    expect(cmdBuildStructure(s, 'rome', gridCapacity(rome), 'lab')).toEqual({
      ok: false,
      code: 'cellUnavailable',
    });
  });

  it('rifiuta città non collegata e ricerca mancante', () => {
    const s = newGameWithHq(1);
    grantRiches(s);
    expect(cmdBuildStructure(s, 'paris', 0, 'tower')).toEqual({
      ok: false,
      code: 'cityNotConnected',
    });
    s.research.unlocked = ['quartier_gen']; // niente nodo torre
    expect(cmdBuildStructure(s, 'rome', 0, 'tower')).toEqual({ ok: false, code: 'researchLocked' });
  });
});

describe('tick: completamento costruzione', () => {
  it('promuove building → occupied a buildDoneTick', () => {
    const s = newGameWithHq(1);
    grantRiches(s);
    cmdBuildStructure(s, 'rome', 0, 'tower');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const done = rome.structures[0].buildDoneTick;
    while (s.tick < done) {
      expect(rome.structures[0].state).toBe('building');
      tick(s);
    }
    expect(rome.structures[0].state).toBe('occupied');
  });
});

describe('cmdRepairStructure / cmdRemoveStructure', () => {
  it('ripara solo le strutture danneggiate e scala il costo ridotto', () => {
    const s = newGameWithHq(1);
    grantRiches(s);
    cmdBuildStructure(s, 'rome', 0, 'tower');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const st = rome.structures[0];
    expect(cmdRepairStructure(s, 'rome', st.id)).toEqual({ ok: false, code: 'cannotRepair' });
    st.state = 'damaged';
    st.hp = 0;
    const humtBefore = s.humt;
    const r = cmdRepairStructure(s, 'rome', st.id);
    expect(r.ok).toBe(true);
    expect(st.state).toBe('occupied');
    expect(st.hp).toBe(structureDef('tower').hp);
    const repairHumt = Math.round(structureCost('tower').humt * CONFIG.buildings.repairCostFactor);
    expect(s.humt).toBe(humtBefore - repairHumt);
  });

  it('il danno porta la torre a "damaged" (inattiva) a HP esauriti, non la distrugge', () => {
    const s = newGameWithHq(1);
    grantRiches(s);
    cmdBuildStructure(s, 'rome', 0, 'tower');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const st = rome.structures[0];
    st.state = 'occupied'; // operativa (saltiamo l'attesa di costruzione)
    const hp0 = st.hp;
    cmdDamageStructure(s, 'rome', st.id, 10);
    expect(st.hp).toBe(hp0 - 10);
    expect(st.state).toBe('occupied');
    cmdDamageStructure(s, 'rome', st.id, 9999);
    expect(st.hp).toBe(0);
    expect(st.state).toBe('damaged');
    expect(rome.structures).toHaveLength(1); // non rimossa
    // una struttura non operativa non subisce altro danno
    cmdDamageStructure(s, 'rome', st.id, 50);
    expect(st.hp).toBe(0);
  });

  it('demolisce una struttura e segnala id inesistenti', () => {
    const s = newGameWithHq(1);
    grantRiches(s);
    cmdBuildStructure(s, 'rome', 0, 'tower');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const id = rome.structures[0].id;
    expect(cmdRemoveStructure(s, 'rome', 999)).toEqual({ ok: false, code: 'structureNotFound' });
    expect(cmdRemoveStructure(s, 'rome', id)).toEqual({ ok: true });
    expect(rome.structures).toHaveLength(0);
  });
});
