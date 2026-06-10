import { CONFIG } from './config';
import type { GameState } from './state';

export function travelTicks(): number {
  const u = CONFIG.ufoAbductor;
  return Math.ceil((u.descentKm / u.speedKmPerDay) * CONFIG.ticksPerDay);
}

export function spawnUfo(state: GameState, targetCityId: string): void {
  state.ufos.push({
    id: state.nextUfoId++,
    hp: CONFIG.ufoAbductor.hp,
    targetCityId,
    phase: 'descending',
    ticksRemaining: travelTicks(),
    abducted: 0,
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
      ufo.ticksRemaining = travelTicks();
      continue;
    }
    ufo.ticksRemaining--;
    if (ufo.phase === 'abducting') ufo.abducted += perTick;
    if (ufo.ticksRemaining > 0) continue;
    if (ufo.phase === 'descending') {
      ufo.phase = 'abducting';
      ufo.ticksRemaining = abductionTicks;
    } else if (ufo.phase === 'abducting') {
      ufo.phase = 'escaping';
      ufo.ticksRemaining = travelTicks();
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
