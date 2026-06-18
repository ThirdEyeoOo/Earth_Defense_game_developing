import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { activeBattles } from './combat';
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

  it('un UFO che sta rapendo (abducting) è ingaggiabile: scatta la battaglia', () => {
    // scenario di gioco: si manda uno squadrone nella città sotto rapimento per
    // ingaggiare l'UFO. Qui il difensore è già arrivato (transfer === null).
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnDescendingUfo(s, 'rome');
    s.ufos[0].phase = 'abducting';
    expect(activeBattles(s)).toHaveLength(1);
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
