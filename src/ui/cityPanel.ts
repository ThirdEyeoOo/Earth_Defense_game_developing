import { cityName, countryName, t } from '../i18n';
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
        <h2>${cityName(city.id, city.name)} <small>(${countryName(city.country)})</small></h2>
        <p>${t('panel.population')} <strong>${fmtInt(city.population)}</strong></p>
        ${city.alive ? '' : `<p class="danger">${t('panel.cityDestroyed')}</p>`}
        ${ufosHere > 0 ? `<p class="danger">${t('panel.ufosInArea', { n: ufosHere })}</p>` : ''}
        <h3>${t('panel.squadrons', { n: stationed.length })}</h3>
        <ul id="squadron-list"></ul>
        ${inbound.length > 0 ? `<p>${t('panel.inbound', { n: inbound.length })}</p>` : ''}
        <button id="build-btn" ${state.credits < cost || !city.alive ? 'disabled' : ''}>
          ${t('panel.build', { cost: fmtInt(cost) })}
        </button>
        <p id="panel-error" class="danger"></p>
      `;
      const list = root.querySelector('#squadron-list')!;
      for (const sq of stationed) {
        const li = document.createElement('li');
        li.innerHTML = `${t('panel.squadronItem', { id: sq.id, hp: sq.hp })} `;
        const btn = document.createElement('button');
        btn.textContent = t('panel.transfer');
        btn.addEventListener('click', () => cb.onStartTransfer(sq.id));
        li.appendChild(btn);
        list.appendChild(li);
      }
      root.querySelector('#build-btn')!.addEventListener('click', () => cb.onBuild(city.id));
    },
  };
}
