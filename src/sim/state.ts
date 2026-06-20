import citiesData from '../data/cities.json';
import { CONFIG } from './config';
import type { SimEvent } from './events';
import type { OrbitalParams } from './orbit';
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
  // Frazione di tick in cui è partito il trasferimento (può iniziare a metà tick). Il
  // render la sottrae così la rotta parte da 0 esatto sopra la città di partenza, invece
  // che già a metà arco (i trasferimenti brevi durano pochi tick). Assente nei salvataggi
  // vecchi ⇒ 0.
  startFraction: number;
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
  phaseTotalTicks: number; // durata totale della fase corrente (fisica, intera); per il progresso continuo
  // Frazione di tick in cui è iniziata la fase corrente. ~0 per le transizioni a bordo di
  // tick (progressUfos), ma una fase avviata in TEMPO REALE a metà tick (la fuga, da
  // cmdAbduct) parte a frazione qualsiasi: il render la sottrae così il progresso parte da 0
  // (niente "teletrasporto" né velocità iniziale fittizia). Assente nei salvataggi vecchi ⇒ 0.
  phaseStartFraction: number;
  abducted: number; // contatore di bordo, accumula 0.5/tick in abducting
  spawnDir: { x: number; y: number; z: number }; // direzione di arrivo dallo spazio profondo (unitaria)
  orbit: OrbitalParams; // parametri di traiettoria (condivisi sim↔render via orbit.ts)
  lunarCrossTick: number; // tick di crociera in cui incrocia la distanza lunare (tasto ">>>")
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

// 0 = pausa. 1000 si raggiunge solo col tasto ">>>" (salta al prossimo attacco).
export type GameSpeed = 0 | 1 | 5 | 25 | 100 | 1000;

export interface GameState {
  version: number;
  seed: number;
  tick: number;
  speed: GameSpeed;
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
  // Albero della Ricerca: id dei nodi sbloccati (vedi sim/researchTree.ts). Le funzioni
  // (fondare il QG, costruire squadroni/ambasciate, montare il minigun, ecc.) sono gated
  // dietro lo sblocco del nodo relativo.
  research: { unlocked: string[] };
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
    research: { unlocked: [] }, // nuova partita: niente sbloccato (prima si ricerca il QG, gratis)
  };
  const w = CONFIG.waves;
  const day =
    w.firstWaveDayMin + Math.floor(stateRand(state) * (w.firstWaveDayMax - w.firstWaveDayMin + 1));
  const regions = [...new Set(cities.map(c => c.region))].sort();
  state.nextWave.arrivalTick = day * CONFIG.ticksPerDay;
  state.nextWave.region = regions[Math.floor(stateRand(state) * regions.length)];
  return state;
}
