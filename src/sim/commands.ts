import { buildTicksFor, cellOccupied, gridCapacity, structureCost, structureDef } from './buildings';
import { CONFIG } from './config';
import { embassyCost, isConnected } from './economy';
import { emitEvent } from './events';
import { greatCircleKm } from './geo';
import { isResearched, isUnlocked, researchById } from './researchTree';
import type { Cost, ResourceType } from './resources';
import { squadronCost, transferTicks } from './squadrons';
import type { GameSpeed, GameState, StructureType } from './state';
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
  | 'cityNotConnected' // struttura costruibile solo su città collegata alla rete
  | 'cellUnavailable' // hardpoint fuori griglia o già occupato
  | 'structureNotFound'
  | 'cannotRepair' // struttura non danneggiata
  | 'researchLocked' // funzione non ancora sbloccata nell'albero della Ricerca
  | 'researchAlreadyDone'
  | 'researchPrereqMissing'
  | 'researchBusy'; // un'altra ricerca è già in corso (una alla volta)

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

// Avvia la ricerca di un nodo: verifica prereq + risorse, paga il costo ALL'AVVIO e imposta
// il nodo come `selected`; l'avanzamento avviene nel tick (researchRate × ore, vedi sim/tick.ts).
// I nodi a researchHours 0 (es. il QG gratis) si sbloccano SUBITO: durante la fondazione il
// tick non gira ancora, quindi non potrebbero avanzare. Una sola ricerca attiva alla volta.
export function cmdStartResearch(state: GameState, nodeId: string): CommandResult {
  const node = researchById.get(nodeId);
  if (!node || node.placeholder) return { ok: false, code: 'researchLocked' };
  if (isResearched(state, nodeId)) return { ok: false, code: 'researchAlreadyDone' };
  if (!node.prereqs.every(p => isResearched(state, p))) {
    return { ok: false, code: 'researchPrereqMissing' };
  }
  if (node.researchHours <= 0) {
    const paid = payCost(state, node.cost);
    if (!paid.ok) return paid;
    state.research.unlocked.push(nodeId);
    return { ok: true };
  }
  if (state.research.selected !== null) return { ok: false, code: 'researchBusy' };
  const paid = payCost(state, node.cost);
  if (!paid.ok) return paid;
  state.research.selected = nodeId;
  state.research.progress = 0;
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

// Costruisce una struttura su un hardpoint della griglia esagonale della città. Verifica
// QG, ricerca sbloccata (il tipo coincide col `what` del nodo: tower/lab), città viva e
// collegata, cella valida e libera; poi paga il costo e crea la struttura in stato
// `building` (la promozione a `occupied` avviene nel tick a buildDoneTick).
export function cmdBuildStructure(
  state: GameState,
  cityId: string,
  cell: number,
  type: StructureType,
): CommandResult {
  if (state.hqCityId === null) return { ok: false, code: 'hqNotFounded' };
  if (!isUnlocked(state, type)) return { ok: false, code: 'researchLocked' };
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, code: 'cityUnavailable' };
  if (!isConnected(state, city)) return { ok: false, code: 'cityNotConnected' };
  if (cell < 0 || cell >= gridCapacity(city) || cellOccupied(city, cell)) {
    return { ok: false, code: 'cellUnavailable' };
  }
  const paid = payCost(state, structureCost(type));
  if (!paid.ok) return paid;
  city.structures.push({
    id: state.nextStructureId++,
    cell,
    type,
    state: 'building',
    hp: structureDef(type).hp,
    buildDoneTick: state.tick + buildTicksFor(type),
  });
  return { ok: true };
}

// Ripara una struttura danneggiata: paga una frazione del costo di costruzione e la
// riporta operativa con HP pieni.
export function cmdRepairStructure(
  state: GameState,
  cityId: string,
  structureId: number,
): CommandResult {
  const city = state.cities.find(c => c.id === cityId);
  if (!city) return { ok: false, code: 'cityUnavailable' };
  const st = city.structures.find(s => s.id === structureId);
  if (!st) return { ok: false, code: 'structureNotFound' };
  if (st.state !== 'damaged') return { ok: false, code: 'cannotRepair' };
  const factor = CONFIG.buildings.repairCostFactor;
  const full = structureCost(st.type);
  const repair: Cost = { humt: Math.round(full.humt * factor), resources: {} };
  for (const [t, a] of Object.entries(full.resources) as [ResourceType, number][]) {
    repair.resources[t] = Math.round(a * factor);
  }
  const paid = payCost(state, repair);
  if (!paid.ok) return paid;
  st.state = 'occupied';
  st.hp = structureDef(st.type).hp;
  return { ok: true };
}

// Demolisce una struttura (qualsiasi stato): libera l'hardpoint. Nessun rimborso in v1.
export function cmdRemoveStructure(
  state: GameState,
  cityId: string,
  structureId: number,
): CommandResult {
  const city = state.cities.find(c => c.id === cityId);
  if (!city) return { ok: false, code: 'cityUnavailable' };
  const before = city.structures.length;
  city.structures = city.structures.filter(s => s.id !== structureId);
  if (city.structures.length === before) return { ok: false, code: 'structureNotFound' };
  return { ok: true };
}

// Danno inflitto a una struttura (torre) dal fuoco di un UFO (combattimento in tempo reale
// sul globo). A HP esauriti la struttura passa a `damaged` (inattiva finché riparata), non
// viene distrutta. No-op se non è più operativa o non esiste.
export function cmdDamageStructure(
  state: GameState,
  cityId: string,
  structureId: number,
  amount: number,
): void {
  const city = state.cities.find(c => c.id === cityId);
  if (!city) return;
  const s = city.structures.find(x => x.id === structureId);
  if (!s || s.state !== 'occupied') return;
  s.hp -= amount;
  if (s.hp <= 0) {
    s.hp = 0;
    s.state = 'damaged';
  }
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
