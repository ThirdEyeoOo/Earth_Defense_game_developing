import { t, type MessageKey } from '../i18n';
import { barButtonIcons } from './icons';

export type BarAction = 'bilancio' | 'costruisci' | 'ricerca' | 'citta';

// ordine richiesto, da sinistra a destra
const ACTIONS: BarAction[] = ['bilancio', 'costruisci', 'ricerca', 'citta'];

const LABEL_KEY: Record<BarAction, MessageKey> = {
  bilancio: 'bar.bilancio',
  costruisci: 'bar.costruisci',
  ricerca: 'bar.ricerca',
  citta: 'bar.citta',
};

export function createBottomBar(
  root: HTMLElement,
  onAction: (action: BarAction) => void,
): { refreshLabels(): void } {
  for (const action of ACTIONS) {
    const btn = document.createElement('button');
    btn.className = 'bar-btn';
    btn.dataset.action = action;
    btn.innerHTML = barButtonIcons[action];
    btn.addEventListener('click', () => onAction(action));
    root.appendChild(btn);
  }

  // il <text> degli SVG è un segnaposto vuoto: l'etichetta la scrive l'i18n
  function refreshLabels(): void {
    for (const btn of root.querySelectorAll<HTMLButtonElement>('.bar-btn')) {
      const action = btn.dataset.action as BarAction;
      btn.querySelector('text')!.textContent = t(LABEL_KEY[action]);
    }
  }
  refreshLabels();

  return { refreshLabels };
}
