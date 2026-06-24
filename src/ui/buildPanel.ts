import { cityName, t, type MessageKey } from '../i18n';
import { vehicleCatalog, type Buildable } from '../sim/buildables';
import { isConnected } from '../sim/economy';
import type { Cost, ResourceType } from '../sim/resources';
import { squadronCost } from '../sim/squadrons';
import type { GameState, StructureType } from '../sim/state';
import { buildableIconSVG } from './buildableIcons';
import { fmtInt } from './format';
import { createStructureGrid } from './structureGrid';

// Pannello Costruisci (pulsante della barra inferiore): hub di costruzione con due
// sotto-pagine — "Assemblaggio veicoli" (oggi: F-22) e "Costruzione su città" (griglia
// esagonale di strutture, Fase 2). Modale come researchPanel/encyclopedia: Esc chiude in
// capture-phase. Lo scheletro si costruisce una volta; i pezzi dinamici (costo, abilitazione)
// si aggiornano a ogni frame senza ridisegnare (così il <select> non perde la selezione).

export interface BuildPanelCallbacks {
  getState(): GameState;
  onBuildSquadron(cityId: string): void;
  onBuildStructure(cityId: string, cell: number, type: StructureType): void;
  onRepairStructure(cityId: string, structureId: number): void;
  onRemoveStructure(cityId: string, structureId: number): void;
}

type Tab = 'assemblaggio' | 'costruzione';

function canAfford(state: GameState, cost: Cost): boolean {
  return (
    state.humt >= cost.humt &&
    Object.entries(cost.resources).every(
      ([type, amount]) => state.resources[type as ResourceType] >= amount,
    )
  );
}

export function createBuildPanel(
  root: HTMLElement,
  cb: BuildPanelCallbacks,
): {
  toggle(): void;
  isOpen(): boolean;
  update(state: GameState): void;
  refresh(): void;
} {
  let built = false;
  let tab: Tab = 'assemblaggio';
  let buildCityId: string | null = null;
  let contentKey = ''; // ricostruisce le pagine solo quando cambiano rete/ricerche

  let asmPage: HTMLElement;
  let cstPage: HTMLElement;
  let grid: ReturnType<typeof createStructureGrid> | null = null;

  function isOpen(): boolean {
    return !root.classList.contains('hidden');
  }
  function close(): void {
    root.classList.add('hidden');
  }

  // etichette statiche: aggiornate in place al cambio lingua (lo scheletro non si ricostruisce)
  function setLabels(): void {
    root.querySelector('.build-title')!.textContent = t('build.title');
    root.querySelector('[data-tab="assemblaggio"]')!.textContent = t('build.tab.vehicles');
    root.querySelector('[data-tab="costruzione"]')!.textContent = t('build.tab.structures');
    root.querySelector('#build-close')!.textContent = t('build.close');
  }

  function buildSkeleton(): void {
    root.innerHTML = `
      <div class="build-box">
        <div class="build-head">
          <div class="build-titles">
            <div class="build-title">${t('build.title')}</div>
            <div class="build-tabs">
              <button class="build-tab" data-tab="assemblaggio">${t('build.tab.vehicles')}</button>
              <button class="build-tab" data-tab="costruzione">${t('build.tab.structures')}</button>
            </div>
          </div>
          <button class="build-close" id="build-close">${t('build.close')}</button>
        </div>
        <div class="build-body">
          <div class="build-page" data-page="assemblaggio"></div>
          <div class="build-page" data-page="costruzione"></div>
        </div>
      </div>`;
    asmPage = root.querySelector('[data-page="assemblaggio"]')!;
    cstPage = root.querySelector('[data-page="costruzione"]')!;
    for (const b of root.querySelectorAll<HTMLButtonElement>('.build-tab')) {
      b.addEventListener('click', () => {
        tab = b.dataset.tab as Tab;
        applyTab();
      });
    }
    root.querySelector('#build-close')!.addEventListener('click', close);
    // la griglia strutture monta dentro la pagina "costruzione" (creata una sola volta:
    // ha listener su window/document che non vanno duplicati)
    grid = createStructureGrid(cstPage, {
      onBuild: (cityId, cell, type) => cb.onBuildStructure(cityId, cell, type),
      onRepair: (cityId, id) => cb.onRepairStructure(cityId, id),
      onRemove: (cityId, id) => cb.onRemoveStructure(cityId, id),
    });
    built = true;
  }

  function applyTab(): void {
    for (const p of root.querySelectorAll<HTMLElement>('.build-page')) {
      p.classList.toggle('active', p.dataset.page === tab);
    }
    for (const b of root.querySelectorAll<HTMLButtonElement>('.build-tab')) {
      b.classList.toggle('active', b.dataset.tab === tab);
    }
  }

  // selettore città: opzioni = città collegate alla rete (QG + ambasciate)
  function connectedCities(state: GameState) {
    return state.cities.filter(c => isConnected(state, c));
  }

  // tavolozza veicoli + selettore città; ricostruita solo al cambio rete/ricerche
  function renderAssemblaggio(state: GameState): void {
    const cities = connectedCities(state);
    if (cities.length === 0) {
      asmPage.innerHTML = `<p class="build-empty">${t('build.noCities')}</p>`;
      return;
    }
    if (!buildCityId || !cities.some(c => c.id === buildCityId)) buildCityId = cities[0].id;
    const vehicles = vehicleCatalog(state);
    const opts = cities
      .map(
        c =>
          `<option value="${c.id}" ${c.id === buildCityId ? 'selected' : ''}>${cityName(c.id, c.name)}</option>`,
      )
      .join('');
    const cards = vehicles.length
      ? vehicles.map(v => cardHtml(v)).join('') + comingSoonHtml()
      : `<p class="build-empty">${t('build.locked')}</p>` + comingSoonHtml();
    asmPage.innerHTML = `
      <label class="build-citysel">${t('build.selectCity')}
        <select id="build-city">${opts}</select>
      </label>
      <div class="build-cards">${cards}</div>
      <p id="build-error" class="danger"></p>`;
    const sel = asmPage.querySelector<HTMLSelectElement>('#build-city')!;
    sel.addEventListener('change', () => {
      buildCityId = sel.value;
      updateDynamic(state);
    });
    asmPage.querySelector('#build-f22')?.addEventListener('click', () => {
      if (buildCityId) cb.onBuildSquadron(buildCityId);
    });
  }

  function cardHtml(v: Buildable): string {
    // costo F-22 = squadronCost (dipende dalla città scelta): lo riempie updateDynamic
    const btn =
      v.id === 'f22'
        ? `<button id="build-f22" class="build-cta"></button>`
        : `<button class="build-cta" disabled></button>`;
    return `
      <div class="build-card" style="--c:${v.accent};--g:${v.glow}">
        <span class="build-ico"><svg viewBox="-20 -20 40 40">${buildableIconSVG(v.id)}</svg></span>
        <div class="build-meta">
          <b>${t(v.nameKey as MessageKey)}</b><small>${t(v.catKey as MessageKey)}</small>
        </div>
        ${btn}
      </div>`;
  }

  function comingSoonHtml(): string {
    return `<div class="build-card build-card--soon"><span class="build-ico"></span>
      <div class="build-meta"><b>${t('build.comingSoon')}</b></div></div>`;
  }

  // aggiorna costo F-22 + abilitazione del bottone, senza ridisegnare la pagina
  function updateDynamic(state: GameState): void {
    const f22 = asmPage?.querySelector<HTMLButtonElement>('#build-f22');
    if (f22 && buildCityId) {
      const cost = squadronCost(state, buildCityId);
      f22.textContent = t('panel.build', {
        humt: fmtInt(cost.humt),
        ind: cost.resources.industria ?? 0,
        fuel: cost.resources.combustibili_fossili ?? 0,
      });
      f22.disabled = !canAfford(state, cost);
    }
  }

  function render(state: GameState): void {
    if (!built) buildSkeleton();
    renderAssemblaggio(state);
    grid?.update(state);
    applyTab();
    updateDynamic(state);
  }

  function open(): void {
    const state = cb.getState();
    render(state);
    contentKey = keyOf(state);
    root.classList.remove('hidden');
  }

  function keyOf(state: GameState): string {
    const conn = state.cities
      .filter(c => isConnected(state, c))
      .map(c => c.id)
      .join(',');
    return `${conn}|${state.research.unlocked.join(',')}`;
  }

  // click sul fondale (fuori dal box) = chiusura (agganciato una sola volta su root,
  // sopravvive alle ricostruzioni di innerHTML)
  root.addEventListener('click', event => {
    if (event.target === root) close();
  });
  // Esc chiude solo questa finestra (capture: non raggiunge l'handler di main.ts)
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
    toggle() {
      if (isOpen()) close();
      else open();
    },
    isOpen,
    update(state: GameState) {
      if (!isOpen()) return;
      const key = keyOf(state);
      if (key !== contentKey) {
        contentKey = key;
        renderAssemblaggio(state);
        applyTab();
      }
      updateDynamic(state);
      grid?.update(state);
    },
    refresh() {
      // cambio lingua: aggiorna le etichette in place + ridisegna i contenuti (lo scheletro
      // e la griglia NON si ricreano, così i loro listener restano unici)
      if (!built) return;
      setLabels();
      renderAssemblaggio(cb.getState());
      grid?.refresh();
    },
  };
}
