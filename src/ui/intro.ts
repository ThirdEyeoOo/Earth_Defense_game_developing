import logoRaw from '../../Assets/Intro/Logo_intro.svg?raw';
import introVideoUrl from '../../Assets/Intro/Intro_video.mp4';
import { t } from '../i18n';
import { bindEyeToggle, sanitizeSvg, trackPupil } from './eye';

// Intro a ogni caricamento pagina: logo animato (timeline CSS in style.css)
// → click sulla freccia → video a tutto schermo saltabile (click/Esc)
// → l'overlay si nasconde e rivela lo start screen già costruito sotto.

export function createIntro(root: HTMLElement, onDone: () => void): { refreshLabels(): void } {
  let done = false;
  let video: HTMLVideoElement | null = null;
  let hint: HTMLParagraphElement | null = null;

  // --- fase 1: logo ---
  root.innerHTML = sanitizeSvg(logoRaw);

  // occhio interattivo (utility condivise in eye.ts): la pupilla segue il
  // cursore, un click sulla zona invisibile chiude/riapre l'occhio
  const svg = root.querySelector('svg')!;
  const pupilTracker = trackPupil(
    root.querySelector<SVGCircleElement>('.intro-eye-ring')!,
    root.querySelector<SVGCircleElement>('.intro-pupil')!,
  );
  bindEyeToggle(svg, root.querySelector('.intro-eye-hit')!);

  const next = root.querySelector<SVGGElement>('.intro-next')!;
  // la freccia diventa cliccabile solo a fade-in concluso (prima è invisibile)
  next.addEventListener('animationend', event => {
    if (event.animationName !== 'intro-fade-in') return;
    next.addEventListener(
      'click',
      event => {
        // non deve raggiungere il listener di skip su root appena registrato
        event.stopPropagation();
        startVideo();
      },
      { once: true },
    );
  });

  // capture-phase: Esc durante il video salta SOLO l'intro e non raggiunge
  // l'handler bubble di main.ts che annulla i trasferimenti (pattern settings.ts)
  function onEsc(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    finish();
  }

  // --- fase 2: video (dal click = user gesture, quindi audio consentito) ---
  function startVideo(): void {
    pupilTracker.dispose(); // il logo non c'è più
    root.innerHTML = '';
    video = document.createElement('video');
    video.playsInline = true;
    video.src = introVideoUrl;
    video.addEventListener('ended', finish);
    // file mancante o non riproducibile: si degrada subito allo start screen
    video.addEventListener('error', finish);
    hint = document.createElement('p');
    hint.className = 'intro-skip-hint';
    hint.textContent = t('intro.skipHint');
    root.append(video, hint);
    root.addEventListener('click', finish);
    window.addEventListener('keydown', onEsc, { capture: true });
    video.play().catch(finish);
  }

  // unico punto di uscita, idempotente: ended/error/click/Esc/play fallito
  function finish(): void {
    if (done) return;
    done = true;
    window.removeEventListener('keydown', onEsc, { capture: true });
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load(); // rilascia il buffer del video
      video = null;
    }
    hint = null;
    root.innerHTML = '';
    root.classList.add('hidden');
    onDone();
  }

  return {
    // cambio lingua a caldo mentre il video è in corso
    refreshLabels() {
      if (hint) hint.textContent = t('intro.skipHint');
    },
  };
}
