import { describe, expect, it } from 'vitest';
import { greatCircleKm, latLonToVec3 } from './geo';

describe('geo', () => {
  it('latLonToVec3: polo nord a (0, r, 0), equatore/Greenwich a (r, 0, 0)', () => {
    const np = latLonToVec3(90, 0, 1);
    expect(np.x).toBeCloseTo(0);
    expect(np.y).toBeCloseTo(1);
    expect(np.z).toBeCloseTo(0);
    const eq = latLonToVec3(0, 0, 1);
    expect(eq.x).toBeCloseTo(1);
    expect(eq.y).toBeCloseTo(0);
    expect(eq.z).toBeCloseTo(0);
  });

  it('greatCircleKm: Londra-New York ≈ 5570 km', () => {
    const d = greatCircleKm(51.51, -0.13, 40.71, -74.01);
    expect(d).toBeGreaterThan(5400);
    expect(d).toBeLessThan(5750);
  });

  it('greatCircleKm: distanza da sé stessi = 0', () => {
    expect(greatCircleKm(45, 9, 45, 9)).toBeCloseTo(0);
  });
});
