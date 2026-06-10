import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';
import { worldPopulation } from '../sim/state';
import { fmtInt } from './format';

export function createEndScreen(
  root: HTMLElement,
  onNewGame: () => void,
): { update(state: GameState): void } {
  let shown = false;
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
      const victory = state.outcome === 'victory';
      root.innerHTML = `
        <div class="end-box">
          <h1>${victory ? 'LA TERRA È SALVA' : 'LA TERRA È CADUTA'}</h1>
          <p>Giorni sopravvissuti: <strong>${dayOfTick(state.tick)}</strong></p>
          <p>Popolazione salvata: <strong>${fmtInt(worldPopulation(state))}</strong></p>
          <p>Popolazione perduta: <strong>${fmtInt(state.stats.populationLost)}</strong></p>
          <p>UFO abbattuti: <strong>${state.stats.ufosShotDown}</strong></p>
          <button id="new-game-btn">Nuova partita</button>
        </div>
      `;
      root.querySelector('#new-game-btn')!.addEventListener('click', onNewGame);
    },
  };
}
