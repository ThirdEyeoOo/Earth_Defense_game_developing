import { describe, expect, it } from 'vitest';
import { CONFIG } from '../sim/config';
import { advanceUfoToPhase, newGameWithHq } from '../sim/testUtils';
import { spawnUfo } from '../sim/ufos';
import { AbductionEngine } from './abductionEngine';

const INTERVAL = 1440 / CONFIG.ufoAbductor.abductionPerDay; // minuti-gioco tra un rapito e l'altro

// UFO in hover sopra Roma (milioni di abitanti: il limite è la capienza, non la città)
function abductingState() {
  const s = newGameWithHq(1, 'rome');
  spawnUfo(s, 'rome');
  advanceUfoToPhase(s, 'abducting');
  return s;
}

describe('AbductionEngine — rapimento in tempo reale', () => {
  it('in pausa non rapisce nessuno', () => {
    const s = abductingState();
    new AbductionEngine().update(s, 1000, 0);
    expect(s.stats.abductedTotal).toBe(0);
  });

  it('preleva UNA persona alla volta alla cadenza giusta', () => {
    const s = abductingState();
    const eng = new AbductionEngine();
    // frame per frame (come il loop reale): un prelievo a t=0 e uno a ogni INTERVAL → 6
    for (let k = 0; k <= 5; k++) eng.update(s, INTERVAL * k, 1);
    expect(s.stats.abductedTotal).toBe(6);
    expect(s.ufos[0].abducted).toBe(6);
  });

  it('non rapisce se l\'UFO non è in fase di rapimento', () => {
    const s = newGameWithHq(1, 'rome');
    spawnUfo(s, 'rome'); // resta in avvicinamento
    new AbductionEngine().update(s, 1000, 1);
    expect(s.stats.abductedTotal).toBe(0);
  });

  it('a capienza piena si ferma esatto e fa partire la fuga (niente sforo)', () => {
    const s = abductingState();
    const cap = CONFIG.ufoAbductor.captureCapacity;
    const eng = new AbductionEngine();
    eng.update(s, 0, 1); // aggancia la cadenza + primo prelievo
    eng.update(s, INTERVAL * (cap + 50), 1); // salto di tempo (alta velocità): recupera fino al pieno
    expect(s.ufos[0].abducted).toBe(cap);
    expect(s.ufos[0].phase).toBe('escaping');
  });
});
