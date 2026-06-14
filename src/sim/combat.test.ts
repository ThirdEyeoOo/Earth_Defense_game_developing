import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { activeBattles, effectiveDamage, resolveCombat } from './combat';
import { createNewGame } from './state';
import { spawnUfo } from './ufos';

function addSquadron(s: ReturnType<typeof createNewGame>, cityId: string) {
  s.squadrons.push({ id: s.nextSquadronId++, hp: CONFIG.squadron.hp, cityId, transfer: null });
}

// gli UFO appena spawnati sono in 'approaching' (fuori portata):
// per i test di combattimento li portiamo in atmosfera
function spawnDescendingUfo(s: ReturnType<typeof createNewGame>, cityId: string) {
  spawnUfo(s, cityId);
  s.ufos[s.ufos.length - 1].phase = 'descending';
}

describe('combat', () => {
  it('danno = colpi × max(1, attacco − corazza)', () => {
    expect(effectiveDamage(6, 1, 1)).toBe(5);
    expect(effectiveDamage(2, 1, 10)).toBe(1); // minimo 1
    expect(effectiveDamage(6, 2, 1)).toBe(10);
  });

  it('gli UFO in avvicinamento o in orbita non sono ingaggiabili', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnUfo(s, 'rome'); // approaching
    resolveCombat(s);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
    s.ufos[0].phase = 'orbiting';
    resolveCombat(s);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp);
  });

  it('squadrone e UFO si scambiano colpi; l\'UFO viene abbattuto', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnDescendingUfo(s, 'rome');
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
    spawnDescendingUfo(s, 'rome');
    resolveCombat(s);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp);
  });

  it('priorità bersagli: prima chi sta rapendo, poi chi scende, poi chi fugge', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnDescendingUfo(s, 'rome'); // id 1: descending
    spawnDescendingUfo(s, 'rome'); // id 2: abducting
    s.ufos[1].phase = 'abducting';
    resolveCombat(s);
    expect(s.ufos[1].hp).toBeLessThan(CONFIG.ufoAbductor.hp);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
  });

  it('più squadroni concentrano il fuoco; lo squadrone con id più basso incassa', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome'); // id 1
    addSquadron(s, 'rome'); // id 2
    spawnDescendingUfo(s, 'rome');
    resolveCombat(s);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp - 10); // 2 × 5
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp - 2); // id 1 incassa
    expect(s.squadrons[1].hp).toBe(CONFIG.squadron.hp);
  });

  it('uno squadrone a 0 hp viene distrutto', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    s.squadrons[0].hp = 2;
    spawnDescendingUfo(s, 'rome');
    resolveCombat(s);
    expect(s.squadrons).toHaveLength(0);
  });
});

describe('activeBattles', () => {
  it('nessuna battaglia senza difensori', () => {
    const s = createNewGame(1);
    spawnDescendingUfo(s, 'rome'); // attaccante ma nessuno squadrone
    expect(activeBattles(s)).toHaveLength(0);
  });

  it('UFO in avvicinamento o in orbita non fanno scattare una battaglia', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnUfo(s, 'rome'); // approaching
    expect(activeBattles(s)).toHaveLength(0);
    s.ufos[0].phase = 'orbiting';
    expect(activeBattles(s)).toHaveLength(0);
  });

  it('uno squadrone in trasferimento non difende', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    s.squadrons[0].transfer = {
      fromCityId: 'paris', toCityId: 'rome', ticksRemaining: 5, totalTicks: 5,
    };
    spawnDescendingUfo(s, 'rome');
    expect(activeBattles(s)).toHaveLength(0);
  });

  it('difensore + UFO ingaggiabile sulla stessa città → una battaglia con gli array corretti', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnDescendingUfo(s, 'rome');
    const battles = activeBattles(s);
    expect(battles).toHaveLength(1);
    expect(battles[0].cityId).toBe('rome');
    expect(battles[0].defenders).toEqual(s.squadrons);
    expect(battles[0].attackers).toEqual(s.ufos);
  });

  it('una città morta non è in battaglia', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnDescendingUfo(s, 'rome');
    s.cities.find(c => c.id === 'rome')!.alive = false;
    expect(activeBattles(s)).toHaveLength(0);
  });

  it('più città in battaglia contemporaneamente', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    addSquadron(s, 'paris');
    spawnDescendingUfo(s, 'rome');
    spawnDescendingUfo(s, 'paris');
    const ids = activeBattles(s).map(b => b.cityId).sort();
    expect(ids).toEqual(['paris', 'rome']);
  });
});
