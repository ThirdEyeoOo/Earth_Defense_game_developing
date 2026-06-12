import type { MessageKey } from '../i18n';

// Sequenza del tutorial come dati: aggiungere step futuri (primo squadrone,
// prima ambasciata, prima ondata...) significa aggiungere voci e fasi qui,
// senza toccare la meccanica del componente (ui/tutorial.ts).

export type TutorialPhase = 'founding' | 'founded';

export interface TutorialStep {
  readonly key: MessageKey;
  readonly phase: TutorialPhase;
}

export const TUTORIAL_STEPS: readonly TutorialStep[] = [
  { key: 'tutorial.step1', phase: 'founding' },
  { key: 'tutorial.step2', phase: 'founding' },
  { key: 'tutorial.step3', phase: 'founding' },
  { key: 'tutorial.founded', phase: 'founded' },
];

// indice oltre l'ultimo step = sequenza conclusa, nessun fumetto
export const DONE_INDEX = TUTORIAL_STEPS.length;

// Quale step mostrare nel fumetto (-1 = nessuno).
// Se il giocatore fonda il QG mentre è ancora a uno step 'founding',
// si salta direttamente al primo step 'founded' successivo.
export function visibleStepIndex(
  steps: readonly TutorialStep[],
  currentIndex: number,
  founded: boolean,
  eyeClosed: boolean,
): number {
  if (eyeClosed || currentIndex >= steps.length) return -1;
  if (founded) {
    for (let i = currentIndex; i < steps.length; i++) {
      if (steps[i].phase === 'founded') return i;
    }
    return -1;
  }
  return steps[currentIndex].phase === 'founding' ? currentIndex : -1;
}

// Il ">" non compare sull'ultimo step 'founding' (lì si avanza fondando il QG:
// senza ">", il fumetto con l'istruzione resta visibile finché serve).
export function showsNextButton(steps: readonly TutorialStep[], index: number): boolean {
  const step = steps[index];
  if (!step) return false;
  if (step.phase === 'founded') return true;
  return steps[index + 1]?.phase === 'founding';
}
