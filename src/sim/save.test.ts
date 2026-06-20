import { describe, expect, it } from 'vitest';
import citiesData from '../data/cities.json';
import { CONFIG } from './config';
import { cmdBuildSquadron } from './commands';
import { deserialize, serialize } from './save';
import type { GameState } from './state';
import { grantRiches, newGameWithHq } from './testUtils';
import { tick } from './tick';
import { spawnUfo } from './ufos';

// riporta un salvataggio v4 alla forma v3 (com'era prima del rehaul economico)
function downgradeToV3(state: GameState): Record<string, any> {
  const raw = JSON.parse(serialize(state));
  raw.version = 3;
  raw.credits = raw.humt;
  delete raw.humt;
  delete raw.resources;
  delete raw.hqCityId;
  for (const c of raw.cities) {
    delete c.resources;
    delete c.embassy;
  }
  return raw;
}

describe('save', () => {
  it('roundtrip: salva → carica → la partita prosegue identica', () => {
    const s = newGameWithHq(11);
    for (let i = 0; i < 250; i++) tick(s);
    const loaded = deserialize(serialize(s))!;
    expect(loaded).toEqual(s);
    // entrambe proseguono identiche
    for (let i = 0; i < 100; i++) {
      tick(s);
      tick(loaded);
    }
    expect(loaded).toEqual(s);
  });

  it('la fase di fondazione (hqCityId null) è salvabile e ricaricabile', () => {
    const s = newGameWithHq(5);
    s.hqCityId = null; // come una nuova partita salvata prima della fondazione
    const loaded = deserialize(serialize(s))!;
    expect(loaded.hqCityId).toBeNull();
    tick(loaded); // resta congelata
    expect(loaded.tick).toBe(s.tick);
  });

  it('rifiuta JSON corrotto', () => {
    expect(deserialize('{non-json')).toBeNull();
    expect(deserialize('{"a":1}')).toBeNull();
  });

  it('rifiuta versioni future', () => {
    const s = newGameWithHq(1);
    const raw = JSON.parse(serialize(s));
    raw.version = CONFIG.saveVersion + 1;
    expect(deserialize(JSON.stringify(raw))).toBeNull();
  });

  it('migra i salvataggi v1: gli UFO acquisiscono spawnDir', () => {
    const s = newGameWithHq(7);
    spawnUfo(s, 'rome');
    const raw = downgradeToV3(s);
    raw.version = 1;
    for (const u of raw.ufos) delete u.spawnDir; // com'era in v1
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(CONFIG.saveVersion);
    const d = loaded.ufos[0].spawnDir;
    expect(Math.hypot(d.x, d.y, d.z)).toBeCloseTo(1);
    // la partita migrata prosegue senza errori
    for (let i = 0; i < 50; i++) tick(loaded);
  });

  it('migra i salvataggi v2: nascono registro eventi e abductedTotal', () => {
    const s = newGameWithHq(13);
    for (let i = 0; i < 250; i++) tick(s);
    const raw = downgradeToV3(s);
    raw.version = 2;
    delete raw.events;
    delete raw.nextEventId;
    delete raw.stats.abductedTotal; // com'era in v2
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(CONFIG.saveVersion);
    expect(loaded.events).toEqual([]);
    expect(loaded.nextEventId).toBe(1);
    expect(loaded.stats.abductedTotal).toBe(0);
    expect(loaded.stats.ufosShotDown).toBe(s.stats.ufosShotDown);
    expect(loaded.stats.populationLost).toBe(s.stats.populationLost);
    // la partita migrata prosegue senza errori
    for (let i = 0; i < 50; i++) tick(loaded);
  });

  it('migra i salvataggi v3: credits→humt, città vive collegate, QG dagli squadroni', () => {
    const s = newGameWithHq(17);
    grantRiches(s);
    cmdBuildSquadron(s, 'paris');
    cmdBuildSquadron(s, 'paris');
    cmdBuildSquadron(s, 'tokyo');
    const dead = s.cities.find(c => c.id === 'suva')!;
    dead.alive = false;
    const raw = downgradeToV3(s);
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(CONFIG.saveVersion);
    expect(loaded.humt).toBe(raw.credits); // 1:1
    expect((loaded as any).credits).toBeUndefined();
    // tutte le vive collegate, le morte no
    expect(loaded.cities.filter(c => c.alive).every(c => c.embassy)).toBe(true);
    expect(loaded.cities.find(c => c.id === 'suva')!.embassy).toBe(false);
    // QG = città con più squadroni (Parigi: 2)
    expect(loaded.hqCityId).toBe('paris');
    // risorse città reidratate dal dataset, magazzino a zero
    const romeData = (citiesData as any[]).find(c => c.id === 'rome')!;
    expect(loaded.cities.find(c => c.id === 'rome')!.resources).toEqual(romeData.resources);
    expect(Object.values(loaded.resources).every(v => v === 0)).toBe(true);
    // la partita migrata prosegue senza errori
    for (let i = 0; i < 50; i++) tick(loaded);
  });

  it('migrazione v3 senza squadroni: QG alla città viva più popolosa', () => {
    const s = newGameWithHq(19);
    const raw = downgradeToV3(s);
    raw.squadrons = [];
    const mostPopulous = [...raw.cities]
      .filter((c: any) => c.alive)
      .sort((a: any, b: any) => b.population - a.population)[0];
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(loaded.hqCityId).toBe(mostPopulous.id);
  });

  it('migra i salvataggi v5: nasce research.unlocked coi nodi implementati', () => {
    const s = newGameWithHq(23);
    for (let i = 0; i < 60; i++) tick(s);
    const raw = JSON.parse(serialize(s));
    raw.version = 5;
    delete raw.research; // com'era prima dell'albero della Ricerca
    const loaded = deserialize(JSON.stringify(raw))!;
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(CONFIG.saveVersion);
    // le partite in corso restano giocabili: tutto lo sbloccabile è già sbloccato
    expect(loaded.research.unlocked).toContain('quartier_gen');
    expect(loaded.research.unlocked).toContain('caccia');
    expect(loaded.research.unlocked).not.toContain('diplomazia'); // placeholder escluso
    for (let i = 0; i < 50; i++) tick(loaded);
  });

  it('rifiuta salvataggi con versione valida ma forma errata', () => {
    expect(deserialize('{"version":4}')).toBeNull();
    expect(deserialize('{"version":4,"cities":"x","squadrons":[],"ufos":[],"tick":0,"humt":1}')).toBeNull();
  });
});
