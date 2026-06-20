import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import type { OrbitalParams } from './orbit';
import type { UfoState } from './state';
import {
  altitudeKm,
  GAME_SECONDS_PER_TICK,
  speedKmH,
  squadronAltitudeKm,
  squadronSpeedKmH,
  ufoAltitudeKm,
  ufoEtaTicks,
  ufoSpeedKmH,
  ufoSquadronDistanceKm,
} from './measure';

const orbit: OrbitalParams = {
  spawnDir: { x: 0, y: 0, z: 1 },
  cityDir: { x: 1, y: 0, z: 0 },
  startDistance: 8,
  orbitRadius: 1.6,
  surfaceRadius: 1.02,
  orbits: 3,
  mu: 28.7,
  aThrust: 30,
  captureSweep: 0.1,
};

function ufo(phase: UfoState['phase'], ticksRemaining: number): UfoState {
  return {
    id: 1,
    hp: 60,
    targetCityId: 'rome',
    phase,
    ticksRemaining,
    phaseTotalTicks: Math.max(ticksRemaining, 1),
    phaseStartFraction: 0,
    abducted: 0,
    spawnDir: orbit.spawnDir,
    orbit,
    lunarCrossTick: 0,
  };
}

describe('measure', () => {
  it('4320 secondi-gioco per tick', () => {
    expect(GAME_SECONDS_PER_TICK).toBe(4320);
  });

  it('quota: raggi → km sul livello del mare', () => {
    expect(altitudeKm(1)).toBe(0);
    expect(altitudeKm(1.6)).toBeCloseTo(0.6 * 6371, 5); // ~3823 km
  });

  it('velocità orbitale a 1.6 raggi ≈ 22.500 km/h (coerente col mondo reale)', () => {
    const vOrbit = Math.sqrt(28.7 / 1.6); // raggi/tick
    const kmh = speedKmH(vOrbit);
    expect(kmh).toBeGreaterThan(22000);
    expect(kmh).toBeLessThan(23000);
  });

  it('crociera squadrone = 2250 km/h', () => {
    expect(squadronSpeedKmH()).toBe(CONFIG.squadron.speedKmPerDay / 24);
    expect(squadronSpeedKmH()).toBe(2250);
  });

  it('fuga avviata a metà tick: a inizio fuga velocità ~0 e quota = superficie (niente salto)', () => {
    // la fuga scatta in tempo reale a una frazione di tick qualsiasi (qui 0,4): col
    // phaseStartFraction il progresso letto al momento dell'avvio è 0 esatto
    const f0 = 0.4;
    const fleeing: UfoState = { ...ufo('escaping', 5), phaseTotalTicks: 5, phaseStartFraction: f0 };
    // ticksRemaining = phaseTotalTicks ⇒ siamo all'istante di avvio della fuga
    fleeing.ticksRemaining = fleeing.phaseTotalTicks;
    expect(ufoSpeedKmH(fleeing, f0)).toBeLessThan(100); // ~0, non "1000 km/h"
    expect(ufoAltitudeKm(fleeing, f0)).toBeCloseTo(altitudeKm(orbit.surfaceRadius), 5);
  });

  it('distanza caccia↔UFO = |quota UFO − quota caccia| (km)', () => {
    const u = ufo('abducting', 5); // quota UFO = surfaceRadius
    const expected = Math.abs(altitudeKm(orbit.surfaceRadius) - squadronAltitudeKm());
    expect(ufoSquadronDistanceKm(u, 0)).toBeCloseTo(expected, 5);
  });

  it('ETA: decresce avvicinandosi, null in rapimento/fuga', () => {
    const appr = ufoEtaTicks(ufo('approaching', 50))!;
    const orb = ufoEtaTicks(ufo('orbiting', 5))!;
    const desc = ufoEtaTicks(ufo('descending', 1))!;
    expect(appr).toBeGreaterThan(orb);
    expect(orb).toBeGreaterThan(desc);
    expect(ufoEtaTicks(ufo('abducting', 5))).toBeNull();
    expect(ufoEtaTicks(ufo('escaping', 5))).toBeNull();
  });
});
