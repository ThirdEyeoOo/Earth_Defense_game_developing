import { CONFIG } from './config';
import { altitudeAt } from './orbit';
import type { GameState, SquadronState, UfoPhase, UfoState } from './state';

// progresso (in tick interi) della fase corrente: usato per la quota d'ingaggio.
// Senza tickFraction (decisione di gioco deterministica, non visiva).
function phaseFraction(ufo: UfoState): number {
  return ufo.phaseTotalTicks > 0 ? (ufo.phaseTotalTicks - ufo.ticksRemaining) / ufo.phaseTotalTicks : 1;
}

// un UFO è ingaggiabile se è in una fase atmosferica E sotto la quota d'ingaggio
export function isEngageable(ufo: UfoState): boolean {
  return (
    ENGAGEABLE_PHASES.has(ufo.phase) &&
    altitudeAt(ufo.phase, phaseFraction(ufo), ufo.orbit) <= CONFIG.physics.engageAltitude
  );
}

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
    const attackers = state.ufos.filter(u => u.targetCityId === city.id && isEngageable(u));
    if (attackers.length === 0) continue;
    battles.push({ cityId: city.id, defenders, attackers });
  }
  return battles;
}

// Il combattimento NON è più risolto a tick: è in tempo reale nel loop di rendering
// (src/render/combatEngine.ts) che applica i colpi via comando (cmdDamageSquadron).
