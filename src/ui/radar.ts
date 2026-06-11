import { regionName, t } from '../i18n';
import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';

export function createRadar(root: HTMLElement): {
  toggle(): void;
  update(state: GameState): void;
} {
  return {
    toggle() {
      root.classList.toggle('hidden');
    },
    update(state: GameState) {
      if (root.classList.contains('hidden')) return;
      const days = Math.max(0, dayOfTick(state.nextWave.arrivalTick) - dayOfTick(state.tick));
      root.innerHTML = `
        <h2>${t('radar.title')}</h2>
        <p>${t('radar.nextWave')} <strong>${t('radar.waveN', { n: state.nextWave.waveNumber })}</strong></p>
        <p>${t('radar.eta')} <strong>${t('radar.etaDays', { n: days })}</strong></p>
        <p>${t('radar.strength')} <strong>${t('radar.strengthUfos', { n: state.nextWave.ufoCount })}</strong></p>
        <p>${t('radar.region')} <strong>${regionName(state.nextWave.region)}</strong></p>
        <p>${t('radar.ufosNow')} <strong>${state.ufos.length}</strong></p>
      `;
    },
  };
}
