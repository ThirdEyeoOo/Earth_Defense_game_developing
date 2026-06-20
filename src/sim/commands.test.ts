import { describe, expect, it } from 'vitest';
import {
  cmdBuildEmbassy,
  cmdBuildSquadron,
  cmdDamageSquadron,
  cmdDamageUfo,
  cmdFoundHq,
  cmdRelocateSquadron,
  cmdSetSpeed,
} from './commands';
import { CONFIG } from './config';
import { embassyCost, isConnected } from './economy';
import { squadronCost } from './squadrons';
import { createNewGame } from './state';
import { spawnUfo } from './ufos';
import { grantRiches, newGameWithHq } from './testUtils';

describe('cmdFoundHq', () => {
  it('fonda il QG una tantum e accredita il kit di partenza', () => {
    const s = createNewGame(1);
    expect(s.humt).toBe(0);
    const r = cmdFoundHq(s, 'rome');
    expect(r.ok).toBe(true);
    expect(s.hqCityId).toBe('rome');
    const kit = CONFIG.economy.starterKit;
    expect(s.humt).toBe(kit.humt);
    expect(s.resources.industria).toBe(kit.resources.industria);
    expect(s.resources.combustibili_fossili).toBe(kit.resources.combustibili_fossili);
    expect(s.resources.agroalimentare).toBe(kit.resources.agroalimentare);
    expect(isConnected(s, s.cities.find(c => c.id === 'rome')!)).toBe(true);
    // una seconda fondazione è rifiutata
    expect(cmdFoundHq(s, 'paris')).toEqual({ ok: false, code: 'hqAlreadyFounded' });
    expect(s.hqCityId).toBe('rome');
  });

  it('rifiuta città inesistenti o distrutte', () => {
    const s = createNewGame(1);
    expect(cmdFoundHq(s, 'atlantide')).toEqual({ ok: false, code: 'cityUnavailable' });
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.alive = false;
    expect(cmdFoundHq(s, 'rome')).toEqual({ ok: false, code: 'cityUnavailable' });
    expect(s.hqCityId).toBeNull();
  });
});

describe('cmdBuildEmbassy', () => {
  it('collega la città scalando HumT e agroalimentare', () => {
    const s = newGameWithHq(1, 'rome');
    grantRiches(s);
    const cost = embassyCost(s, 'paris');
    const humt = s.humt;
    const agro = s.resources.agroalimentare;
    const r = cmdBuildEmbassy(s, 'paris');
    expect(r.ok).toBe(true);
    expect(s.humt).toBe(humt - cost.humt);
    expect(s.resources.agroalimentare).toBe(agro - cost.resources.agroalimentare!);
    expect(s.cities.find(c => c.id === 'paris')!.embassy).toBe(true);
  });

  it('rifiuta senza QG, su città già collegate e senza fondi', () => {
    const s = createNewGame(1);
    expect(cmdBuildEmbassy(s, 'paris')).toEqual({ ok: false, code: 'hqNotFounded' });
    cmdFoundHq(s, 'rome');
    expect(cmdBuildEmbassy(s, 'rome')).toEqual({ ok: false, code: 'alreadyConnected' });
    const cost = embassyCost(s, 'paris');
    s.humt = cost.humt - 1;
    expect(cmdBuildEmbassy(s, 'paris')).toEqual({
      ok: false,
      code: 'insufficientHumt',
      params: { cost: cost.humt },
    });
    s.humt = 9999;
    s.resources.agroalimentare = 0;
    expect(cmdBuildEmbassy(s, 'paris')).toEqual({
      ok: false,
      code: 'insufficientResources',
      params: { type: 'agroalimentare', amount: cost.resources.agroalimentare! },
    });
    expect(s.humt).toBe(9999); // un rifiuto non scala nulla
    grantRiches(s);
    cmdBuildEmbassy(s, 'paris');
    expect(cmdBuildEmbassy(s, 'paris')).toEqual({ ok: false, code: 'alreadyConnected' });
  });
});

describe('cmdBuildSquadron', () => {
  it('costruisce scalando il costo composito (HumT + industria + combustibili)', () => {
    const s = newGameWithHq(1, 'rome');
    // il kit di partenza basta esattamente per il primo squadrone
    const cost = squadronCost(s, 'rome');
    const humt = s.humt;
    const ind = s.resources.industria;
    const fuel = s.resources.combustibili_fossili;
    const r = cmdBuildSquadron(s, 'rome');
    expect(r.ok).toBe(true);
    expect(s.humt).toBe(humt - cost.humt);
    expect(s.resources.industria).toBe(ind - cost.resources.industria!);
    expect(s.resources.combustibili_fossili).toBe(fuel - cost.resources.combustibili_fossili!);
    expect(s.squadrons).toHaveLength(1);
    expect(s.squadrons[0].cityId).toBe('rome');
  });

  it('rifiuta senza QG, fondi insufficienti e città non valide', () => {
    const s = createNewGame(1);
    expect(cmdBuildSquadron(s, 'rome')).toEqual({ ok: false, code: 'hqNotFounded' });
    cmdFoundHq(s, 'rome');
    s.humt = 100;
    expect(cmdBuildSquadron(s, 'rome')).toEqual({
      ok: false,
      code: 'insufficientHumt',
      params: { cost: CONFIG.squadron.baseCost },
    });
    grantRiches(s);
    s.resources.industria = 0;
    expect(cmdBuildSquadron(s, 'rome')).toEqual({
      ok: false,
      code: 'insufficientResources',
      params: { type: 'industria', amount: CONFIG.squadron.resourceCost.industria },
    });
    grantRiches(s);
    expect(cmdBuildSquadron(s, 'atlantide')).toEqual({ ok: false, code: 'cityUnavailable' });
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.alive = false;
    expect(cmdBuildSquadron(s, 'rome')).toEqual({ ok: false, code: 'cityUnavailable' });
    expect(s.squadrons).toHaveLength(0);
  });
});

describe('cmdRelocateSquadron', () => {
  it('avvia il trasferimento con durata da distanza', () => {
    const s = newGameWithHq(1, 'rome');
    grantRiches(s);
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    const r = cmdRelocateSquadron(s, sq.id, 'tokyo');
    expect(r.ok).toBe(true);
    expect(sq.cityId).toBe('tokyo');
    expect(sq.transfer).not.toBeNull();
    expect(sq.transfer!.fromCityId).toBe('rome');
    expect(sq.transfer!.ticksRemaining).toBeGreaterThan(1); // Roma-Tokyo è lontana
    expect(sq.transfer!.startFraction).toBe(0); // default senza tickFraction
  });

  it('memorizza la frazione di tick di partenza (rotta dalla città, non a metà arco)', () => {
    const s = newGameWithHq(1, 'rome');
    grantRiches(s);
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    cmdRelocateSquadron(s, sq.id, 'tokyo', 0.7);
    expect(sq.transfer!.startFraction).toBe(0.7);
  });

  it('rifiuta se già in volo, destinazione uguale o non valida', () => {
    const s = newGameWithHq(1, 'rome');
    grantRiches(s);
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    expect(cmdRelocateSquadron(s, sq.id, 'rome')).toEqual({ ok: false, code: 'sameCity' });
    expect(cmdRelocateSquadron(s, 999, 'tokyo')).toEqual({ ok: false, code: 'squadronNotFound' });
    const tokyo = s.cities.find(c => c.id === 'tokyo')!;
    tokyo.alive = false;
    expect(cmdRelocateSquadron(s, sq.id, 'tokyo')).toEqual({
      ok: false,
      code: 'destinationUnavailable',
    });
    tokyo.alive = true;
    cmdRelocateSquadron(s, sq.id, 'tokyo');
    expect(cmdRelocateSquadron(s, sq.id, 'paris')).toEqual({
      ok: false,
      code: 'squadronInTransfer',
    }); // già in volo
  });

  it("l'evacuazione da una città distrutta è permessa", () => {
    const s = newGameWithHq(1, 'rome');
    grantRiches(s);
    cmdBuildSquadron(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.population = 0;
    rome.alive = false;
    const r = cmdRelocateSquadron(s, s.squadrons[0].id, 'paris');
    expect(r.ok).toBe(true);
    expect(s.squadrons[0].cityId).toBe('paris');
  });
});

describe('cmdSetSpeed', () => {
  it('cambia la velocità', () => {
    const s = createNewGame(1);
    expect(cmdSetSpeed(s, 5).ok).toBe(true);
    expect(s.speed).toBe(5);
    cmdSetSpeed(s, 0);
    expect(s.speed).toBe(0);
    cmdSetSpeed(s, 25);
    expect(s.speed).toBe(25);
  });
});

describe('cmdDamageSquadron', () => {
  it('sottrae gli HP e rimuove lo squadrone a 0 (no-op se id assente)', () => {
    const s = newGameWithHq(1, 'rome');
    grantRiches(s);
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    const hp0 = sq.hp;
    cmdDamageSquadron(s, sq.id, 15);
    expect(sq.hp).toBe(hp0 - 15);
    cmdDamageSquadron(s, 999, 15); // id inesistente: no-op
    expect(s.squadrons).toHaveLength(1);
    cmdDamageSquadron(s, sq.id, hp0); // porta a ≤0 → distrutto
    expect(s.squadrons).toHaveLength(0);
  });
});

describe('cmdDamageUfo', () => {
  it("sottrae gli HP dell'UFO senza abbatterlo sopra zero (no-op se id assente)", () => {
    const s = newGameWithHq(1, 'rome');
    spawnUfo(s, 'rome');
    const ufo = s.ufos[0];
    const hp0 = ufo.hp;
    cmdDamageUfo(s, ufo.id, 10);
    expect(s.ufos[0].hp).toBe(hp0 - 10);
    expect(s.stats.ufosShotDown).toBe(0);
    cmdDamageUfo(s, 999, 10); // id inesistente: no-op
    expect(s.ufos).toHaveLength(1);
  });

  it('a HP≤0 abbatte (shotDown) e rimuove dalla scena', () => {
    const s = newGameWithHq(1, 'rome');
    spawnUfo(s, 'rome');
    const ufo = s.ufos[0];
    cmdDamageUfo(s, ufo.id, ufo.hp);
    expect(s.ufos).toHaveLength(0);
    expect(s.stats.ufosShotDown).toBe(1);
  });
});
