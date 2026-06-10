import { CONFIG } from './config';
import { pickWeighted, stateRand } from './rng';
import type { GameState } from './state';
import { spawnUfo } from './ufos';

export function scheduleNextWave(state: GameState): void {
  const w = CONFIG.waves;
  const waveNumber = state.wavesSpawned + 1;
  const intervalDays = Math.max(
    w.intervalMinDays,
    w.intervalBaseDays - w.intervalShrinkPerWave * state.wavesSpawned,
  );
  const jitter = Math.floor(stateRand(state) * 3); // 0..2 giorni
  const regions = [...new Set(state.cities.filter(c => c.alive).map(c => c.region))].sort();
  const region = regions[Math.floor(stateRand(state) * regions.length)];
  state.nextWave = {
    waveNumber,
    arrivalTick: state.tick + (intervalDays + jitter) * CONFIG.ticksPerDay,
    ufoCount: w.ufosBase + w.ufosPerWave * (waveNumber - 1),
    region,
  };
}

export function processWaves(state: GameState): void {
  if (state.tick < state.nextWave.arrivalTick) return;
  const inRegion = state.cities.filter(c => c.alive && c.region === state.nextWave.region);
  const pool = inRegion.length > 0 ? inRegion : state.cities.filter(c => c.alive);
  if (pool.length === 0) return; // nessuna città viva: la sconfitta è già in arrivo
  for (let i = 0; i < state.nextWave.ufoCount; i++) {
    const city = pickWeighted(state, pool, c => c.population);
    spawnUfo(state, city.id);
  }
  state.wavesSpawned++;
  scheduleNextWave(state);
}
