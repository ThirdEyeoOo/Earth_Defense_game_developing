import { squadronCost } from '../sim/squadrons';
import type { GameState } from '../sim/state';
import { fmtInt } from './format';

export interface CityPanelCallbacks {
  onBuild(cityId: string): void;
  onStartTransfer(squadronId: number): void;
}

export function createCityPanel(
  root: HTMLElement,
  cb: CityPanelCallbacks,
): { update(state: GameState, selectedCityId: string | null): void } {
  return {
    update(state: GameState, selectedCityId: string | null) {
      const city = state.cities.find(c => c.id === selectedCityId);
      if (!city) {
        root.classList.add('hidden');
        return;
      }
      root.classList.remove('hidden');
      const stationed = state.squadrons.filter(s => s.cityId === city.id && s.transfer === null);
      const inbound = state.squadrons.filter(s => s.cityId === city.id && s.transfer !== null);
      const cost = squadronCost(state, city.id);
      const ufosHere = state.ufos.filter(u => u.targetCityId === city.id).length;
      root.innerHTML = `
        <h2>${city.name} <small>(${city.country})</small></h2>
        <p>Popolazione: <strong>${fmtInt(city.population)}</strong></p>
        ${city.alive ? '' : '<p class="danger">CITTÀ DISTRUTTA</p>'}
        ${ufosHere > 0 ? `<p class="danger">⚠ ${ufosHere} UFO in zona</p>` : ''}
        <h3>Squadroni (${stationed.length})</h3>
        <ul id="squadron-list"></ul>
        ${inbound.length > 0 ? `<p>${inbound.length} in arrivo</p>` : ''}
        <button id="build-btn" ${state.credits < cost || !city.alive ? 'disabled' : ''}>
          Costruisci squadrone (₡ ${fmtInt(cost)})
        </button>
        <p id="panel-error" class="danger"></p>
      `;
      const list = root.querySelector('#squadron-list')!;
      for (const sq of stationed) {
        const li = document.createElement('li');
        li.innerHTML = `Squadrone #${sq.id} — HP ${sq.hp} `;
        const btn = document.createElement('button');
        btn.textContent = 'Trasferisci';
        btn.addEventListener('click', () => cb.onStartTransfer(sq.id));
        li.appendChild(btn);
        list.appendChild(li);
      }
      root.querySelector('#build-btn')!.addEventListener('click', () => cb.onBuild(city.id));
    },
  };
}
