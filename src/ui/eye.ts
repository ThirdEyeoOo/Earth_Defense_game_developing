// Utility condivise per l'occhio animato del logo (intro.ts e tutorial.ts).
// Le animazioni (apertura, blink, orbita pupilla, stato chiuso) sono CSS sulle
// classi intro-* in style.css: qui vive solo la parte interattiva.

// L'SVG viene inlineato nel DOM: via <title>/<desc> e qualunque handler on*
// (artefatti di ri-esportazioni dell'asset); i click li gestiscono i moduli.
// Niente stripForInline: servono le classi intro-* e non ci sono id.
export function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<title[\s\S]*?<\/title>\s*/g, '')
    .replace(/<desc[\s\S]*?<\/desc>\s*/g, '')
    .replace(/ on\w+="[^"]*"/g, '');
}

// La pupilla segue il cursore: al primo movimento del mouse l'orbita CSS
// lascia il posto al tracking. dispose() rimuove il listener da window.
export function trackPupil(
  ring: SVGCircleElement,
  pupil: SVGCircleElement,
): { dispose(): void } {
  function onMouseMove(event: MouseEvent): void {
    const rect = ring.getBoundingClientRect();
    if (rect.width === 0) return; // svg non ancora misurabile (o nascosto)
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
  return {
    dispose() {
      window.removeEventListener('mousemove', onMouseMove);
    },
  };
}

// Click sulla zona invisibile .intro-eye-hit → l'occhio si chiude/riapre.
// onToggle è invocato SOLO sui click dell'utente: setClosed (programmatico)
// non lo fa scattare, così un reset non rimbalza sui callback del chiamante.
export function bindEyeToggle(
  svg: SVGElement,
  hit: Element,
  onToggle?: (closed: boolean) => void,
): { isClosed(): boolean; setClosed(closed: boolean): void } {
  hit.addEventListener('click', () => {
    const closed = svg.classList.toggle('intro-eye-closed');
    onToggle?.(closed);
  });
  return {
    isClosed() {
      return svg.classList.contains('intro-eye-closed');
    },
    setClosed(closed: boolean) {
      svg.classList.toggle('intro-eye-closed', closed);
    },
  };
}
