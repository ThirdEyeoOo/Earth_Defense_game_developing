import { t } from '../i18n';
import { ENCYCLOPEDIA_ENTRIES } from './encyclopediaEntries';

// Finestra Enciclopedia: nav delle voci a sinistra, contenuto a destra.
// Overlay/Esc come settings.ts; le voci arrivano da ENCYCLOPEDIA_ENTRIES.
export function createEncyclopedia(
  root: HTMLElement,
): { open(): void; close(): void; isOpen(): boolean; refresh(): void } {
  let selectedId = ENCYCLOPEDIA_ENTRIES[0]?.id ?? '';

  function render(): void {
    const entry =
      ENCYCLOPEDIA_ENTRIES.find(e => e.id === selectedId) ?? ENCYCLOPEDIA_ENTRIES[0];
    const nav = ENCYCLOPEDIA_ENTRIES.map(
      e =>
        `<button data-id="${e.id}" class="${e.id === entry?.id ? 'active' : ''}">${t(e.titleKey)}</button>`,
    ).join('');
    root.innerHTML = `
      <div class="enc-box">
        <div class="enc-header">
          <h1>${t('enc.title')}</h1>
          <button id="enc-close">${t('enc.close')}</button>
        </div>
        <div class="enc-body">
          <nav class="enc-nav">${nav}</nav>
          <div class="enc-content">
            ${entry ? `<h2>${t(entry.titleKey)}</h2>${t(entry.bodyKey)}` : ''}
          </div>
        </div>
      </div>
    `;
    for (const btn of root.querySelectorAll<HTMLButtonElement>('.enc-nav button')) {
      btn.addEventListener('click', () => {
        selectedId = btn.dataset.id!;
        render();
      });
    }
    root.querySelector('#enc-close')!.addEventListener('click', close);
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

  // capture-phase: con la finestra aperta Esc chiude solo questa e non raggiunge
  // l'handler bubble di main.ts che azzera selezione/trasferimenti
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
    refresh() {
      if (isOpen()) render();
    },
  };
}
