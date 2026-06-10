import * as THREE from 'three';
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
import { createGlobe } from './render/globe';
import { createScene } from './render/scene';
import { UnitLayer } from './render/units';
import { createCityPanel } from './ui/cityPanel';
import { createEndScreen } from './ui/endScreen';
import { createHud } from './ui/hud';
import { createRadar } from './ui/radar';

// --- stato applicativo ---
let state: GameState;
let selectedCityId: string | null = null;
let transferringSquadronId: number | null = null;
let lastSavedDay = -1;
let lastPanelKey = '';

const banner = document.getElementById('banner')!;

function showCommandError(result: CommandResult): void {
  if (result.ok) return;
  banner.textContent = result.reason;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 2500);
}

// --- scena ---
const ctx = createScene(document.getElementById('scene-container')!);
createGlobe(ctx.scene);
let cityLayer: CityLayer;
const unitLayer = new UnitLayer(ctx.scene);
const effects = new EffectsLayer(ctx.scene);

// --- ui ---
const hud = createHud(
  document.getElementById('hud')!,
  speed => cmdSetSpeed(state, speed),
  () => radar.toggle(),
  () => {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, serialize(state));
    banner.textContent = 'Partita salvata';
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 1500);
  },
);
const radar = createRadar(document.getElementById('radar-panel')!);
const cityPanel = createCityPanel(document.getElementById('city-panel')!, {
  onBuild: cityId => showCommandError(cmdBuildSquadron(state, cityId)),
  onStartTransfer: squadronId => {
    transferringSquadronId = squadronId;
    banner.textContent = 'Seleziona la città di destinazione (Esc per annullare)';
    banner.classList.remove('hidden');
  },
});
const endScreen = createEndScreen(document.getElementById('end-screen')!, () => startNewGame());

// --- picking ---
const raycaster = new THREE.Raycaster();
ctx.renderer.domElement.addEventListener('click', event => {
  if (!cityLayer) return;
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(mouse, ctx.camera);
  const cityId = cityLayer.cityIdAt(raycaster);
  if (!cityId) return;
  if (transferringSquadronId !== null) {
    showCommandError(cmdRelocateSquadron(state, transferringSquadronId, cityId));
    transferringSquadronId = null;
    banner.classList.add('hidden');
  } else {
    selectedCityId = cityId;
  }
});
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
  lastSavedDay = dayOfTick(state.tick);
  if (cityLayer) ctx.scene.remove(cityLayer.group);
  cityLayer = new CityLayer(ctx.scene, state.cities);
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
      <h1>EARTH DEFENSE</h1>
      ${saved ? '<button id="continue-btn">Continua</button>' : ''}
      ${savedJson && !saved ? '<p class="danger">Salvataggio non valido o incompatibile</p>' : ''}
      <button id="newgame-btn">Nuova partita</button>
    </div>
  `;
  root.querySelector('#newgame-btn')!.addEventListener('click', startNewGame);
  if (saved) {
    root.querySelector('#continue-btn')!.addEventListener('click', () => bootGame(saved));
  }
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
let acc = 0;
function frame(now: number): void {
  const dt = Math.min(now - last, 1000); // clamp per tab in background
  last = now;
  if (state && state.outcome === 'playing' && state.speed > 0) {
    acc += dt;
    const msPerTick = 3000 / state.speed; // 1x: 1 giorno = 60s = 20 tick
    while (acc >= msPerTick) {
      acc -= msPerTick;
      tick(state);
    }
    autosave();
  }
  if (state) {
    // un errore cosmetico non deve fermare la simulazione né il loop
    try {
      if (selectedCityId && !state.cities.find(c => c.id === selectedCityId)?.alive) {
        selectedCityId = null;
      }
      cityLayer.update(state, selectedCityId);
      unitLayer.update(state);
      effects.update(state, unitLayer);
      hud.update(state);
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
  requestAnimationFrame(frame);
}

setupStartScreen();
requestAnimationFrame(frame);
