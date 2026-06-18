// Harness di generazione del catalogo design-system (NON fa parte del gioco).
// Montato dal dev server Vite e reso da Chrome headless in generate.mjs.
// Importa i componenti UI REALI e li monta con uno stato finto realistico,
// così le "card" del catalogo riflettono il codice vero (niente deriva).
import { setLanguage } from '../../src/i18n';
import { cmdBuildSquadron } from '../../src/sim/commands';
import type { GameState } from '../../src/sim/state';
import { grantRiches, newGameWithHq } from '../../src/sim/testUtils';
import { createBalancePanel } from '../../src/ui/balancePanel';
import { createBottomBar } from '../../src/ui/bottomBar';
import { createCityPanel } from '../../src/ui/cityPanel';
import { createEncyclopedia } from '../../src/ui/encyclopedia';
import { createEndScreen } from '../../src/ui/endScreen';
import { createHud } from '../../src/ui/hud';
import { createRadar } from '../../src/ui/radar';
import { createSettings } from '../../src/ui/settings';

const noop = (): void => {};

// Stato finto realistico: QG a Roma, casse piene, uno squadrone schierato.
function baseState(): GameState {
  const s = newGameWithHq(20260618, 'rome');
  grantRiches(s, 5000);
  cmdBuildSquadron(s, 'rome'); // così il pannello città mostra uno squadrone
  return s;
}

function el(id: string): HTMLElement {
  const d = document.createElement('div');
  d.id = id;
  return d;
}

// Ogni mounter crea il contenitore con l'id reale atteso dal CSS, chiama la
// factory vera con callback no-op e rende il componente visibile + aggiornato.
const mounters: Record<string, (stage: HTMLElement) => void> = {
  hud(stage) {
    const s = baseState();
    const root = el('hud');
    stage.appendChild(root);
    const h = createHud(root, noop, noop, noop, noop, noop, noop);
    h.update(s, s.tick);
    h.refreshLabels();
  },
  'bottom-bar'(stage) {
    const root = el('bottom-bar');
    stage.appendChild(root);
    createBottomBar(root, noop);
  },
  radar(stage) {
    const s = baseState();
    const root = el('radar-panel');
    stage.appendChild(root);
    const r = createRadar(root);
    root.classList.remove('hidden'); // il pannello esce subito se è nascosto
    r.update(s);
  },
  balance(stage) {
    const s = baseState();
    const root = el('balance-panel');
    stage.appendChild(root);
    const b = createBalancePanel(root);
    root.classList.remove('hidden');
    b.update(s);
  },
  city(stage) {
    const s = baseState();
    const root = el('city-panel');
    stage.appendChild(root);
    const p = createCityPanel(root, {
      onBuild: noop,
      onStartTransfer: noop,
      onFoundHq: noop,
      onBuildEmbassy: noop,
    });
    p.update(s, 'rome');
  },
  settings(stage) {
    const root = el('settings-modal');
    stage.appendChild(root);
    createSettings(root, noop).open();
  },
  encyclopedia(stage) {
    const root = el('encyclopedia-modal');
    stage.appendChild(root);
    createEncyclopedia(root).open();
  },
  endscreen(stage) {
    const s = baseState();
    // schermata vittoria con qualche statistica
    (s as unknown as { outcome: string }).outcome = 'victory';
    s.stats.ufosShotDown = 7;
    s.stats.populationLost = 1_250_000;
    const root = el('end-screen');
    stage.appendChild(root);
    createEndScreen(root, noop).update(s);
  },
};

const params = new URLSearchParams(location.search);
const which = params.get('component') ?? 'hud';
if (params.get('lang') === 'en') setLanguage('en');

const stage = document.createElement('div');
stage.className = 'ds-stage';
document.body.appendChild(stage);

const mount = mounters[which];
if (mount) {
  mount(stage);
} else {
  document.body.innerHTML = `<pre>componente sconosciuto: ${which}</pre>`;
}

// Segnale di "pronto" per il generatore (oltre al titolo).
(window as unknown as { __DS_READY: boolean }).__DS_READY = true;
document.title = `ds:${which}`;
