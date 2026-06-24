import '@fontsource/michroma'; // font UI di default
import '@fontsource/orbitron/400.css'; // nomi città sulla mappa
import '@fontsource/orbitron/700.css';
import '@fontsource/quantico/400.css'; // titolo "Earth Defense" sullo start screen
import '@fontsource/quantico/700.css';
import { version as APP_VERSION } from '../package.json'; // versione mostrata nello start screen
import * as THREE from 'three';
import {
  cityName,
  detectLanguage,
  getLanguage,
  onLanguageChange,
  setLanguage,
  t,
  type Lang,
} from './i18n';
import { dayOfTick } from './sim/calendar';
import {
  cmdBuildEmbassy,
  cmdBuildSquadron,
  cmdBuildStructure,
  cmdFoundHq,
  cmdRelocateSquadron,
  cmdRemoveStructure,
  cmdRepairStructure,
  cmdSetSpeed,
  cmdStartResearch,
  type CommandResult,
} from './sim/commands';
import { deserialize, SAVE_KEY, serialize } from './sim/save';
import { createNewGame, type GameState } from './sim/state';
import { tick } from './sim/tick';
import { BattleBadgeLayer } from './render/battleBadges';
import { CityLayer } from './render/cities';
import { AbductionEngine } from './render/abductionEngine';
import { CombatEngine } from './render/combatEngine';
import { CombatFxLayer } from './render/combatFx';
import { CityStructuresLayer } from './render/cityStructures';
import { SquadronWeaponLayer } from './render/squadronWeapons';
import { EffectsLayer } from './render/effects';
import { FloatingTextLayer } from './render/floatingText';
import { createGlobe } from './render/globe';
import { HpBarLayer } from './render/hpBars';
import { createScene } from './render/scene';
import { SelectionWidget, type TrackedUnit } from './render/selection';
import { UfoLayer } from './render/ufoLayer';
import { UnitLayer } from './render/units';
import { createBalancePanel } from './ui/balancePanel';
import { createBottomBar } from './ui/bottomBar';
import { createBuildPanel } from './ui/buildPanel';
import { createCityPanel } from './ui/cityPanel';
import { createCombatWindow } from './ui/combatWindow';
import { createEncyclopedia } from './ui/encyclopedia';
import { createEndScreen } from './ui/endScreen';
import { createHud } from './ui/hud';
import { createIntro } from './ui/intro';
import { createMusic } from './ui/music';
import { loadPrefs, savePrefs } from './ui/prefs';
import { createRadar } from './ui/radar';
import { createResearchPanel } from './ui/researchPanel';
import { createSettings } from './ui/settings';
import { createTutorial } from './ui/tutorial';

// --- stato applicativo ---
let state: GameState;
let selectedCityId: string | null = null;
let transferringSquadronId: number | null = null;
let selectedUnit: TrackedUnit = null; // UFO/squadrone tracciato col click
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
  // caso speciale: il nome della risorsa va tradotto (la sim passa solo il codice)
  if (result.code === 'insufficientResources') {
    showBanner(
      t('cmd.insufficientResources', {
        amount: result.params.amount,
        resource: t(`res.${result.params.type}`),
      }),
    );
    return;
  }
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

// --- musica: tema in loop dallo start screen, volume da preferenze (default 50%) ---
const music = createMusic(loadPrefs().musicVolume ?? 0.5);
function selectMusicVolume(volume: number): void {
  music.setVolume(volume);
  savePrefs({ ...loadPrefs(), musicVolume: volume });
}

// --- scena ---
const ctx = createScene(document.getElementById('scene-container')!);
createGlobe(ctx.scene);
let cityLayer: CityLayer;
let battleBadges: BattleBadgeLayer;
const unitLayer = new UnitLayer(ctx.scene);
const ufoLayer = new UfoLayer(ctx.scene, id => {
  selectedUnit = { kind: 'ufo', id };
});
const effects = new EffectsLayer(ctx.scene);
const hpBars = new HpBarLayer(ctx.scene);
const floatingText = new FloatingTextLayer(ctx.scene);
const selection = new SelectionWidget();
// combattimento in tempo reale: il motore possiede gli "shot" e applica il danno;
// il layer FX disegna i proiettili sul globo (la finestra di scontro li disegna da sé)
const combatEngine = new CombatEngine();
const abductionEngine = new AbductionEngine();
const combatFx = new CombatFxLayer();
const squadronWeapons = new SquadronWeaponLayer();
// mini-griglia strutture sul globo (figlia delle targhette città del cityLayer corrente)
const cityStructures = new CityStructuresLayer(id => cityLayer.labelElement(id));

// picking degli squadroni (mesh Three.js): raycaster sul canvas, con guardia
// anti-drag come per le targhette città. Gli UFO sono DOM → gestiti in UfoLayer.
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let canvasDownAt = { x: 0, y: 0 };
ctx.renderer.domElement.addEventListener('pointerdown', event => {
  canvasDownAt = { x: event.clientX, y: event.clientY };
});
ctx.renderer.domElement.addEventListener('click', event => {
  if (Math.hypot(event.clientX - canvasDownAt.x, event.clientY - canvasDownAt.y) > 5) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, ctx.camera);
  const hit = raycaster.intersectObjects(unitLayer.group.children, true)[0];
  const id = hit ? squadronIdOf(hit.object) : null;
  // hit su uno squadrone → traccia; click nel vuoto → deseleziona
  selectedUnit = id !== null ? { kind: 'squadron', id } : null;
});
function squadronIdOf(obj: THREE.Object3D | null): number | null {
  for (let o: THREE.Object3D | null = obj; o; o = o.parent) {
    if (typeof o.userData.squadronId === 'number') return o.userData.squadronId;
  }
  return null;
}

// --- ui ---
// ">>>": salto al prossimo attacco. È intento di riproduzione (non si salva):
// 1000x finché il primo UFO non incrocia la distanza lunare, poi torna a 1x.
let skipArmed = false;
const hud = createHud(
  document.getElementById('hud')!,
  speed => {
    if (state) cmdSetSpeed(state, speed);
    skipArmed = false; // una scelta manuale di velocità annulla il salto
  },
  () => {
    if (state && state.hqCityId !== null) {
      cmdSetSpeed(state, 1000);
      skipArmed = true;
    }
  },
  () => radar.toggle(),
  () => {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, serialize(state));
    showBanner(t('banner.gameSaved'), 1500);
  },
  () => settings.open(),
  () => encyclopedia.open(),
);
const settings = createSettings(
  document.getElementById('settings-modal')!,
  selectLanguage,
  () => music.getVolume(),
  selectMusicVolume,
);
const encyclopedia = createEncyclopedia(document.getElementById('encyclopedia-modal')!);
// barra inferiore: Bilancio apre il pannello, gli altri sono ancora segnaposto
const bottomBar = createBottomBar(document.getElementById('bottom-bar')!, action => {
  if (action === 'bilancio') balancePanel.toggle();
  else if (action === 'ricerca') researchPanel.toggle();
  else if (action === 'costruisci') buildPanel.toggle();
  else showBanner(t('banner.comingSoon'));
});
const radar = createRadar(document.getElementById('radar-panel')!);
const balancePanel = createBalancePanel(document.getElementById('balance-panel')!);
// pannello Ricerca: albero tecnologico interattivo. Avviare un nodo paga subito il costo e
// lo mette in coda (avanza nel tempo via i laboratori); i nodi gratis (QG) si sbloccano subito.
const researchPanel = createResearchPanel(document.getElementById('research-modal')!, {
  getState: () => state,
  onStart: nodeId => {
    const result = cmdStartResearch(state, nodeId);
    if (!result.ok) {
      showCommandError(result);
      return false;
    }
    lastPanelKey = ''; // sbloccare il QG/funzioni cambia i pulsanti del pannello città
    // l'autosave scatta al cambio giorno (e mai in fondazione): salva subito l'avvio/sblocco
    try {
      localStorage.setItem(SAVE_KEY, serialize(state));
    } catch {
      // storage non disponibile: si continua senza salvare
    }
    return true;
  },
});
// pannello Costruisci: hub di assemblaggio veicoli + costruzione strutture su città
const buildPanel = createBuildPanel(document.getElementById('build-panel')!, {
  getState: () => state,
  onBuildSquadron: cityId => showCommandError(cmdBuildSquadron(state, cityId)),
  onBuildStructure: (cityId, cell, type) =>
    showCommandError(cmdBuildStructure(state, cityId, cell, type)),
  onRepairStructure: (cityId, id) => showCommandError(cmdRepairStructure(state, cityId, id)),
  onRemoveStructure: (cityId, id) => showCommandError(cmdRemoveStructure(state, cityId, id)),
});
// finestra di scontro stile FTL: si apre dal badge di battaglia sul globo
const combatWindow = createCombatWindow(document.getElementById('combat-window')!);
// Terzo Occhio: in fondazione il fumetto guida; il banner-istruzione resta
// solo come fallback quando il giocatore nasconde il tutorial (occhio chiuso)
const tutorial = createTutorial(document.getElementById('tutorial-companion')!, hidden => {
  if (!state || state.hqCityId !== null) return;
  if (hidden) showBanner(t('banner.chooseHq'), null);
  else banner.classList.add('hidden');
});
const cityPanel = createCityPanel(document.getElementById('city-panel')!, {
  onStartTransfer: squadronId => {
    transferringSquadronId = squadronId;
    showBanner(t('banner.selectDestination'), null); // resta finché si sceglie o si annulla
  },
  onFoundHq: cityId => {
    const result = cmdFoundHq(state, cityId);
    if (!result.ok) {
      showCommandError(result);
      return;
    }
    // a tutorial visibile la conferma la dà il fumetto di Terzo Occhio
    if (tutorial.isHidden()) {
      const city = state.cities.find(c => c.id === cityId)!;
      showBanner(t('banner.hqFounded', { city: cityName(city.id, city.name) }));
    }
    // l'autosave scatta solo al cambio giorno: senza questo, un refresh
    // prima del giorno 1 perderebbe la fondazione (e l'intera partita)
    try {
      localStorage.setItem(SAVE_KEY, serialize(state));
    } catch {
      // storage non disponibile: si continua senza salvare
    }
  },
  onBuildEmbassy: cityId => showCommandError(cmdBuildEmbassy(state, cityId)),
});
const endScreen = createEndScreen(document.getElementById('end-screen')!, () => startNewGame());

// --- selezione città (click sulle targhette DOM) ---
function handleCityClick(cityId: string): void {
  if (!state) return;
  if (transferringSquadronId !== null) {
    // acc = frazione del tick corrente: la rotta parte dalla città, non già a metà arco
    showCommandError(cmdRelocateSquadron(state, transferringSquadronId, cityId, acc));
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
    selectedUnit = null;
    banner.classList.add('hidden');
    // in fase di fondazione l'istruzione resta a schermo (solo a tutorial nascosto)
    if (state && state.hqCityId === null && tutorial.isHidden()) {
      showBanner(t('banner.chooseHq'), null);
    }
  }
});

// --- avvio partita ---
function bootGame(gameState: GameState): void {
  state = gameState;
  selectedCityId = null;
  transferringSquadronId = null;
  selectedUnit = null;
  selection.reset();
  acc = 0;
  gameMinutes = 0;
  combatEngine.reset();
  abductionEngine.reset();
  combatFx.reset();
  squadronWeapons.reset();
  cityStructures.dispose(); // le mini-griglie si riagganciano alle targhette del nuovo cityLayer
  lastSavedDay = dayOfTick(state.tick);
  if (cityLayer) {
    ctx.scene.remove(cityLayer.group);
    cityLayer.dispose();
  }
  cityLayer = new CityLayer(ctx.scene, state.cities, handleCityClick);
  if (battleBadges) {
    ctx.scene.remove(battleBadges.group);
    battleBadges.dispose();
  }
  battleBadges = new BattleBadgeLayer(ctx.scene, state.cities, cityId =>
    combatWindow.open(cityId, state),
  );
  combatWindow.close(); // niente finestra di scontro residua tra una partita e l'altra
  hpBars.reset(); // niente barre residue tra una partita e l'altra (gli id ripartono)
  ufoLayer.reset(); // niente UFO residui tra una partita e l'altra
  floatingText.reset(state); // un salvataggio caricato non rigioca gli eventi conservati
  document.getElementById('start-screen')!.classList.add('hidden');
  tutorial.reset(state); // dopo il reset il tutorial è visibile → niente banner
  if (state.hqCityId === null && tutorial.isHidden()) showBanner(t('banner.chooseHq'), null);
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
      <h1>EARTH DEFENSE</h1>
      <p class="start-version">v${APP_VERSION}</p>
      ${saved ? `<button id="continue-btn">${t('start.continue')}</button>` : ''}
      ${savedJson && !saved ? `<p class="danger">${t('start.invalidSave')}</p>` : ''}
      <button id="newgame-btn">${t('start.newGame')}</button>
      <button id="settings-btn">${t('settings.open')}</button>
      <button id="exit-btn">${t('start.exit')}</button>
    </div>
  `;
  root.querySelector('#newgame-btn')!.addEventListener('click', startNewGame);
  if (saved) {
    root.querySelector('#continue-btn')!.addEventListener('click', () => bootGame(saved));
  }
  root.querySelector('#settings-btn')!.addEventListener('click', () => settings.open());
  // Esci: nel browser window.close() chiude solo le finestre aperte da script; in un
  // eventuale build desktop chiude l'app. Fallback: messaggio se la scheda resta aperta.
  root.querySelector('#exit-btn')!.addEventListener('click', () => {
    window.close();
    showBanner(t('start.exitHint'), 4000);
  });
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

// ">>>": vero appena il PRIMO UFO in arrivo ha incrociato la distanza lunare
function firstUfoReachedLunar(gameState: GameState): boolean {
  return gameState.ufos.some(
    u => u.phase === 'approaching' && u.phaseTotalTicks - u.ticksRemaining >= u.lunarCrossTick,
  );
}

// --- loop principale ---
let last = performance.now();
// accumulatore in UNITÀ DI TICK (non ms): così la frazione corrente non
// dipende dalla velocità e cambiarla non fa "teletrasportare" le unità
let acc = 0;
// orologio in MINUTI-GIOCO: sorgente unica per il combattimento in tempo reale e per
// il pattugliamento (avanza con la velocità, si congela in pausa). 1x: 1 s reale = 1 min.
let gameMinutes = 0;
function frame(now: number): void {
  const dt = Math.min(now - last, 1000); // clamp per tab in background
  last = now;
  if (state && state.outcome === 'playing' && state.speed > 0 && state.hqCityId !== null) {
    acc += dt / (72000 / state.speed); // 1x: 1 s reale = 1 min-gioco (1 giorno = 24 min reali = 20 tick)
    gameMinutes += (dt / 1000) * state.speed; // stessa base-tempo, in minuti-gioco
    while (acc >= 1) {
      acc -= 1;
      tick(state);
      // controllo DENTRO il loop: a 1000x si fanno molti tick/frame e bisogna
      // scendere a 1x esattamente al tick d'incrocio, senza sorpassarlo
      if (skipArmed && firstUfoReachedLunar(state)) {
        cmdSetSpeed(state, 1);
        skipArmed = false;
        break;
      }
    }
    autosave();
  }
  // in pausa resta congelata al valore corrente: niente scatto indietro
  const tickFraction = acc;
  if (state) {
    // un errore cosmetico non deve fermare la simulazione né il loop
    try {
      cityLayer.update(state, selectedCityId, ctx.camera);
      cityStructures.update(state, ctx.camera); // mini-griglia (scala con lo zoom)
      battleBadges.update(state, ctx.camera);
      unitLayer.update(state, tickFraction, gameMinutes);
      ufoLayer.update(state, unitLayer, ctx.camera, tickFraction);
      // combattimento in tempo reale: applica il danno (via comando) prima che HP/FX leggano
      combatEngine.update(state, gameMinutes, state.speed);
      // rapimento in tempo reale: una persona alla volta, alla cadenza giusta
      // (tickFraction: se scatta la fuga, l'UFO riparte dal punto esatto, a velocità 0)
      abductionEngine.update(state, gameMinutes, state.speed, tickFraction);
      effects.update(state, unitLayer);
      hpBars.update(state, unitLayer, ctx.camera, selectedUnit);
      floatingText.update(state, unitLayer, ctx.camera);
      // minigun montati sui caccia (dopo ufoLayer.update: serve la posa DOM dell'UFO per mirare)
      squadronWeapons.update(state, unitLayer, ufoLayer, ctx.camera);
      combatFx.update(
        combatEngine.shots,
        gameMinutes,
        state,
        unitLayer,
        ufoLayer,
        squadronWeapons,
        cityStructures,
        ctx.camera,
      );
      // tracciamento: se l'oggetto selezionato è uscito di scena, azzera
      if (selectedUnit) {
        const alive =
          selectedUnit.kind === 'ufo'
            ? state.ufos.some(u => u.id === selectedUnit!.id)
            : state.squadrons.some(s => s.id === selectedUnit!.id);
        if (!alive) selectedUnit = null;
      }
      selection.update(state, selectedUnit, unitLayer, ufoLayer, ctx.camera, tickFraction);
      combatWindow.update(state, combatEngine.shots, gameMinutes);
      hud.update(state, state.tick + tickFraction);
      radar.update(state);
      balancePanel.update(state);
      buildPanel.update(state);
      researchPanel.updateAffordability();
      tutorial.update(state);
      // il pannello ha pulsanti: si ricostruisce solo quando i dati cambiano,
      // non a ogni frame, altrimenti i click cadrebbero su elementi distrutti
      const embassies = state.cities.reduce((n, c) => n + (c.embassy ? 1 : 0), 0);
      const panelKey = `${selectedCityId}:${state.tick}:${state.humt}:${state.squadrons.length}:${state.hqCityId}:${embassies}`;
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
  if (battleBadges) battleBadges.refreshLabels();
  combatWindow.refreshLabels();
  if (state) endScreen.refresh(state);
  const startScreen = document.getElementById('start-screen')!;
  if (!startScreen.classList.contains('hidden')) setupStartScreen();
  else if (state && state.hqCityId === null && tutorial.isHidden()) {
    showBanner(t('banner.chooseHq'), null);
  }
  settings.refresh();
  encyclopedia.refresh();
  researchPanel.refresh();
  buildPanel.refresh();
  intro.refreshLabels();
  tutorial.refreshLabels();
});

// l'intro copre lo start screen (z-25) e si nasconde da sola a fine video; a fine intro
// parte il tema di menu (onDone scatta su un gesto utente ⇒ l'autoplay non viene bloccato)
const intro = createIntro(document.getElementById('intro-screen')!, () => music.play());
setupStartScreen();

// Avvio a schermo intero: i browser concedono il fullscreen SOLO da un gesto utente,
// quindi non si può forzare al primo paint. Lo richiediamo al PRIMISSIMO gesto (già
// sull'intro/schermata iniziale), una sola volta per caricamento. Se l'utente esce
// (Esc), non rientriamo da soli: servirà un nuovo avvio o il toggle in Impostazioni.
function enterFullscreenOnce(): void {
  window.removeEventListener('pointerdown', enterFullscreenOnce, true);
  window.removeEventListener('keydown', enterFullscreenOnce, true);
  if (!document.fullscreenElement) {
    void document.documentElement.requestFullscreen().catch(() => {});
  }
}
window.addEventListener('pointerdown', enterFullscreenOnce, true);
window.addEventListener('keydown', enterFullscreenOnce, true);

requestAnimationFrame(frame);
