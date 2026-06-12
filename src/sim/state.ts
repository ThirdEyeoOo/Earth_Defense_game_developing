import citiesData from '../data/cities.json';
import { CONFIG } from './config';
import type { SimEvent } from './events';
import type { CityResource, ResourceType } from './resources';
import { emptyStockpile } from './resources';
import { stateRand } from './rng';

export interface CityState {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  population: number;
  initialPopulation: number;
  alive: boolean;
  resources: CityResource[]; // amount mutabili in partita (copiati dal JSON)
  embassy: boolean; // collegata alla rete della nuova umanità (il QG non la richiede)
}

export interface TransferState {
  fromCityId: string;
  toCityId: string;
  ticksRemaining: number;
  totalTicks: number;
}

export interface SquadronState {
  id: number;
  hp: number;
  cityId: string; // città di stanza; durante un trasferimento è la destinazione
  transfer: TransferState | null; // non-null = in volo, non combatte
}

export type UfoPhase = 'approaching' | 'orbiting' | 'descending' | 'abducting' | 'escaping';

export interface UfoState {
  id: number;
  hp: number;
  targetCityId: string;
  phase: UfoPhase;
  ticksRemaining: number; // tick alla fine della fase corrente
  abducted: number; // contatore di bordo, accumula 0.5/tick in abducting
  spawnDir: { x: number; y: number; z: number }; // direzione di arrivo dallo spazio profondo (unitaria)
}

export interface WaveState {
  waveNumber: number;
  arrivalTick: number;
  ufoCount: number;
  region: string;
}

export interface GameStats {
  ufosShotDown: number;
  populationLost: number;
  abductedTotal: number; // cumulativo, accumula a frazioni per tick: mostrare col floor
}

export type Outcome = 'playing' | 'victory' | 'defeat';

export interface GameState {
  version: number;
  seed: number;
  tick: number;
  speed: 0 | 1 | 2 | 4 | 10;
  humt: number; // Humanity Treasure, la valuta post-collasso
  resources: Record<ResourceType, number>; // magazzino globale (float: la UI mostra il floor)
  hqCityId: string | null; // null = fase di fondazione, la sim non avanza
  cities: CityState[];
  squadrons: SquadronState[];
  ufos: UfoState[];
  nextSquadronId: number;
  nextUfoId: number;
  nextWave: WaveState;
  wavesSpawned: number;
  stats: GameStats;
  outcome: Outcome;
  events: SimEvent[]; // registro recente (trimEvents), letto dalla UI senza mutarlo
  nextEventId: number;
}

interface CityRow {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  population: number;
  gdp_billion_usd: number; // lore pre-apocalisse, non entra nello stato
  gdp_post_apoc_humt: number; // ridondante (= Σ peso×amount), non entra nello stato
  resources: CityResource[];
}

export function worldPopulation(state: GameState): number {
  return state.cities.reduce((sum, c) => sum + c.population, 0);
}

export function createNewGame(seed: number): GameState {
  // mapping esplicito: i campi gdp_* restano nel JSON; deep-copy delle risorse
  // perché il modulo JSON importato è un singleton e gli amount sono mutabili
  const cities: CityState[] = (citiesData as CityRow[]).map(c => ({
    id: c.id,
    name: c.name,
    country: c.country,
    region: c.region,
    lat: c.lat,
    lon: c.lon,
    population: c.population,
    initialPopulation: c.population,
    alive: true,
    resources: c.resources.map(r => ({ ...r })),
    embassy: false,
  }));
  const state: GameState = {
    version: CONFIG.saveVersion,
    seed,
    tick: 0,
    speed: 1,
    humt: 0, // il mondo è collassato: si parte da zero, fino alla fondazione del QG
    resources: emptyStockpile(),
    hqCityId: null,
    cities,
    squadrons: [],
    ufos: [],
    nextSquadronId: 1,
    nextUfoId: 1,
    nextWave: { waveNumber: 1, arrivalTick: 0, ufoCount: CONFIG.waves.ufosBase, region: '' },
    wavesSpawned: 0,
    stats: { ufosShotDown: 0, populationLost: 0, abductedTotal: 0 },
    outcome: 'playing',
    events: [],
    nextEventId: 1,
  };
  const w = CONFIG.waves;
  const day =
    w.firstWaveDayMin + Math.floor(stateRand(state) * (w.firstWaveDayMax - w.firstWaveDayMin + 1));
  const regions = [...new Set(cities.map(c => c.region))].sort();
  state.nextWave.arrivalTick = day * CONFIG.ticksPerDay;
  state.nextWave.region = regions[Math.floor(stateRand(state) * regions.length)];
  return state;
}
