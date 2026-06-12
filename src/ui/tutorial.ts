import logoRaw from '../../Assets/Intro/Logo_intro.svg?raw';
import { cityName, t } from '../i18n';
import type { GameState } from '../sim/state';
import { bindEyeToggle, sanitizeSvg, trackPupil } from './eye';
import { DONE_INDEX, TUTORIAL_STEPS, showsNextButton, visibleStepIndex } from './tutorialSteps';

// "Terzo Occhio", il compagno tutorial: l'occhio animato del logo d'intro,
// estratto a runtime dallo stesso asset (unica fonte di verità con l'artwork)
// e ancorato sotto la data dell'HUD. Parla con un fumetto a step (tutorialSteps);
// un click sull'occhio lo chiude e nasconde il tutorial, un altro lo riapre.

// L'occhio nel logo vive attorno a (322..394, 110..148): questo viewBox
// lo ritaglia con un piccolo margine.
const EYE_VIEWBOX = '320 105 80 50';

function buildEyeSvg(): SVGSVGElement {
  const doc = new DOMParser().parseFromString(sanitizeSvg(logoRaw), 'image/svg+xml');
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', EYE_VIEWBOX);
  // si importano i <g> GENITORI interi: fill/font/text-anchor vivono lì,
  // importare i soli nodi foglia darebbe trattini neri in font sbagliato
  const dashGroup = doc.querySelector('.intro-dash')?.closest('g');
  const eyeGroup = doc.querySelector('text.intro-eye-open')?.closest('g');
  const hit = doc.querySelector('.intro-eye-hit');
  for (const node of [dashGroup, eyeGroup, hit]) {
    if (node) svg.appendChild(document.importNode(node, true));
  }
  return svg;
}

export function createTutorial(
  root: HTMLElement,
  onVisibilityChange: (hidden: boolean) => void,
): {
  reset(state: GameState): void;
  update(state: GameState): void;
  refreshLabels(): void;
  isHidden(): boolean;
} {
  // stato solo in memoria: a ogni nuova partita il tutorial riparte
  let stepIndex = DONE_INDEX;
  let lastKey = '';

  const eyeBox = document.createElement('div');
  eyeBox.className = 'tutorial-eye';
  const svg = buildEyeSvg();
  eyeBox.appendChild(svg);

  const bubble = document.createElement('div');
  bubble.className = 'tutorial-bubble hidden';

  root.append(eyeBox, bubble);

  trackPupil(
    svg.querySelector<SVGCircleElement>('.intro-eye-ring')!,
    svg.querySelector<SVGCircleElement>('.intro-pupil')!,
  );
  const eyeToggle = bindEyeToggle(svg, svg.querySelector('.intro-eye-hit')!, closed => {
    lastKey = ''; // il prossimo update ridisegna il fumetto
    onVisibilityChange(closed);
  });

  function renderBubble(idx: number, state: GameState): void {
    if (idx === -1) {
      bubble.classList.add('hidden');
      return;
    }
    bubble.classList.remove('hidden');
    const step = TUTORIAL_STEPS[idx];
    let params: Record<string, string> | undefined;
    if (step.key === 'tutorial.founded' && state.hqCityId) {
      const city = state.cities.find(c => c.id === state.hqCityId);
      params = { city: city ? cityName(city.id, city.name) : state.hqCityId };
    }
    bubble.innerHTML = `<p>${t(step.key, params)}</p>`;
    if (showsNextButton(TUTORIAL_STEPS, idx)) {
      const next = document.createElement('button');
      next.className = 'tutorial-next';
      next.textContent = t('tutorial.next');
      next.setAttribute('aria-label', t('tutorial.nextLabel'));
      next.addEventListener('click', () => {
        // si avanza dall'indice VISIBILE: se la fondazione ha saltato avanti
        // (da step1/2 al messaggio founded), stepIndex sarebbe rimasto indietro
        stepIndex = step.phase === 'founded' ? DONE_INDEX : idx + 1;
        lastKey = '';
      });
      bubble.appendChild(next);
    }
  }

  function refreshLabels(): void {
    eyeBox.title = t('tutorial.toggleHint');
    lastKey = ''; // ridisegno (tradotto) al frame successivo
  }
  refreshLabels();

  return {
    // da bootGame: nuova partita in fondazione → tutorial dall'inizio;
    // salvataggio già fondato → occhio quieto, nessun fumetto
    reset(state: GameState) {
      stepIndex = state.hqCityId === null ? 0 : DONE_INDEX;
      eyeToggle.setClosed(false); // programmatico: non fa scattare il callback
      lastKey = '';
      root.classList.remove('hidden');
    },

    // ogni frame, ma ridisegna solo al cambio di chiave: il fumetto ha un
    // bottone (ricrearlo a ogni frame ucciderebbe i click) e re-iniettare
    // l'occhio farebbe ripartire le animazioni CSS
    update(state: GameState) {
      const idx = visibleStepIndex(
        TUTORIAL_STEPS,
        stepIndex,
        state.hqCityId !== null,
        eyeToggle.isClosed(),
      );
      const key = `${idx}:${state.hqCityId}`;
      if (key === lastKey) return;
      lastKey = key;
      renderBubble(idx, state);
    },

    refreshLabels,

    isHidden() {
      return eyeToggle.isClosed();
    },
  };
}
