import { t } from '../i18n';
import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';
import { worldPopulation } from '../sim/state';
import { fmtInt } from './format';

export function createEndScreen(
  root: HTMLElement,
  onNewGame: () => void,
): { update(state: GameState): void; refresh(state: GameState): void } {
  let shown = false;

  function render(state: GameState): void {
    const victory = state.outcome === 'victory';
    root.innerHTML = `
      <div class="end-box">
        <h1>${victory ? t('end.victory') : t('end.defeat')}</h1>
        <p>${t('end.daysSurvived')} <strong>${dayOfTick(state.tick)}</strong></p>
        <p>${t('end.popSaved')} <strong>${fmtInt(worldPopulation(state))}</strong></p>
        <p>${t('end.popLost')} <strong>${fmtInt(state.stats.populationLost)}</strong></p>
        <p>${t('end.ufosShot')} <strong>${state.stats.ufosShotDown}</strong></p>
        <button id="new-game-btn">${t('end.newGame')}</button>
      </div>
    `;
    root.querySelector('#new-game-btn')!.addEventListener('click', onNewGame);
  }

  return {
    update(state: GameState) {
      if (state.outcome === 'playing') {
        shown = false;
        root.classList.add('hidden');
        return;
      }
      if (shown) return;
      shown = true;
      root.classList.remove('hidden');
      render(state);
    },
    // re-render al cambio lingua, solo se la schermata è già visibile
    // (innerHTML scarta il vecchio listener: nessun doppio click handler)
    refresh(state: GameState) {
      if (shown && state.outcome !== 'playing') render(state);
    },
  };
}
