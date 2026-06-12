import { describe, expect, it } from 'vitest';
import { it as itDict } from '../i18n/it';
import { DONE_INDEX, TUTORIAL_STEPS, showsNextButton, visibleStepIndex } from './tutorialSteps';

describe('tutorialSteps', () => {
  it('le chiavi degli step esistono nel dizionario', () => {
    for (const step of TUTORIAL_STEPS) {
      expect(itDict[step.key], step.key).toBeDefined();
    }
  });

  it('in fondazione mostra gli step founding in sequenza', () => {
    expect(visibleStepIndex(TUTORIAL_STEPS, 0, false, false)).toBe(0);
    expect(visibleStepIndex(TUTORIAL_STEPS, 1, false, false)).toBe(1);
    expect(visibleStepIndex(TUTORIAL_STEPS, 2, false, false)).toBe(2);
  });

  it('a occhio chiuso non mostra nulla', () => {
    expect(visibleStepIndex(TUTORIAL_STEPS, 0, false, true)).toBe(-1);
    expect(visibleStepIndex(TUTORIAL_STEPS, 3, true, true)).toBe(-1);
  });

  it('a QG fondato salta al primo step founded, da qualunque step founding', () => {
    for (const from of [0, 1, 2, 3]) {
      expect(visibleStepIndex(TUTORIAL_STEPS, from, true, false)).toBe(3);
    }
  });

  it('sequenza conclusa (DONE_INDEX) → nessun fumetto', () => {
    expect(visibleStepIndex(TUTORIAL_STEPS, DONE_INDEX, true, false)).toBe(-1);
    expect(visibleStepIndex(TUTORIAL_STEPS, DONE_INDEX, false, false)).toBe(-1);
  });

  it('senza QG uno step founded non viene mostrato (caso anomalo)', () => {
    expect(visibleStepIndex(TUTORIAL_STEPS, 3, false, false)).toBe(-1);
  });

  it("il '>' compare su step1/2 e founded, NON sull'ultimo step founding", () => {
    expect(showsNextButton(TUTORIAL_STEPS, 0)).toBe(true);
    expect(showsNextButton(TUTORIAL_STEPS, 1)).toBe(true);
    expect(showsNextButton(TUTORIAL_STEPS, 2)).toBe(false); // step3: si avanza fondando
    expect(showsNextButton(TUTORIAL_STEPS, 3)).toBe(true); // founded: chiude il fumetto
    expect(showsNextButton(TUTORIAL_STEPS, DONE_INDEX)).toBe(false);
  });
});
