import { t } from '../i18n';
import { CONFIG } from '../sim/config';
import { dailyIncome, dailyProductionByType, isConnected } from '../sim/economy';
import { RESOURCE_TYPES } from '../sim/resources';
import type { GameState } from '../sim/state';
import { fmtInt } from './format';
import { resourceIcon } from './resourceIcons';

// risorse dalla più importante alla meno importante (peso 10 → 1); a parità di
// peso vale l'ordine di RESOURCE_TYPES (sort stabile)
const RESOURCES_BY_WEIGHT = [...RESOURCE_TYPES].sort(
  (a, b) => CONFIG.economy.resourceWeights[b] - CONFIG.economy.resourceWeights[a],
);

// Pannello Bilancio (pulsante della barra inferiore): magazzino risorse con
// produzione giornaliera, gettito HumT e stato della rete. Pattern di radar.ts.
export function createBalancePanel(root: HTMLElement): {
  toggle(): void;
  update(state: GameState): void;
} {
  return {
    toggle() {
      root.classList.toggle('hidden');
    },
    update(state: GameState) {
      if (root.classList.contains('hidden')) return;
      const production = dailyProductionByType(state);
      const connected = state.cities.filter(c => isConnected(state, c)).length;
      const rows = RESOURCES_BY_WEIGHT.map(
        type => `
          <tr>
            <td class="res-name">${resourceIcon(type)}<span class="res-label">${t(`res.${type}`)}</span></td>
            <td class="num">${fmtInt(Math.floor(state.resources[type]))}</td>
            <td class="num gain">${t('panel.productionPerDay', { n: production[type].toFixed(1) })}</td>
          </tr>`,
      ).join('');
      root.innerHTML = `
        <h2>${t('balance.title')}</h2>
        <p>${t('balance.incomePerDay')} <strong>${t('hud.humt', { n: fmtInt(dailyIncome(state)) })}</strong></p>
        <p>${t('balance.connectedCities')} <strong>${connected}/${state.cities.length}</strong></p>
        <table class="balance-table">
          <colgroup>
            <col class="col-name" />
            <col class="col-stock" />
            <col class="col-prod" />
          </colgroup>
          <tr>
            <th></th>
            <th class="num">${t('balance.stock')}</th>
            <th class="num">${t('balance.productionPerDay')}</th>
          </tr>
          ${rows}
        </table>
      `;
    },
  };
}
