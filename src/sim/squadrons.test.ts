import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { progressTransfers, squadronCost, transferTicks } from './squadrons';
import { createNewGame } from './state';

function addSquadron(s: ReturnType<typeof createNewGame>, cityId: string) {
  s.squadrons.push({ id: s.nextSquadronId++, hp: CONFIG.squadron.hp, cityId, transfer: null });
}

describe('squadrons', () => {
  it('il costo (tutte le componenti) cresce con gli squadroni già presenti nella città', () => {
    const s = createNewGame(1);
    const base = CONFIG.squadron.baseCost;
    const res = CONFIG.squadron.resourceCost;
    expect(squadronCost(s, 'rome')).toEqual({ humt: base, resources: { ...res } });
    addSquadron(s, 'rome');
    expect(squadronCost(s, 'rome')).toEqual({
      humt: Math.round(base * 1.5),
      resources: {
        industria: Math.round(res.industria * 1.5),
        combustibili_fossili: Math.round(res.combustibili_fossili * 1.5),
      },
    });
    addSquadron(s, 'rome');
    expect(squadronCost(s, 'rome').humt).toBe(base * 2);
    expect(squadronCost(s, 'tokyo').humt).toBe(base); // altra città non influenzata
  });

  it('transferTicks: distanza/velocità in tick, minimo 1', () => {
    // 12000 km a 54000 km/giorno = 0.222 giorni × 20 tick = 4.44 → 5 tick (ceil)
    expect(transferTicks(12000)).toBe(5);
    expect(transferTicks(1)).toBe(1);
  });

  it('progressTransfers decrementa e completa il trasferimento', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    const sq = s.squadrons[0];
    sq.cityId = 'tokyo';
    sq.transfer = { fromCityId: 'rome', toCityId: 'tokyo', ticksRemaining: 2, totalTicks: 2, startFraction: 0 };
    progressTransfers(s);
    expect(sq.transfer?.ticksRemaining).toBe(1);
    progressTransfers(s);
    expect(sq.transfer).toBeNull();
    expect(sq.cityId).toBe('tokyo');
  });
});
