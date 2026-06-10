import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';

const REGION_NAMES: Record<string, string> = {
  asia: 'Asia',
  'middle-east': 'Medio Oriente',
  europe: 'Europa',
  africa: 'Africa',
  'north-america': 'Nord America',
  'south-america': 'Sud America',
  oceania: 'Oceania',
};

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
        <h2>Radar</h2>
        <p>Prossima ondata: <strong>ondata ${state.nextWave.waveNumber}</strong></p>
        <p>Arrivo previsto tra: <strong>${days} giorni</strong></p>
        <p>Forza stimata: <strong>${state.nextWave.ufoCount} UFO</strong></p>
        <p>Regione: <strong>${REGION_NAMES[state.nextWave.region] ?? state.nextWave.region}</strong></p>
        <p>UFO attualmente in zona: <strong>${state.ufos.length}</strong></p>
      `;
    },
  };
}
