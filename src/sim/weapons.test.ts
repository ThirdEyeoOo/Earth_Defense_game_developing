import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { WEAPON_STATS } from './weapons';

describe('weapons', () => {
  it('ogni modulo arma ha cadenza e danno positivi', () => {
    for (const [id, w] of Object.entries(WEAPON_STATS)) {
      expect(w.cooldownGameMinutes, `${id} cadenza`).toBeGreaterThan(0);
      expect(w.damage, `${id} danno`).toBeGreaterThan(0);
    }
  });

  it("l'arma montata dall'abductor esiste nel registro", () => {
    expect(WEAPON_STATS[CONFIG.ufoAbductor.weaponModule]).toBeDefined();
  });

  it("l'arma montata dallo squadrone esiste nel registro", () => {
    expect(WEAPON_STATS[CONFIG.squadron.weaponModule]).toBeDefined();
  });

  it('torretta al plasma: 15 danni ogni 2 minuti-gioco', () => {
    expect(WEAPON_STATS['plasma-turret']).toEqual({ cooldownGameMinutes: 2, damage: 15 });
  });

  it('minigun: 8 danni ogni 0,25 minuti-gioco (raffica veloce/leggera)', () => {
    expect(WEAPON_STATS['minigun']).toEqual({ cooldownGameMinutes: 0.25, damage: 8 });
  });
});
