import { getLanguage, t, type Lang } from '../i18n';

// Modal impostazioni: per ora solo la selezione della lingua.
// Overlay stile end-screen, sopra anche allo start screen (z-index in CSS).
export function createSettings(
  root: HTMLElement,
  onLanguageSelected: (lang: Lang) => void,
): { open(): void; close(): void; isOpen(): boolean; refresh(): void } {
  function render(): void {
    const lang = getLanguage();
    root.innerHTML = `
      <div class="settings-box">
        <h1>${t('settings.title')}</h1>
        <p>${t('settings.language')}</p>
        <p>
          <button data-lang="it" class="${lang === 'it' ? 'active' : ''}">Italiano</button>
          <button data-lang="en" class="${lang === 'en' ? 'active' : ''}">English</button>
        </p>
        <button id="settings-close">${t('settings.close')}</button>
      </div>
    `;
    for (const btn of root.querySelectorAll<HTMLButtonElement>('button[data-lang]')) {
      btn.addEventListener('click', () => onLanguageSelected(btn.dataset.lang as Lang));
    }
    root.querySelector('#settings-close')!.addEventListener('click', close);
  }

  function open(): void {
    render();
    root.classList.remove('hidden');
  }

  function close(): void {
    root.classList.add('hidden');
  }

  function isOpen(): boolean {
    return !root.classList.contains('hidden');
  }

  // click sul fondale (fuori dal box) = chiusura
  root.addEventListener('click', event => {
    if (event.target === root) close();
  });

  // capture-phase: con il modal aperto Esc chiude SOLO il modal e non
  // raggiunge l'handler bubble di main.ts che annulla i trasferimenti
  window.addEventListener(
    'keydown',
    event => {
      if (event.key === 'Escape' && isOpen()) {
        close();
        event.stopPropagation();
      }
    },
    { capture: true },
  );

  return {
    open,
    close,
    isOpen,
    // re-render al cambio lingua (etichette e bottone attivo), solo se aperto
    refresh() {
      if (isOpen()) render();
    },
  };
}
