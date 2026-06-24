import { describe, expect, it } from 'vitest';
import {
  cmdBuildEmbassy,
  cmdBuildSquadron,
  cmdDamageSquadron,
  cmdDamageUfo,
  cmdFoundHq,
  cmdRelocateSquadron,
  cmdSetSpeed,
  cmdStartResearch,
} from './commands';
import { CONFIG } from './config';
import { embassyCost, isConnected } from './economy';
import { researchRate } from './researchTree';
import { squadronCost } from './squadrons';
import { createNewGame } from './state';
import { tick } from './tick';
import { spawnUfo } from './ufos';
import { grantRiches, newGameWithHq } from './testUtils';

describe('cmdFoundHq', () => {
  it('fonda il QG una tantum e accredita il kit di partenza', () => {
    const s = createNewGame(1);
    s.research.unlocked.push('quartier_gen'); // la fondazione è gated dietro la ricerca (gratis)
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
    s.research.unlocked.push('quartier_gen', 'collegamento'); // fondazione + ambasciate sbloccate
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
    // fondazione + catena fino a `caccia` (squadroni) sbloccate
    s.research.unlocked.push('quartier_gen', 'minigun', 'blindatura', 'caccia');
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
    const s = newGameWithHq(1, 'rome'); // sblocca tutto, blindatura compresa
    grantRiches(s);
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    const hp0 = sq.hp;
    cmdDamageSquadron(s, sq.id, 15);
    // la blindatura ricercata riduce ogni colpo di CONFIG.squadron.armor
    expect(sq.hp).toBe(hp0 - (15 - CONFIG.squadron.armor));
    cmdDamageSquadron(s, 999, 15); // id inesistente: no-op
    expect(s.squadrons).toHaveLength(1);
    cmdDamageSquadron(s, sq.id, hp0); // porta a ≤0 → distrutto
    expect(s.squadrons).toHaveLength(0);
  });
});

describe('cmdStartResearch e gating', () => {
  it('il Quartier Generale è gratis e istantaneo (researchHours 0) e abilita la fondazione', () => {
    const s = createNewGame(1);
    expect(cmdFoundHq(s, 'rome')).toEqual({ ok: false, code: 'researchLocked' });
    const r = cmdStartResearch(s, 'quartier_gen');
    expect(r.ok).toBe(true);
    expect(s.humt).toBe(0); // gratis: nessun costo
    expect(s.research.unlocked).toContain('quartier_gen'); // istantaneo: nessuna attesa
    expect(s.research.selected).toBeNull();
    expect(cmdFoundHq(s, 'rome').ok).toBe(true);
  });

  it('rifiuta placeholder/inesistenti/prereq mancanti; avvia a tempo e blocca se occupato', () => {
    const s = createNewGame(1);
    grantRiches(s);
    expect(cmdStartResearch(s, 'diplomazia')).toEqual({ ok: false, code: 'researchLocked' });
    expect(cmdStartResearch(s, 'inesistente')).toEqual({ ok: false, code: 'researchLocked' });
    expect(cmdStartResearch(s, 'caccia')).toEqual({ ok: false, code: 'researchPrereqMissing' });
    // un nodo a tempo diventa la ricerca SELEZIONATA, non subito sbloccata
    expect(cmdStartResearch(s, 'minigun').ok).toBe(true);
    expect(s.research.selected).toBe('minigun');
    expect(s.research.unlocked).not.toContain('minigun');
    // una seconda ricerca è rifiutata finché la prima non finisce
    expect(cmdStartResearch(s, 'blindatura')).toEqual({ ok: false, code: 'researchBusy' });
  });

  it('paga il costo all’avvio (rifiuto se le risorse non bastano, senza scalare nulla)', () => {
    const s = createNewGame(1);
    expect(cmdStartResearch(s, 'minigun')).toEqual({
      ok: false,
      code: 'insufficientHumt',
      params: { cost: 200 },
    });
    grantRiches(s);
    const humt = s.humt;
    expect(cmdStartResearch(s, 'minigun').ok).toBe(true);
    expect(s.humt).toBe(humt - 200);
    expect(s.resources.industria).toBe(9999 - 15);
    expect(s.resources.tecnologia).toBe(9999 - 10);
  });

  it('avanza nel tick al ritmo del QG e si completa', () => {
    const s = newGameWithHq(1);
    s.research.unlocked = [];
    s.research.selected = null;
    s.research.progress = 0;
    grantRiches(s);
    expect(cmdStartResearch(s, 'minigun').ok).toBe(true);
    // ritmo 1/ora (solo QG) × 1,2 ore/tick ⇒ 24 ore in 20 tick
    expect(researchRate(s)).toBe(1);
    for (let i = 0; i < 20; i++) tick(s);
    expect(s.research.unlocked).toContain('minigun');
    expect(s.research.selected).toBeNull();
  });

  it('i laboratori operativi accelerano la ricerca (researchRate)', () => {
    const s = newGameWithHq(1);
    expect(researchRate(s)).toBe(1); // solo QG
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.structures.push({ id: 1, cell: 0, type: 'lab', state: 'occupied', hp: 150, buildDoneTick: 0 });
    rome.structures.push({ id: 2, cell: 1, type: 'lab', state: 'building', hp: 150, buildDoneTick: 9 });
    expect(researchRate(s)).toBe(2); // QG + 1 lab operativo (quello in costruzione non conta)
  });

  it('gate squadroni e ambasciate dietro la ricerca', () => {
    const s = createNewGame(1);
    s.research.unlocked.push('quartier_gen');
    cmdFoundHq(s, 'rome');
    grantRiches(s);
    expect(cmdBuildSquadron(s, 'rome')).toEqual({ ok: false, code: 'researchLocked' });
    expect(cmdBuildEmbassy(s, 'paris')).toEqual({ ok: false, code: 'researchLocked' });
    s.research.unlocked.push('minigun', 'blindatura', 'caccia', 'collegamento');
    expect(cmdBuildSquadron(s, 'rome').ok).toBe(true);
    expect(cmdBuildEmbassy(s, 'paris').ok).toBe(true);
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
