import { getLanguage, t, type Lang } from '../i18n';

// Modal impostazioni: selezione della lingua + volume musica.
// Overlay stile end-screen, sopra anche allo start screen (z-index in CSS).
export function createSettings(
  root: HTMLElement,
  onLanguageSelected: (lang: Lang) => void,
  getMusicVolume: () => number, // 0..1
  onMusicVolume: (volume: number) => void, // 0..1 (0 = musica disattivata)
): { open(): void; close(): void; isOpen(): boolean; refresh(): void } {
  function render(): void {
    const lang = getLanguage();
    const pct = Math.round(getMusicVolume() * 100);
    root.innerHTML = `
      <div class="settings-box">
        <h1>${t('settings.title')}</h1>
        <p>${t('settings.language')}</p>
        <p>
          <button data-lang="it" class="${lang === 'it' ? 'active' : ''}">Italiano</button>
          <button data-lang="en" class="${lang === 'en' ? 'active' : ''}">English</button>
        </p>
        <p class="settings-music">
          <label id="music-volume-label" for="music-volume">${t('settings.musicVolume', { n: pct })}</label>
          <input type="range" id="music-volume" min="0" max="100" step="1" value="${pct}">
        </p>
        <button id="settings-close">${t('settings.close')}</button>
      </div>
    `;
    for (const btn of root.querySelectorAll<HTMLButtonElement>('button[data-lang]')) {
      btn.addEventListener('click', () => onLanguageSelected(btn.dataset.lang as Lang));
    }
    const slider = root.querySelector<HTMLInputElement>('#music-volume')!;
    const label = root.querySelector<HTMLLabelElement>('#music-volume-label')!;
    slider.addEventListener('input', () => {
      onMusicVolume(Number(slider.value) / 100);
      label.textContent = t('settings.musicVolume', { n: slider.value });
    });
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
