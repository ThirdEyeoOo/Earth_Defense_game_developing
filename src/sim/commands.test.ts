import { describe, expect, it } from 'vitest';
import { cmdBuildSquadron, cmdRelocateSquadron, cmdSetSpeed } from './commands';
import { createNewGame } from './state';

describe('commands', () => {
  it('cmdBuildSquadron: costruisce scalando i crediti', () => {
    const s = createNewGame(1);
    s.credits = 600;
    const r = cmdBuildSquadron(s, 'rome');
    expect(r.ok).toBe(true);
    expect(s.credits).toBe(100);
    expect(s.squadrons).toHaveLength(1);
    expect(s.squadrons[0].cityId).toBe('rome');
  });

  it('cmdBuildSquadron: rifiuta crediti insufficienti e città non valide', () => {
    const s = createNewGame(1);
    s.credits = 100;
    expect(cmdBuildSquadron(s, 'rome')).toEqual({
      ok: false,
      code: 'insufficientCredits',
      params: { cost: 500 },
    });
    s.credits = 9999;
    expect(cmdBuildSquadron(s, 'atlantide')).toEqual({ ok: false, code: 'cityUnavailable' });
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.alive = false;
    expect(cmdBuildSquadron(s, 'rome')).toEqual({ ok: false, code: 'cityUnavailable' });
    expect(s.squadrons).toHaveLength(0);
  });

  it('cmdRelocateSquadron: avvia il trasferimento con durata da distanza', () => {
    const s = createNewGame(1);
    s.credits = 9999;
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    const r = cmdRelocateSquadron(s, sq.id, 'tokyo');
    expect(r.ok).toBe(true);
    expect(sq.cityId).toBe('tokyo');
    expect(sq.transfer).not.toBeNull();
    expect(sq.transfer!.fromCityId).toBe('rome');
    expect(sq.transfer!.ticksRemaining).toBeGreaterThan(1); // Roma-Tokyo è lontana
  });

  it('cmdRelocateSquadron: rifiuta se già in volo, destinazione uguale o non valida', () => {
    const s = createNewGame(1);
    s.credits = 9999;
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    expect(cmdRelocateSquadron(s, sq.id, 'rome')).toEqual({ ok: false, code: 'sameCity' });
    expect(cmdRelocateSquadron(s, 999, 'tokyo')).toEqual({ ok: false, code: 'squadronNotFound' });
    const tokyo = s.cities.find(c => c.id === 'tokyo')!;
    tokyo.alive = false;
    expect(cmdRelocateSquadron(s, sq.id, 'tokyo')).toEqual({
      ok: false,
      code: 'destinationUnavailable',
    });
    tokyo.alive = true;
    cmdRelocateSquadron(s, sq.id, 'tokyo');
    expect(cmdRelocateSquadron(s, sq.id, 'paris')).toEqual({
      ok: false,
      code: 'squadronInTransfer',
    }); // già in volo
  });

  it('cmdSetSpeed cambia la velocità', () => {
    const s = createNewGame(1);
    expect(cmdSetSpeed(s, 4).ok).toBe(true);
    expect(s.speed).toBe(4);
    cmdSetSpeed(s, 0);
    expect(s.speed).toBe(0);
    cmdSetSpeed(s, 10);
    expect(s.speed).toBe(10);
  });

  it('cmdRelocateSquadron: l\'evacuazione da una città distrutta è permessa', () => {
    const s = createNewGame(1);
    s.credits = 9999;
    cmdBuildSquadron(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.population = 0;
    rome.alive = false;
    const r = cmdRelocateSquadron(s, s.squadrons[0].id, 'paris');
    expect(r.ok).toBe(true);
    expect(s.squadrons[0].cityId).toBe('paris');
  });
});
