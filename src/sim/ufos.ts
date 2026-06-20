import { CONFIG } from './config';
import { emitEvent } from './events';
import { latLonToVec3 } from './geo';
import {
  computeCaptureSweep,
  cruiseTicks,
  freefallTicks,
  lunarCrossTick,
  orbitPhaseTicks,
  type OrbitalParams,
} from './orbit';
import { stateRand } from './rng';
import type { GameState, UfoPhase, UfoState } from './state';

type LatLon = { lat: number; lon: number };

// accelerazione di spinta dell'UFO (F/m): cattura, hover e salita sono propulse
function abductorThrust(): number {
  return CONFIG.ufoAbductor.thrust / CONFIG.ufoAbductor.mass;
}

// distanza FISICA di comparsa (raggi): governa il TEMPO di crociera (non il render)
function physicalStartDistance(): number {
  return CONFIG.ufoAbductor.startDistanceAu * CONFIG.physics.auInRadii;
}

// direzione (unitaria) della città bersaglio: stessa formula del render (geo)
function cityDirection(city: LatLon): { x: number; y: number; z: number } {
  const v = latLonToVec3(city.lat, city.lon, 1);
  const l = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

// parametri di traiettoria per un UFO diretto a `city`
export function buildOrbit(spawnDir: OrbitalParams['spawnDir'], city: LatLon): OrbitalParams {
  const phys = CONFIG.physics;
  const base: OrbitalParams = {
    spawnDir,
    cityDir: cityDirection(city),
    startDistance: phys.visualStartDistance,
    orbitRadius: phys.orbitRadius,
    surfaceRadius: phys.surfaceRadius,
    orbits: CONFIG.ufoAbductor.orbits,
    mu: phys.mu,
    aThrust: abductorThrust(),
    captureSweep: 0,
  };
  // virata di cattura tarata sulla durata di crociera → arrivo tangente all'orbita
  return { ...base, captureSweep: computeCaptureSweep(base, approachDuration()) };
}

// durate di fase derivate dalla fisica (tick interi)
export function approachDuration(): number {
  return cruiseTicks(physicalStartDistance(), abductorThrust());
}
export function orbitDuration(orbit: OrbitalParams): number {
  return orbitPhaseTicks(orbit);
}
export function descentDuration(orbit: OrbitalParams): number {
  return freefallTicks(orbit.orbitRadius, orbit.surfaceRadius, orbit.mu);
}

export function spawnUfo(state: GameState, targetCityId: string): void {
  const city = state.cities.find(c => c.id === targetCityId)!;
  // direzione di arrivo uniforme sulla sfera (deterministica dal seed)
  const z = 2 * stateRand(state) - 1;
  const theta = 2 * Math.PI * stateRand(state);
  const r = Math.sqrt(Math.max(0, 1 - z * z));
  const spawnDir = { x: r * Math.cos(theta), y: z, z: r * Math.sin(theta) };
  const orbit = buildOrbit(spawnDir, city);
  const cruise = approachDuration();
  state.ufos.push({
    id: state.nextUfoId++,
    hp: CONFIG.ufoAbductor.hp,
    targetCityId,
    phase: 'approaching',
    ticksRemaining: cruise,
    phaseTotalTicks: cruise,
    phaseStartFraction: 0,
    abducted: 0,
    spawnDir,
    orbit,
    lunarCrossTick: lunarCrossTick(physicalStartDistance(), CONFIG.physics.lunarDistance, cruise),
  });
}

// imposta la fase successiva con la durata fisica corrispondente. Le transizioni del
// tick avvengono a bordo di tick ⇒ frazione iniziale ~0.
function enterPhase(ufo: UfoState, phase: UfoPhase, duration: number): void {
  ufo.phase = phase;
  ufo.ticksRemaining = duration;
  ufo.phaseTotalTicks = duration;
  ufo.phaseStartFraction = 0;
}

// Avvio della fuga a capienza piena / città esaurita. Il rapimento ora avviene in
// TEMPO REALE (src/render/abductionEngine.ts → cmdAbduct), quindi è il comando a
// decidere questa transizione, non più il tick. `startFraction` è la frazione del tick
// in cui scatta la fuga: memorizzata così il render fa partire il progresso da 0 esatto
// (la fuga parte dal punto in cui l'UFO si trova, a velocità 0).
export function startEscape(ufo: UfoState, startFraction = 0): void {
  enterPhase(ufo, 'escaping', descentDuration(ufo.orbit));
  ufo.phaseStartFraction = startFraction;
}

export function progressUfos(state: GameState): void {
  const u = CONFIG.ufoAbductor;
  const capacity = u.captureCapacity;
  const perTick = u.abductionPerDay / CONFIG.ticksPerDay;
  // durata STIMATA della fase di rapimento (solo per la barra di progresso/animazioni):
  // la fase finisce davvero a capienza piena o città esaurita, non a tempo.
  const estTicks = Math.max(1, Math.ceil(capacity / perTick));
  for (const ufo of [...state.ufos]) {
    const city = state.cities.find(c => c.id === ufo.targetCityId)!;
    if (!city.alive && ufo.phase !== 'escaping') {
      enterPhase(ufo, 'escaping', descentDuration(ufo.orbit));
      continue;
    }
    ufo.ticksRemaining--;
    // Il prelievo delle persone NON avviene più qui: è in tempo reale, uno alla volta,
    // nell'AbductionEngine (src/render). Il tick mantiene solo la macchina a fasi e, per
    // la fase 'abducting', un fallback a tempo (durata stimata scaduta → fuga).
    if (ufo.ticksRemaining > 0) continue;
    if (ufo.phase === 'approaching') {
      enterPhase(ufo, 'orbiting', orbitDuration(ufo.orbit));
      emitEvent(state, { type: 'ufoOrbiting', unitKind: 'ufo', unitId: ufo.id, cityId: city.id });
    } else if (ufo.phase === 'orbiting') {
      enterPhase(ufo, 'descending', descentDuration(ufo.orbit));
      emitEvent(state, { type: 'ufoDescending', unitKind: 'ufo', unitId: ufo.id, cityId: city.id });
    } else if (ufo.phase === 'descending') {
      enterPhase(ufo, 'abducting', estTicks);
      emitEvent(state, { type: 'ufoAbducting', unitKind: 'ufo', unitId: ufo.id, cityId: city.id });
    } else if (ufo.phase === 'abducting') {
      enterPhase(ufo, 'escaping', descentDuration(ufo.orbit)); // fallback: stima scaduta
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
