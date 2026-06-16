// Conversioni "unità di gioco → misure reali" per il tracciamento dimensionale.
// Modulo PURO (niente THREE/i18n): la scala è già fisica (1 unità render = 1 raggio
// terrestre = EARTH_RADIUS_KM; la fisica orbitale usa μ reale con τ = 4320 s-gioco/tick),
// quindi qui si traduce solo. Validazione: la velocità orbitale a 1.6 raggi viene
// ~22.500 km/h, identica al valore reale.
import { CONFIG } from './config';
import { EARTH_RADIUS_KM } from './geo';
import { altitudeAt, freefallTicks, orbitPhaseTicks, positionAt } from './orbit';
import type { SquadronState, UfoState } from './state';

// secondi-gioco per tick: un giorno-gioco (86400 s) diviso i tick/giorno → 4320
export const GAME_SECONDS_PER_TICK = 86400 / CONFIG.ticksPerDay;

// quota (raggi dal centro) → km sul livello del mare
export function altitudeKm(radiusRaggi: number): number {
  return (radiusRaggi - 1) * EARTH_RADIUS_KM;
}

// velocità (raggi/tick) → km/h
export function speedKmH(raggiPerTick: number): number {
  return (raggiPerTick * EARTH_RADIUS_KM * 3600) / GAME_SECONDS_PER_TICK;
}

// metrico → imperiale (UI in inglese). Convenzione americana: velocità in mph
// (km→mi, stesso fattore per km/h→mph) e ALTITUDINE in piedi.
export const MILES_PER_KM = 0.621371;
export const FEET_PER_KM = 3280.84;
export const kmToMiles = (km: number): number => km * MILES_PER_KM;
export const kmToFeet = (km: number): number => km * FEET_PER_KM;

// secondi-gioco corrispondenti a un certo numero di tick (per l'ETA)
export function etaGameSeconds(ticks: number): number {
  return ticks * GAME_SECONDS_PER_TICK;
}

// progresso continuo della fase corrente, in [0,1]
function progressOf(ufo: UfoState, tickFraction: number): number {
  const total = Math.max(1, ufo.phaseTotalTicks);
  return Math.min(1, Math.max(0, (total - ufo.ticksRemaining + tickFraction) / total));
}

// --- UFO: quota/velocità dalla traiettoria fisica (coerenti con lo schermo) ---
export function ufoAltitudeKm(ufo: UfoState, tickFraction: number): number {
  return altitudeKm(altitudeAt(ufo.phase, progressOf(ufo, tickFraction), ufo.orbit));
}

export function ufoSpeedKmH(ufo: UfoState, tickFraction: number): number {
  // velocità istantanea = |d posizione / d progresso| × (1 / tick di fase),
  // stimata con una differenza centrale su un piccolo Δprogress
  const p = progressOf(ufo, tickFraction);
  const d = 0.001;
  const lo = Math.max(0, p - d);
  const hi = Math.min(1, p + d);
  const a = positionAt(ufo.phase, lo, ufo.orbit);
  const b = positionAt(ufo.phase, hi, ufo.orbit);
  const dist = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
  const span = hi - lo;
  const raggiPerTick = span > 0 ? dist / span / Math.max(1, ufo.phaseTotalTicks) : 0;
  return speedKmH(raggiPerTick);
}

// ETA (in tick) fino all'inizio del RAPIMENTO (l'UFO "arriva" sulla città):
// tick rimanenti della fase corrente + durate delle fasi successive fino ad
// abducting, derivate dai parametri orbitali. null se già in rapimento o in fuga.
// tickFraction (frazione del tick in corso) rende il conto continuo → l'ETA scende
// in tempo reale invece di saltare a ogni tick.
export function ufoEtaTicks(ufo: UfoState, tickFraction = 0): number | null {
  const p = ufo.orbit;
  const descend = freefallTicks(p.orbitRadius, p.surfaceRadius, p.mu);
  const remaining = Math.max(0, ufo.ticksRemaining - tickFraction);
  switch (ufo.phase) {
    case 'approaching':
      return remaining + orbitPhaseTicks(p) + descend;
    case 'orbiting':
      return remaining + descend;
    case 'descending':
      return remaining;
    case 'abducting':
    case 'escaping':
      return null;
  }
}

// --- squadroni: valori realistici costanti (il rendering è esagerato per visibilità) ---
export function squadronAltitudeKm(): number {
  return CONFIG.squadron.cruiseAltitudeKm;
}

export function squadronSpeedKmH(): number {
  return CONFIG.squadron.speedKmPerDay / 24;
}

export function squadronEtaTicks(sq: SquadronState, tickFraction = 0): number | null {
  return sq.transfer ? Math.max(0, sq.transfer.ticksRemaining - tickFraction) : null;
}
