import { CONFIG } from './config';
import { stateRand } from './rng';
import type { GameState } from './state';

export function approachTicks(): number {
  return Math.ceil(CONFIG.ufoAbductor.travel.approachDays * CONFIG.ticksPerDay);
}

export function orbitTicks(): number {
  const t = CONFIG.ufoAbductor.travel;
  return Math.ceil(t.orbits * t.orbitDaysPerOrbit * CONFIG.ticksPerDay);
}

export function descentTicks(): number {
  const t = CONFIG.ufoAbductor.travel;
  return Math.ceil((t.descentKm / t.atmosphereKmPerDay) * CONFIG.ticksPerDay);
}

export function spawnUfo(state: GameState, targetCityId: string): void {
  // direzione di arrivo uniforme sulla sfera (deterministica dal seed)
  const z = 2 * stateRand(state) - 1;
  const theta = 2 * Math.PI * stateRand(state);
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  state.ufos.push({
    id: state.nextUfoId++,
    hp: CONFIG.ufoAbductor.hp,
    targetCityId,
    phase: 'approaching',
    ticksRemaining: approachTicks(),
    abducted: 0,
    spawnDir: { x: r * Math.cos(theta), y: z, z: r * Math.sin(theta) },
  });
}

export function progressUfos(state: GameState): void {
  const u = CONFIG.ufoAbductor;
  const abductionTicks = u.abductionDays * CONFIG.ticksPerDay;
  const perTick = u.abductionPerDay / CONFIG.ticksPerDay;
  for (const ufo of [...state.ufos]) {
    const city = state.cities.find(c => c.id === ufo.targetCityId)!;
    if (!city.alive && ufo.phase !== 'escaping') {
      ufo.phase = 'escaping';
      ufo.ticksRemaining = descentTicks();
      continue;
    }
    ufo.ticksRemaining--;
    if (ufo.phase === 'abducting') ufo.abducted += perTick;
    if (ufo.ticksRemaining > 0) continue;
    if (ufo.phase === 'approaching') {
      ufo.phase = 'orbiting';
      ufo.ticksRemaining = orbitTicks();
    } else if (ufo.phase === 'orbiting') {
      ufo.phase = 'descending';
      ufo.ticksRemaining = descentTicks();
    } else if (ufo.phase === 'descending') {
      ufo.phase = 'abducting';
      ufo.ticksRemaining = abductionTicks;
    } else if (ufo.phase === 'abducting') {
      ufo.phase = 'escaping';
      ufo.ticksRemaining = descentTicks();
    } else {
      removeUfo(state, ufo.id, 'escaped');
    }
  }
}

// La popolazione rapita si perde quando l'UFO esce di scena, in ogni caso:
// fuga riuscita o abbattimento (i rapiti a bordo muoiono nello schianto).
export function removeUfo(state: GameState, ufoId: number, cause: 'shotDown' | 'escaped'): void {
  const ufo = state.ufos.find(x => x.id === ufoId);
  if (!ufo) return;
  const city = state.cities.find(c => c.id === ufo.targetCityId)!;
  const loss = Math.min(Math.floor(ufo.abducted), city.population);
  city.population -= loss;
  state.stats.populationLost += loss;
  if (city.population <= 0) {
    city.population = 0;
    city.alive = false;
  }
  if (cause === 'shotDown') state.stats.ufosShotDown++;
  state.ufos = state.ufos.filter(x => x.id !== ufoId);
}
