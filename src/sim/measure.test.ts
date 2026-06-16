import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import type { OrbitalParams } from './orbit';
import type { UfoState } from './state';
import {
  altitudeKm,
  GAME_SECONDS_PER_TICK,
  speedKmH,
  squadronSpeedKmH,
  ufoEtaTicks,
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
