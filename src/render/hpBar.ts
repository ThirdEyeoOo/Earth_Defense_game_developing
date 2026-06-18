import alienBarRaw from '../../Assets/Widgets/Barre/health-bar-aliens.svg?raw';
import humanBarRaw from '../../Assets/Widgets/Barre/health-bar-humans.svg?raw';

// Barra HP riutilizzabile (asset SVG in shadow DOM). Usata sia dalle barre
// fluttuanti sopra le unità (render/hpBars.ts) sia dal widget di selezione
// (render/selection.ts), così la logica dell'asset non è duplicata.
export type Faction = 'human' | 'alien';

export const CRITICAL_RATIO = 0.25;
const BAR_ASPECT = 92 / 530; // proporzioni del viewBox dell'asset

// Colori del riempimento (interpolazione continua sugli HP); impostati inline su
// #hb-root perché lo stile interno dell'asset dichiara le variabili --hb-* sullo
// stesso elemento e vincerebbe sul valore ereditato dallo shadow host.
export function fillColors(faction: Faction, ratio: number): { a: string; b: string } {
  if (faction === 'human') {
    // verde (100%) → giallo (50%) → rosso (0%)
    const hue = 120 * ratio;
    return { a: `hsl(${hue}, 90%, 55%)`, b: `hsl(${hue}, 90%, 40%)` };
  }
  // verde acido (100%) → viola scuro (0%), passando per il blu bioluminescente
  const hue = 75 + (277 - 75) * (1 - ratio);
  const sat = 95 - 33 * (1 - ratio);
  const light = 56 - 29 * (1 - ratio);
  return { a: `hsl(${hue}, ${sat}%, ${light + 8}%)`, b: `hsl(${hue}, ${sat}%, ${light - 6}%)` };
}

export interface HpBar {
  host: HTMLDivElement; // elemento da inserire nel DOM (CSS2D o overlay)
  update(ratio: number): void; // 0..1; idempotente (si auto-protegge dai no-op)
}

export function createHpBar(faction: Faction, widthPx: number): HpBar {
  const host = document.createElement('div');
  host.className = 'unit-hp-host';
  // shadow DOM: isola id e stili dell'asset, replicato in N istanze
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = faction === 'human' ? humanBarRaw : alienBarRaw;
  if (faction === 'alien') {
    // in stato critico l'asset forza il gradiente acido hardcoded; la specifica
    // vuole invece la scala continua fino al viola scuro
    const override = document.createElement('style');
    override.textContent = '#hb-root.is-critical #hb-fill { fill: url(#hb-grad-fill); }';
    shadow.appendChild(override);
  }
  const svgEl = shadow.querySelector('#hb-root') as SVGSVGElement;
  svgEl.setAttribute('width', String(widthPx));
  svgEl.setAttribute('height', (BAR_ASPECT * widthPx).toFixed(1));
  const fillGroup = shadow.querySelector('#hb-fill-group') as HTMLElement;
  const valueText = shadow.querySelector('#hb-value') as HTMLElement;
  let last = -1;

  return {
    host,
    update(ratio: number) {
      const clamped = Math.max(0, Math.min(1, ratio));
      if (Math.abs(clamped - last) < 0.0005) return;
      last = clamped;
      fillGroup.style.transform = `scaleX(${clamped})`;
      valueText.textContent = `${Math.round(clamped * 100)}%`;
      svgEl.classList.toggle('is-critical', clamped <= CRITICAL_RATIO);
      const { a, b } = fillColors(faction, clamped);
      svgEl.style.setProperty('--hb-fill-a', a);
      svgEl.style.setProperty('--hb-fill-b', b);
    },
  };
}
