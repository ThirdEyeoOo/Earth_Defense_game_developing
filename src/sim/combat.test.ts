import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { effectiveDamage, resolveCombat } from './combat';
import { createNewGame } from './state';
import { spawnUfo } from './ufos';

function addSquadron(s: ReturnType<typeof createNewGame>, cityId: string) {
  s.squadrons.push({ id: s.nextSquadronId++, hp: CONFIG.squadron.hp, cityId, transfer: null });
}

describe('combat', () => {
  it('danno = colpi × max(1, attacco − corazza)', () => {
    expect(effectiveDamage(6, 1, 1)).toBe(5);
    expect(effectiveDamage(2, 1, 10)).toBe(1); // minimo 1
    expect(effectiveDamage(6, 2, 1)).toBe(10);
  });

  it('squadrone e UFO si scambiano colpi; l\'UFO viene abbattuto', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnUfo(s, 'rome');
    // UFO 60 hp, danno squadrone 5/tick → 12 tick per abbatterlo
    for (let i = 0; i < 12; i++) resolveCombat(s);
    expect(s.ufos).toHaveLength(0);
    expect(s.stats.ufosShotDown).toBe(1);
    // lo squadrone ha subito 12 × max(1, 4-2) = 24 danni
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp - 24);
  });

  it('uno squadrone in trasferimento non combatte', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    s.squadrons[0].transfer = { fromCityId: 'paris', toCityId: 'rome', ticksRemaining: 5, totalTicks: 5 };
    spawnUfo(s, 'rome');
    resolveCombat(s);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp);
  });

  it('priorità bersagli: prima chi sta rapendo, poi chi scende, poi chi fugge', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnUfo(s, 'rome'); // id 1: descending
    spawnUfo(s, 'rome'); // id 2: abducting
    s.ufos[1].phase = 'abducting';
    resolveCombat(s);
    expect(s.ufos[1].hp).toBeLessThan(CONFIG.ufoAbductor.hp);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
  });

  it('più squadroni concentrano il fuoco; lo squadrone con id più basso incassa', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome'); // id 1
    addSquadron(s, 'rome'); // id 2
    spawnUfo(s, 'rome');
    resolveCombat(s);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp - 10); // 2 × 5
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp - 2); // id 1 incassa
    expect(s.squadrons[1].hp).toBe(CONFIG.squadron.hp);
  });

  it('uno squadrone a 0 hp viene distrutto', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    s.squadrons[0].hp = 2;
    spawnUfo(s, 'rome');
    resolveCombat(s);
    expect(s.squadrons).toHaveLength(0);
  });
});
