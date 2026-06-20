import { CONFIG } from './config';
import { embassyCost, isConnected } from './economy';
import { emitEvent } from './events';
import { greatCircleKm } from './geo';
import { isResearched, isUnlocked, researchById } from './researchTree';
import type { Cost, ResourceType } from './resources';
import { squadronCost, transferTicks } from './squadrons';
import type { GameSpeed, GameState } from './state';
import { removeUfo, startEscape } from './ufos';

// La sim non conosce i testi: gli errori sono codici (+ parametri)
// che la UI traduce con t(`cmd.${code}`) — vedi src/i18n/.
export type CommandErrorCode =
  | 'cityUnavailable'
  | 'insufficientHumt'
  | 'insufficientResources'
  | 'squadronNotFound'
  | 'squadronInTransfer'
  | 'destinationUnavailable'
  | 'sameCity'
  | 'hqAlreadyFounded'
  | 'hqNotFounded'
  | 'alreadyConnected'
  | 'researchLocked' // funzione non ancora sbloccata nell'albero della Ricerca
  | 'researchAlreadyDone'
  | 'researchPrereqMissing';

export type CommandResult =
  | { ok: true }
  | { ok: false; code: 'insufficientHumt'; params: { cost: number } }
  | { ok: false; code: 'insufficientResources'; params: { type: ResourceType; amount: number } }
  | {
      ok: false;
      code: Exclude<CommandErrorCode, 'insufficientHumt' | 'insufficientResources'>;
    };

// verifica e scala un costo composito; in caso di rifiuto non tocca nulla
function payCost(state: GameState, cost: Cost): CommandResult {
  if (state.humt < cost.humt) {
    return { ok: false, code: 'insufficientHumt', params: { cost: cost.humt } };
  }
  const entries = Object.entries(cost.resources) as [ResourceType, number][];
  for (const [type, amount] of entries) {
    if (state.resources[type] < amount) {
      return { ok: false, code: 'insufficientResources', params: { type, amount } };
    }
  }
  state.humt -= cost.humt;
  for (const [type, amount] of entries) state.resources[type] -= amount;
  return { ok: true };
}

// Sblocca un nodo dell'albero della Ricerca: verifica prereq + risorse, scala il costo
// (per il QG è 0: ricerca iniziale gratuita) e segna il nodo come ricercato. È l'unico
// canale che apre le funzioni gated (fondare il QG, squadroni, ambasciate, armi, radar).
export function cmdUnlockResearch(state: GameState, nodeId: string): CommandResult {
  const node = researchById.get(nodeId);
  if (!node || node.placeholder) return { ok: false, code: 'researchLocked' };
  if (isResearched(state, nodeId)) return { ok: false, code: 'researchAlreadyDone' };
  if (!node.prereqs.every(p => isResearched(state, p))) {
    return { ok: false, code: 'researchPrereqMissing' };
  }
  const paid = payCost(state, node.cost);
  if (!paid.ok) return paid;
  state.research.unlocked.push(nodeId);
  return { ok: true };
}

// fonda il QG della nuova umanità: gratuito, una tantum, istituisce l'economia
// e accredita il kit di partenza (riserve recuperate dalle macerie)
export function cmdFoundHq(state: GameState, cityId: string): CommandResult {
  if (state.hqCityId !== null) return { ok: false, code: 'hqAlreadyFounded' };
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, code: 'cityUnavailable' };
  // gated dietro il nodo Ricerca gratuito `quartier_gen` (prima ricerca della partita)
  if (!isUnlocked(state, 'foundHq')) return { ok: false, code: 'researchLocked' };
  state.hqCityId = cityId;
  const kit = CONFIG.economy.starterKit;
  state.humt += kit.humt;
  for (const [type, amount] of Object.entries(kit.resources)) {
    state.resources[type as ResourceType] += amount;
  }
  return { ok: true };
}

// apre un'ambasciata: collega la città alla rete (produzione + tasse)
export function cmdBuildEmbassy(state: GameState, cityId: string): CommandResult {
  if (state.hqCityId === null) return { ok: false, code: 'hqNotFounded' };
  if (!isUnlocked(state, 'embassy')) return { ok: false, code: 'researchLocked' };
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, code: 'cityUnavailable' };
  if (isConnected(state, city)) return { ok: false, code: 'alreadyConnected' };
  const paid = payCost(state, embassyCost(state, cityId));
  if (!paid.ok) return paid;
  city.embassy = true;
  return { ok: true };
}

export function cmdBuildSquadron(state: GameState, cityId: string): CommandResult {
  if (state.hqCityId === null) return { ok: false, code: 'hqNotFounded' };
  if (!isUnlocked(state, 'squadron')) return { ok: false, code: 'researchLocked' };
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, code: 'cityUnavailable' };
  const paid = payCost(state, squadronCost(state, cityId));
  if (!paid.ok) return paid;
  state.squadrons.push({
    id: state.nextSquadronId++,
    hp: CONFIG.squadron.hp,
    cityId,
    transfer: null,
  });
  return { ok: true };
}

// `tickFraction` (0..1, frazione del tick in corso) viene memorizzata sul trasferimento:
// il render la sottrae così la rotta parte dalla città di partenza, non già a metà arco.
export function cmdRelocateSquadron(
  state: GameState,
  squadronId: number,
  toCityId: string,
  tickFraction = 0,
): CommandResult {
  const sq = state.squadrons.find(s => s.id === squadronId);
  if (!sq) return { ok: false, code: 'squadronNotFound' };
  if (sq.transfer) return { ok: false, code: 'squadronInTransfer' };
  // la città di partenza può anche essere distrutta: l'evacuazione è sempre permessa
  const from = state.cities.find(c => c.id === sq.cityId)!;
  const to = state.cities.find(c => c.id === toCityId);
  if (!to || !to.alive) return { ok: false, code: 'destinationUnavailable' };
  if (to.id === from.id) return { ok: false, code: 'sameCity' };
  const ticks = transferTicks(greatCircleKm(from.lat, from.lon, to.lat, to.lon));
  sq.transfer = {
    fromCityId: from.id,
    toCityId: to.id,
    ticksRemaining: ticks,
    totalTicks: ticks,
    startFraction: tickFraction,
  };
  sq.cityId = to.id;
  emitEvent(state, {
    type: 'squadronTransferStarted',
    unitKind: 'squadron',
    unitId: sq.id,
    cityId: from.id,
  });
  return { ok: true };
}

export function cmdSetSpeed(state: GameState, speed: GameSpeed): CommandResult {
  state.speed = speed;
  return { ok: true };
}

// Applica un colpo a uno squadrone: canale di mutazione del motore di combattimento
// in tempo reale (src/render/combatEngine.ts). Sottrae gli HP e rimuove lo squadrone se
// scende a 0 (come faceva resolveCombat). No-op se l'id non esiste più.
export function cmdDamageSquadron(state: GameState, squadronId: number, amount: number): void {
  const sq = state.squadrons.find(s => s.id === squadronId);
  if (!sq) return;
  // la blindatura (nodo `blindatura` ricercato) riduce ogni colpo, minimo 1 di danno
  const armor = isUnlocked(state, 'armor') ? CONFIG.squadron.armor : 0;
  sq.hp -= Math.max(1, amount - armor);
  if (sq.hp <= 0) state.squadrons = state.squadrons.filter(s => s.id !== squadronId);
}

// Danno inflitto a un UFO dal fuoco dei caccia (combattimento a due sensi). A HP esauriti
// lo abbatte: riusa removeUfo('shotDown'), che incrementa ufosShotDown e applica la perdita
// dei rapiti a bordo (precipitano col relitto, come la fuga).
export function cmdDamageUfo(state: GameState, ufoId: number, amount: number): void {
  const ufo = state.ufos.find(u => u.id === ufoId);
  if (!ufo) return;
  ufo.hp -= amount;
  if (ufo.hp <= 0) removeUfo(state, ufoId, 'shotDown');
}

// Rapisce UNA persona: canale di mutazione del motore di rapimento in tempo reale
// (src/render/abductionEngine.ts), che lo invoca alla cadenza giusta — così il contatore
// sale di uno alla volta invece che a blocchi di tick. A capienza piena o città esaurita
// l'UFO parte subito in fuga. No-op se l'UFO non sta più rapendo o la città è sparita.
// `tickFraction` (0..1, frazione del tick in corso) serve solo se questo prelievo fa
// scattare la fuga: viene memorizzato sull'UFO così il render fa partire la fuga dal
// punto esatto in cui si trova, a velocità 0 (vedi UfoState.phaseStartFraction).
export function cmdAbduct(state: GameState, ufoId: number, tickFraction = 0): void {
  const ufo = state.ufos.find(u => u.id === ufoId);
  if (!ufo || ufo.phase !== 'abducting') return;
  const city = state.cities.find(c => c.id === ufo.targetCityId);
  if (!city) return;
  const capacity = CONFIG.ufoAbductor.captureCapacity;
  const limit = Math.min(capacity, city.population);
  if (ufo.abducted >= limit) {
    startEscape(ufo, tickFraction); // già al limite: nessuno da prelevare, via
    return;
  }
  ufo.abducted += 1;
  state.stats.abductedTotal += 1;
  if (ufo.abducted >= limit) startEscape(ufo, tickFraction);
}
