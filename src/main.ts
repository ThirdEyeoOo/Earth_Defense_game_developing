import '@fontsource/michroma'; // font UI di default
import '@fontsource/orbitron/400.css'; // nomi città sulla mappa
import '@fontsource/orbitron/700.css';
import { detectLanguage, getLanguage, onLanguageChange, setLanguage, t, type Lang } from './i18n';
import { dayOfTick } from './sim/calendar';
import {
  cmdBuildSquadron,
  cmdRelocateSquadron,
  cmdSetSpeed,
  type CommandResult,
} from './sim/commands';
import { deserialize, SAVE_KEY, serialize } from './sim/save';
import { createNewGame, type GameState } from './sim/state';
import { tick } from './sim/tick';
import { CityLayer } from './render/cities';
import { EffectsLayer } from './render/effects';
import { FloatingTextLayer } from './render/floatingText';
import { createGlobe } from './render/globe';
import { HpBarLayer } from './render/hpBars';
import { createScene } from './render/scene';
import { UnitLayer } from './render/units';
import { createBottomBar } from './ui/bottomBar';
import { createCityPanel } from './ui/cityPanel';
import { createEndScreen } from './ui/endScreen';
import { createHud } from './ui/hud';
import { gearIcon } from './ui/icons';
import { createIntro } from './ui/intro';
import { loadPrefs, savePrefs } from './ui/prefs';
import { createRadar } from './ui/radar';
import { createSettings } from './ui/settings';

// --- stato applicativo ---
let state: GameState;
let selectedCityId: string | null = null;
let transferringSquadronId: number | null = null;
let lastSavedDay = -1;
let lastPanelKey = '';

const banner = document.getElementById('banner')!;
let bannerTimer: ReturnType<typeof setTimeout> | undefined;

function showBanner(text: string, ms: number | null = 2500): void {
  banner.textContent = text;
  banner.classList.remove('hidden');
  clearTimeout(bannerTimer);
  if (ms !== null) bannerTimer = setTimeout(() => banner.classList.add('hidden'), ms);
}

function showCommandError(result: CommandResult): void {
  if (result.ok) return;
  showBanner(t(`cmd.${result.code}`, 'params' in result ? result.params : undefined));
}

// --- lingua: preferenza salvata, altrimenti quella del browser ---
setLanguage(loadPrefs().language ?? detectLanguage(navigator.language));
document.title = t('app.title');
document.documentElement.lang = getLanguage();

function selectLanguage(lang: Lang): void {
  setLanguage(lang);
  savePrefs({ ...loadPrefs(), language: lang });
}

// --- scena ---
const ctx = createScene(document.getElementById('scene-container')!);
createGlobe(ctx.scene);
let cityLayer: CityLayer;
const unitLayer = new UnitLayer(ctx.scene);
const effects = new EffectsLayer(ctx.scene);
const hpBars = new HpBarLayer(ctx.scene);
const floatingText = new FloatingTextLayer(ctx.scene);

// --- ui ---
const hud = createHud(
  document.getElementById('hud')!,
  speed => {
    if (state) cmdSetSpeed(state, speed);
  },
  () => radar.toggle(),
  () => {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, serialize(state));
    showBanner(t('banner.gameSaved'), 1500);
  },
  () => settings.open(),
);
const settings = createSettings(document.getElementById('settings-modal')!, selectLanguage);
// barra inferiore: per ora ogni pulsante è un segnaposto ("Funzione in arrivo")
const bottomBar = createBottomBar(document.getElementById('bottom-bar')!, () =>
  showBanner(t('banner.comingSoon')),
);
const radar = createRadar(document.getElementById('radar-panel')!);
const cityPanel = createCityPanel(document.getElementById('city-panel')!, {
  onBuild: cityId => showCommandError(cmdBuildSquadron(state, cityId)),
  onStartTransfer: squadronId => {
    transferringSquadronId = squadronId;
    showBanner(t('banner.selectDestination'), null); // resta finché si sceglie o si annulla
  },
});
const endScreen = createEndScreen(document.getElementById('end-screen')!, () => startNewGame());

// --- selezione città (click sulle targhette DOM) ---
function handleCityClick(cityId: string): void {
  if (!state) return;
  if (transferringSquadronId !== null) {
    showCommandError(cmdRelocateSquadron(state, transferringSquadronId, cityId));
    transferringSquadronId = null;
    banner.classList.add('hidden');
  } else {
    selectedCityId = cityId;
  }
}
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    transferringSquadronId = null;
    selectedCityId = null;
    banner.classList.add('hidden');
  }
});

// --- avvio partita ---
function bootGame(gameState: GameState): void {
  state = gameState;
  selectedCityId = null;
  transferringSquadronId = null;
  acc = 0;
  lastSavedDay = dayOfTick(state.tick);
  if (cityLayer) {
    ctx.scene.remove(cityLayer.group);
    cityLayer.dispose();
  }
  cityLayer = new CityLayer(ctx.scene, state.cities, handleCityClick);
  hpBars.reset(); // niente barre residue tra una partita e l'altra (gli id ripartono)
  floatingText.reset(state); // un salvataggio caricato non rigioca gli eventi conservati
  document.getElementById('start-screen')!.classList.add('hidden');
}

function startNewGame(): void {
  localStorage.removeItem(SAVE_KEY);
  bootGame(createNewGame(Date.now() % 2 ** 31));
}

function setupStartScreen(): void {
  const root = document.getElementById('start-screen')!;
  const savedJson = localStorage.getItem(SAVE_KEY);
  const saved = savedJson ? deserialize(savedJson) : null;
  root.innerHTML = `
    <div class="start-box">
      <button id="start-settings" class="icon-btn" title="${t('settings.open')}">${gearIcon}</button>
      <h1>EARTH DEFENSE</h1>
      ${saved ? `<button id="continue-btn">${t('start.continue')}</button>` : ''}
      ${savedJson && !saved ? `<p class="danger">${t('start.invalidSave')}</p>` : ''}
      <button id="newgame-btn">${t('start.newGame')}</button>
    </div>
  `;
  root.querySelector('#newgame-btn')!.addEventListener('click', startNewGame);
  if (saved) {
    root.querySelector('#continue-btn')!.addEventListener('click', () => bootGame(saved));
  }
  root.querySelector('#start-settings')!.addEventListener('click', () => settings.open());
}

function autosave(): void {
  const day = dayOfTick(state.tick);
  if (day === lastSavedDay) return;
  lastSavedDay = day;
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    // storage pieno o non disponibile: il gioco continua senza salvare
  }
}

// --- loop principale ---
let last = performance.now();
// accumulatore in UNITÀ DI TICK (non ms): così la frazione corrente non
// dipende dalla velocità e cambiarla non fa "teletrasportare" le unità
let acc = 0;
function frame(now: number): void {
  const dt = Math.min(now - last, 1000); // clamp per tab in background
  last = now;
  if (state && state.outcome === 'playing' && state.speed > 0) {
    acc += dt / (3000 / state.speed); // 1x: 1 giorno = 60s = 20 tick
    while (acc >= 1) {
      acc -= 1;
      tick(state);
    }
    autosave();
  }
  // in pausa resta congelata al valore corrente: niente scatto indietro
  const tickFraction = acc;
  if (state) {
    // un errore cosmetico non deve fermare la simulazione né il loop
    try {
      cityLayer.update(state, selectedCityId, ctx.camera);
      unitLayer.update(state, tickFraction, ctx.camera);
      effects.update(state, unitLayer);
      hpBars.update(state, unitLayer, ctx.camera);
      floatingText.update(state, unitLayer, ctx.camera);
      hud.update(state, state.tick + tickFraction);
      radar.update(state);
      // il pannello ha pulsanti: si ricostruisce solo quando i dati cambiano,
      // non a ogni frame, altrimenti i click cadrebbero su elementi distrutti
      const panelKey = `${selectedCityId}:${state.tick}:${state.credits}:${state.squadrons.length}`;
      if (panelKey !== lastPanelKey) {
        lastPanelKey = panelKey;
        cityPanel.update(state, selectedCityId);
      }
      endScreen.update(state);
    } catch (err) {
      console.error('Errore di presentazione:', err);
    }
  }
  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  ctx.labelRenderer.render(ctx.scene, ctx.camera);
  requestAnimationFrame(frame);
}

// --- cambio lingua a caldo: rinfresca le superfici che non si ridisegnano da sole ---
onLanguageChange(() => {
  document.title = t('app.title');
  document.documentElement.lang = getLanguage();
  hud.refreshLabels();
  bottomBar.refreshLabels();
  lastPanelKey = ''; // il pannello città si ricostruisce solo al cambio dati: forzalo
  if (cityLayer) cityLayer.refreshNames();
  if (state) endScreen.refresh(state);
  const startScreen = document.getElementById('start-screen')!;
  if (!startScreen.classList.contains('hidden')) setupStartScreen();
  settings.refresh();
  intro.refreshLabels();
});

// l'intro copre lo start screen (z-25) e si nasconde da sola a fine video;
// onDone resta come hook futuro (es. musica di menu sullo stesso user gesture)
const intro = createIntro(document.getElementById('intro-screen')!, () => {});
setupStartScreen();
requestAnimationFrame(frame);
