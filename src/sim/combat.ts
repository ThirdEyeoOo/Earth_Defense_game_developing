import { CONFIG } from './config';
import type { GameState, SquadronState, UfoPhase, UfoState } from './state';
import { removeUfo } from './ufos';

const PHASE_RANK: Record<UfoPhase, number> = {
  abducting: 0,
  descending: 1,
  escaping: 2,
  orbiting: 3, // mai ingaggiato: fuori portata
  approaching: 4, // mai ingaggiato: fuori portata
};

// gli squadroni raggiungono solo gli UFO entrati in atmosfera
export const ENGAGEABLE_PHASES: ReadonlySet<UfoPhase> = new Set([
  'descending',
  'abducting',
  'escaping',
]);

// Uno scontro in corso su una città: difensori fermi (transfer === null) contro
// UFO in fase ingaggiabile sulla stessa città. È la condizione che decide chi
// combatte (resolveCombat) ed è condivisa con render/UI (badge, barre HP,
// traccianti, finestra di scontro) per non duplicarla ovunque.
export interface Battle {
  cityId: string;
  defenders: SquadronState[];
  attackers: UfoState[];
}

export function activeBattles(state: GameState): Battle[] {
  const battles: Battle[] = [];
  for (const city of state.cities) {
    if (!city.alive) continue;
    const defenders = state.squadrons.filter(s => s.cityId === city.id && s.transfer === null);
    if (defenders.length === 0) continue;
    const attackers = state.ufos.filter(
      u => u.targetCityId === city.id && ENGAGEABLE_PHASES.has(u.phase),
    );
    if (attackers.length === 0) continue;
    battles.push({ cityId: city.id, defenders, attackers });
  }
  return battles;
}

export function effectiveDamage(attack: number, shots: number, armor: number): number {
  return shots * Math.max(1, attack - armor);
}

export function resolveCombat(state: GameState): void {
  const sq = CONFIG.squadron;
  const uf = CONFIG.ufoAbductor;
  // le battaglie sono disgiunte per città: rimuovere una vittima/UFO da uno
  // scontro non altera gli array (per oggetto) degli altri
  for (const { defenders, attackers } of activeBattles(state)) {
    const target = [...attackers].sort(
      (a, b) =>
        PHASE_RANK[a.phase] - PHASE_RANK[b.phase] ||
        a.ticksRemaining - b.ticksRemaining ||
        a.id - b.id,
    )[0];
    const victim = [...defenders].sort((a, b) => a.id - b.id)[0];
    // danni simultanei: si calcolano entrambi, poi si applicano
    const damageToUfo = defenders.length * effectiveDamage(sq.attack, sq.shotsPerTick, uf.armor);
    const damageToSquadron = attackers.length * effectiveDamage(uf.attack, uf.shotsPerTick, sq.armor);
    target.hp -= damageToUfo;
    victim.hp -= damageToSquadron;
    if (victim.hp <= 0) state.squadrons = state.squadrons.filter(s => s.id !== victim.id);
    if (target.hp <= 0) removeUfo(state, target.id, 'shotDown');
  }
}
