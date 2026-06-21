import { cityName, countryName, t } from '../i18n';
import { CONFIG } from '../sim/config';
import { cityPotential, cityProductionPerDay, embassyCost, isConnected } from '../sim/economy';
import type { Cost, ResourceType } from '../sim/resources';
import { squadronCost } from '../sim/squadrons';
import type { CityState, GameState } from '../sim/state';
import { fmtDecimal1, fmtInt } from './format';
import { resourceIcon } from './resourceIcons';

export interface CityPanelCallbacks {
  onBuild(cityId: string): void;
  onStartTransfer(squadronId: number): void;
  onFoundHq(cityId: string): void;
  onBuildEmbassy(cityId: string): void;
}

function canAfford(state: GameState, cost: Cost): boolean {
  return (
    state.humt >= cost.humt &&
    Object.entries(cost.resources).every(
      ([type, amount]) => state.resources[type as ResourceType] >= amount,
    )
  );
}

// elenco risorse della città: quota % di ogni risorsa sul totale della città (le 10
// quote sommano a 100%) + produzione GIORNALIERA di beni se la città è collegata. In testa
// il Potenziale (Σ amount /1000) = livello di sviluppo (la quota % da sola non lo mostra).
function resourcesHtml(state: GameState, city: CityState): string {
  const connected = isConnected(state, city);
  const prod = cityProductionPerDay(city); // beni/giorno per tipo (curva unica)
  const pot = cityPotential(city);
  const rows = city.resources
    .map(r => {
      const share = pot > 0 ? (r.amount / pot) * 100 : 0;
      const perDay = connected
        ? ` <small>${t('panel.productionPerDay', { n: fmtDecimal1(prod[r.type]!) })}</small>`
        : '';
      return `<li>${resourceIcon(r.type)}${t(`res.${r.type}`)}: <strong>${t('panel.resourcePct', { n: fmtDecimal1(share) })}</strong>${perDay}</li>`;
    })
    .join('');
  const potLine = `<p class="city-potential">${t('panel.cityPotential', { n: pot })}</p>`;
  return `<h3>${t('panel.resources')}</h3>${potLine}<ul class="resource-list">${rows}</ul>`;
}

function networkStatus(state: GameState, city: CityState): string {
  if (!city.alive) return `<p class="danger">${t('panel.cityDestroyed')}</p>`;
  if (city.id === state.hqCityId) return `<p class="network-hq">${t('panel.networkHq')}</p>`;
  if (city.embassy) return `<p class="network-connected">${t('panel.networkConnected')}</p>`;
  return `<p class="network-neutral">${t('panel.networkNeutral')}</p>`;
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
      const header = `
        <h2>${cityName(city.id, city.name)} <small>(${countryName(city.country)})</small></h2>
        <p>${t('panel.population')} <strong>${fmtInt(city.population)}</strong></p>
      `;

      // fase di fondazione: solo informazioni e bottone "fonda qui"
      if (state.hqCityId === null) {
        const kit = CONFIG.economy.starterKit;
        root.innerHTML = `
          ${header}
          ${resourcesHtml(state, city)}
          <button id="found-hq-btn" ${city.alive ? '' : 'disabled'}>${t('panel.foundHq')}</button>
          <p><small>${t('panel.starterKit', {
            humt: fmtInt(kit.humt),
            ind: kit.resources.industria,
            fuel: kit.resources.combustibili_fossili,
            agro: kit.resources.agroalimentare,
          })}</small></p>
          <p id="panel-error" class="danger"></p>
        `;
        root.querySelector('#found-hq-btn')!.addEventListener('click', () => cb.onFoundHq(city.id));
        return;
      }

      const stationed = state.squadrons.filter(s => s.cityId === city.id && s.transfer === null);
      const inbound = state.squadrons.filter(s => s.cityId === city.id && s.transfer !== null);
      const cost = squadronCost(state, city.id);
      const ufosHere = state.ufos.filter(u => u.targetCityId === city.id).length;
      const connected = isConnected(state, city);
      const embassy = !connected && city.alive ? embassyCost(state, city.id) : null;
      root.innerHTML = `
        ${header}
        ${networkStatus(state, city)}
        ${ufosHere > 0 ? `<p class="danger">${t('panel.ufosInArea', { n: ufosHere })}</p>` : ''}
        ${resourcesHtml(state, city)}
        ${
          embassy
            ? `<button id="embassy-btn" ${canAfford(state, embassy) ? '' : 'disabled'}>
                 ${t('panel.openEmbassy', {
                   humt: fmtInt(embassy.humt),
                   agro: embassy.resources.agroalimentare ?? 0,
                 })}
               </button>`
            : ''
        }
        <h3>${t('panel.squadrons', { n: stationed.length })}</h3>
        <ul id="squadron-list"></ul>
        ${inbound.length > 0 ? `<p>${t('panel.inbound', { n: inbound.length })}</p>` : ''}
        <button id="build-btn" ${!canAfford(state, cost) || !city.alive ? 'disabled' : ''}>
          ${t('panel.build', {
            humt: fmtInt(cost.humt),
            ind: cost.resources.industria ?? 0,
            fuel: cost.resources.combustibili_fossili ?? 0,
          })}
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
      root
        .querySelector('#embassy-btn')
        ?.addEventListener('click', () => cb.onBuildEmbassy(city.id));
    },
  };
}
