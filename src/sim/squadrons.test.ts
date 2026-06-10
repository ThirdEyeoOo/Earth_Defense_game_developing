import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { progressTransfers, squadronCost, transferTicks } from './squadrons';
import { createNewGame } from './state';

function addSquadron(s: ReturnType<typeof createNewGame>, cityId: string) {
  s.squadrons.push({ id: s.nextSquadronId++, hp: CONFIG.squadron.hp, cityId, transfer: null });
}

describe('squadrons', () => {
  it('il costo cresce con gli squadroni già presenti nella città', () => {
    const s = createNewGame(1);
    expect(squadronCost(s, 'rome')).toBe(500);
    addSquadron(s, 'rome');
    expect(squadronCost(s, 'rome')).toBe(750);
    addSquadron(s, 'rome');
    expect(squadronCost(s, 'rome')).toBe(1000);
    expect(squadronCost(s, 'tokyo')).toBe(500); // altra città non influenzata
  });

  it('transferTicks: distanza/velocità in tick, minimo 1', () => {
    // 12000 km a 24000 km/giorno = 0.5 giorni = 10 tick
    expect(transferTicks(12000)).toBe(10);
    expect(transferTicks(1)).toBe(1);
  });

  it('progressTransfers decrementa e completa il trasferimento', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    const sq = s.squadrons[0];
    sq.cityId = 'tokyo';
    sq.transfer = { fromCityId: 'rome', toCityId: 'tokyo', ticksRemaining: 2, totalTicks: 2 };
    progressTransfers(s);
    expect(sq.transfer?.ticksRemaining).toBe(1);
    progressTransfers(s);
    expect(sq.transfer).toBeNull();
    expect(sq.cityId).toBe('tokyo');
  });
});
