import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';
import { worldPopulation } from '../sim/state';
import { fmtClock, fmtDate, fmtInt } from './format';

const SPEEDS: Array<0 | 1 | 2 | 4 | 10> = [0, 1, 2, 4, 10];

export function createHud(
  root: HTMLElement,
  onSetSpeed: (speed: 0 | 1 | 2 | 4 | 10) => void,
  onToggleRadar: () => void,
  onSave: () => void,
): { update(state: GameState, tickFloat: number): void } {
  root.innerHTML = `
    <span id="hud-date"></span>
    <span id="hud-credits"></span>
    <span id="hud-pop"></span>
    <span id="hud-abd"></span>
    <span id="hud-dead"></span>
    <span id="hud-wave"></span>
    <span id="hud-speeds"></span>
    <button id="hud-radar">Radar</button>
    <button id="hud-save">Salva</button>
  `;
  const speedsEl = root.querySelector('#hud-speeds')!;
  for (const sp of SPEEDS) {
    const btn = document.createElement('button');
    btn.textContent = sp === 0 ? '❚❚' : `${sp}x`;
    btn.dataset.speed = String(sp);
    btn.addEventListener('click', () => onSetSpeed(sp));
    speedsEl.appendChild(btn);
  }
  root.querySelector('#hud-radar')!.addEventListener('click', onToggleRadar);
  root.querySelector('#hud-save')!.addEventListener('click', onSave);

  return {
    update(state: GameState, tickFloat: number) {
      root.querySelector('#hud-date')!.textContent =
        `${fmtDate(state.tick)} — ${fmtClock(tickFloat)}`;
      root.querySelector('#hud-credits')!.textContent = `₡ ${fmtInt(state.credits)}`;
      root.querySelector('#hud-pop')!.textContent = `Pop. ${fmtInt(worldPopulation(state))}`;
      root.querySelector('#hud-abd')!.textContent =
        `Abductions: ${fmtInt(Math.floor(state.stats.abductedTotal))}`;
      root.querySelector('#hud-dead')!.textContent = `Morti: ${fmtInt(state.stats.populationLost)}`;
      const days = Math.max(0, dayOfTick(state.nextWave.arrivalTick) - dayOfTick(state.tick));
      root.querySelector('#hud-wave')!.textContent =
        state.ufos.length > 0 ? '⚠ ATTACCO IN CORSO' : `Prossima ondata: ${days}g`;
      for (const btn of speedsEl.querySelectorAll('button')) {
        btn.classList.toggle('active', Number(btn.dataset.speed) === state.speed);
      }
    },
  };
}
