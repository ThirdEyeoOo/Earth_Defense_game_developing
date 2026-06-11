import logoRaw from '../../Assets/Intro/Logo_intro.svg?raw';
import introVideoUrl from '../../Assets/Intro/Intro_video.mp4';
import { t } from '../i18n';

// Intro a ogni caricamento pagina: logo animato (timeline CSS in style.css)
// → click sulla freccia → video a tutto schermo saltabile (click/Esc)
// → l'overlay si nasconde e rivela lo start screen già costruito sotto.

// L'SVG viene inlineato nel DOM: via <title>/<desc> e qualunque handler on*
// (artefatti di ri-esportazioni dell'asset); i click li gestisce questo modulo.
// Niente stripForInline: qui servono le classi intro-* e non ci sono id.
function sanitize(svg: string): string {
  return svg
    .replace(/<title[\s\S]*?<\/title>\s*/g, '')
    .replace(/<desc[\s\S]*?<\/desc>\s*/g, '')
    .replace(/ on\w+="[^"]*"/g, '');
}

export function createIntro(root: HTMLElement, onDone: () => void): { refreshLabels(): void } {
  let done = false;
  let video: HTMLVideoElement | null = null;
  let hint: HTMLParagraphElement | null = null;

  // --- fase 1: logo ---
  root.innerHTML = sanitize(logoRaw);

  // occhio interattivo: la pupilla segue il cursore (al primo movimento del
  // mouse l'orbita CSS lascia il posto al tracking), un click chiude/riapre
  const svg = root.querySelector('svg')!;
  const ring = root.querySelector<SVGCircleElement>('.intro-eye-ring')!;
  const pupil = root.querySelector<SVGCircleElement>('.intro-pupil')!;
  function onMouseMove(event: MouseEvent): void {
    const rect = ring.getBoundingClientRect();
    if (rect.width === 0) return; // svg non ancora misurabile
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const scale = rect.width / 22; // px schermo per unità SVG (anello r=11)
    const offset = Math.min(dist / scale, 4.5); // la pupilla resta nell'anello
    pupil.classList.add('intro-pupil--tracking');
    // translate CSS in px su un elemento SVG = unità utente del viewBox
    pupil.style.transform = `translate(${((dx / dist) * offset).toFixed(2)}px, ${((dy / dist) * offset).toFixed(2)}px)`;
  }
  window.addEventListener('mousemove', onMouseMove);
  root.querySelector('.intro-eye-hit')!.addEventListener('click', () => {
    svg.classList.toggle('intro-eye-closed');
  });

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
    window.removeEventListener('mousemove', onMouseMove); // il logo non c'è più
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
