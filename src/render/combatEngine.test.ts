import { describe, expect, it } from 'vitest';
import { cmdBuildSquadron } from '../sim/commands';
import { CONFIG } from '../sim/config';
import { spawnUfo } from '../sim/ufos';
import { advanceUfoToPhase, grantRiches, newGameWithHq } from '../sim/testUtils';
import { CombatEngine } from './combatEngine';

// Battaglia pronta: un difensore di stanza a Roma + un UFO in rapimento (fase
// ingaggiabile, in hover sulla città) → activeBattles restituisce uno scontro.
function engagedState() {
  const s = newGameWithHq(1, 'rome');
  grantRiches(s);
  cmdBuildSquadron(s, 'rome');
  spawnUfo(s, 'rome');
  advanceUfoToPhase(s, 'abducting');
  return s;
}

describe('CombatEngine — combattimento a due sensi', () => {
  it("i minigun del difensore fanno danno all'UFO e lo abbattono", () => {
    const s = engagedState();
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
    const eng = new CombatEngine();
    // velocità alta: risoluzione in blocco (danno immediato, niente proiettili)
    let t = 0;
    for (let i = 0; i < 40 && s.ufos.length > 0; i++) {
      t += 2;
      eng.update(s, t, 100);
    }
    expect(s.ufos).toHaveLength(0);
    expect(s.stats.ufosShotDown).toBe(1);
  });

  it('le torrette UFO continuano a danneggiare il difensore', () => {
    const s = engagedState();
    const sq = s.squadrons[0];
    const hp0 = sq.hp;
    const eng = new CombatEngine();
    eng.update(s, 2, 100); // un blocco di fuoco
    const after = s.squadrons.find(x => x.id === sq.id);
    // o ha perso HP o è già stato distrutto
    expect(after === undefined || after.hp < hp0).toBe(true);
  });

  it('a velocità normale genera proiettili in ENTRAMBE le direzioni', () => {
    const s = engagedState();
    const eng = new CombatEngine();
    eng.update(s, 5, 1); // gameMinutes oltre la prima cadenza di entrambe le armi
    const fromUfo = eng.shots.some(sh => sh.from.kind === 'ufo' && sh.to.kind === 'squadron');
    const fromSquadron = eng.shots.some(
      sh => sh.from.kind === 'squadron' && sh.to.kind === 'ufo',
    );
    expect(fromUfo).toBe(true);
    expect(fromSquadron).toBe(true);
  });
});
