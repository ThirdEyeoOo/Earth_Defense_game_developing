import { t } from '../i18n';
import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';
import { worldPopulation } from '../sim/state';
import { fmtClock, fmtDate, fmtInt } from './format';
import { gearIcon } from './icons';

const SPEEDS: Array<0 | 1 | 2 | 4 | 10> = [0, 1, 2, 4, 10];

export function createHud(
  root: HTMLElement,
  onSetSpeed: (speed: 0 | 1 | 2 | 4 | 10) => void,
  onToggleRadar: () => void,
  onSave: () => void,
  onOpenSettings: () => void,
): { update(state: GameState, tickFloat: number): void; refreshLabels(): void } {
  root.innerHTML = `
    <span id="hud-date"></span>
    <span id="hud-credits"></span>
    <span id="hud-pop"></span>
    <span id="hud-abd"></span>
    <span id="hud-dead"></span>
    <span id="hud-wave"></span>
    <span id="hud-speeds"></span>
    <button id="hud-radar"></button>
    <button id="hud-save"></button>
    <button id="hud-settings" class="icon-btn">${gearIcon}</button>
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
  root.querySelector('#hud-settings')!.addEventListener('click', onOpenSettings);

  function refreshLabels(): void {
    root.querySelector('#hud-radar')!.textContent = t('hud.radar');
    root.querySelector('#hud-save')!.textContent = t('hud.save');
    root.querySelector('#hud-settings')!.setAttribute('title', t('settings.open'));
  }
  refreshLabels();

  return {
    refreshLabels,
    update(state: GameState, tickFloat: number) {
      root.querySelector('#hud-date')!.textContent =
        `${fmtDate(state.tick)} — ${fmtClock(tickFloat)}`;
      root.querySelector('#hud-credits')!.textContent = t('hud.credits', {
        n: fmtInt(state.credits),
      });
      root.querySelector('#hud-pop')!.textContent = t('hud.pop', {
        n: fmtInt(worldPopulation(state)),
      });
      root.querySelector('#hud-abd')!.textContent = t('hud.abductions', {
        n: fmtInt(Math.floor(state.stats.abductedTotal)),
      });
      root.querySelector('#hud-dead')!.textContent = t('hud.dead', {
        n: fmtInt(state.stats.populationLost),
      });
      const days = Math.max(0, dayOfTick(state.nextWave.arrivalTick) - dayOfTick(state.tick));
      root.querySelector('#hud-wave')!.textContent =
        state.ufos.length > 0 ? t('hud.attackInProgress') : t('hud.nextWave', { days });
      for (const btn of speedsEl.querySelectorAll('button')) {
        btn.classList.toggle('active', Number(btn.dataset.speed) === state.speed);
      }
    },
  };
}
