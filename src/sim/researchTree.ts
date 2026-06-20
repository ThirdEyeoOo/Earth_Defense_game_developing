// Albero della Ricerca — definizione dei nodi COME DATI (modulo puro, niente i18n).
// Il pannello (src/ui/researchPanel.ts) lo disegna data-driven; la meccanica di sblocco
// vive nei comandi (cmdUnlockResearch) e nel gating delle funzioni esistenti (vedi
// commands.ts). Lo stato sbloccato è `GameState.research.unlocked` (id dei nodi).
//
// Aggiungere un nodo = una voce in RESEARCH_TREE + le due chiavi i18n
// `tech.<id>.title` / `tech.<id>.desc` in it.ts ed en.ts (parità controllata dai test).

import type { Cost } from './resources';
import type { GameState } from './state';

export type ResearchBranch =
  | 'combat'
  | 'economy'
  | 'orbital'
  | 'intel'
  | 'network'
  | 'xeno';

// Bersaglio di un effetto moltiplicativo: la sim legge `base × researchMult(target)`.
// Predisposto per nodi-potenziamento futuri; i nodi v1 sono tutti di tipo `unlock`.
export type ModifierTarget =
  | 'squadronAttack'
  | 'squadronArmor'
  | 'squadronHp'
  | 'resourceProduction'
  | 'taxIncome'
  | 'embassyCost'
  | 'engageAltitude'
  | 'waveWarning';

// Effetto dichiarativo del nodo. `unlock` apre una funzione (gate nei comandi/render);
// `mult` applica un modificatore (futuro). I nodi placeholder non hanno effetto utile.
export type ResearchEffect =
  | { kind: 'mult'; target: ModifierTarget; factor: number }
  | { kind: 'unlock'; what: string };

export interface ResearchNode {
  id: string; // stabile: usato nei salvataggi (GameState.research.unlocked)
  branch: ResearchBranch; // determina colore/banda nel pannello
  tier: number; // colonna logica: un prereq sta sempre in un tier inferiore
  prereqs: string[]; // id dei nodi prerequisito (archi del DAG)
  pos: { x: number; y: number }; // ANGOLO ALTO-SINISTRA del nodo (197×62) nel campo 913×610
  cost: Cost; // costo di sblocco (pagato da cmdUnlockResearch via payCost)
  effect: ResearchEffect; // cosa fa il nodo (vedi sopra)
  titleKey: string; // chiave i18n del titolo, tradotta dalla UI
  descKey: string; // chiave i18n della descrizione (tooltip)
  icon?: string; // id icona in src/ui/researchIcons.ts (assente sui placeholder)
  isResult?: boolean; // nodo-obiettivo della catena (bordo evidenziato)
  placeholder?: boolean; // nodo non ancora definito: nessun costo/effetto, non confermabile
}

// Ordine dei rami presenti (righe del pannello, dall'alto in basso).
export const RESEARCH_BRANCH_ORDER: ResearchBranch[] = ['combat', 'economy', 'orbital'];

// Campo del pannello (sistema di coordinate del prototipo Albero della Ricerca.html).
// Le `pos` dei nodi sono l'angolo alto-sinistra entro questo riquadro.
export const RESEARCH_CANVAS = { width: 913, height: 610 } as const;

// Dimensioni di un nodo nel campo (dal prototipo): servono al layout dei fili.
export const RESEARCH_NODE_W = 197;
export const RESEARCH_NODE_H = 62;

const FREE: Cost = { humt: 0, resources: {} };
const NONE: Cost = { humt: 0, resources: {} };

export const RESEARCH_TREE: ResearchNode[] = [
  // ── Combattimento ───────────────────────────────────────────────
  {
    id: 'minigun',
    branch: 'combat',
    tier: 1,
    prereqs: [],
    pos: { x: 95, y: 150 },
    cost: { humt: 200, resources: { industria: 15, tecnologia: 10 } },
    effect: { kind: 'unlock', what: 'weapon.minigun' },
    titleKey: 'tech.minigun.title',
    descKey: 'tech.minigun.desc',
    icon: 'minigun',
  },
  {
    id: 'blindatura',
    branch: 'combat',
    tier: 1,
    prereqs: [],
    pos: { x: 95, y: 228 },
    cost: { humt: 200, resources: { materiali_da_costruzione: 15, tecnologia: 10 } },
    effect: { kind: 'unlock', what: 'armor' },
    titleKey: 'tech.blindatura.title',
    descKey: 'tech.blindatura.desc',
    icon: 'blindatura',
  },
  {
    id: 'caccia',
    branch: 'combat',
    tier: 2,
    prereqs: ['minigun', 'blindatura'],
    pos: { x: 400, y: 189 },
    cost: { humt: 400, resources: { industria: 25, combustibili_fossili: 15 } },
    effect: { kind: 'unlock', what: 'squadron' },
    titleKey: 'tech.caccia.title',
    descKey: 'tech.caccia.desc',
    icon: 'caccia',
    isResult: true,
  },

  // ── Economia ────────────────────────────────────────────────────
  {
    id: 'quartier_gen',
    branch: 'economy',
    tier: 1,
    prereqs: [],
    pos: { x: 95, y: 360 },
    cost: FREE, // ricerca iniziale gratuita: abilita la fondazione del QG (scioglie il circolo)
    effect: { kind: 'unlock', what: 'foundHq' },
    titleKey: 'tech.quartier_gen.title',
    descKey: 'tech.quartier_gen.desc',
    icon: 'quartier_gen',
  },
  {
    id: 'collegamento',
    branch: 'economy',
    tier: 2,
    prereqs: ['quartier_gen'],
    pos: { x: 400, y: 335 },
    cost: { humt: 250, resources: { tecnologia: 15 } },
    effect: { kind: 'unlock', what: 'embassy' },
    titleKey: 'tech.collegamento.title',
    descKey: 'tech.collegamento.desc',
    icon: 'collegamento',
  },
  {
    id: 'laboratorio',
    branch: 'economy',
    tier: 2,
    prereqs: ['quartier_gen'],
    pos: { x: 400, y: 412 },
    cost: { humt: 300, resources: { materiali_da_costruzione: 20, tecnologia: 20 } },
    effect: { kind: 'unlock', what: 'lab' }, // nessun consumer ancora (feature futura)
    titleKey: 'tech.laboratorio.title',
    descKey: 'tech.laboratorio.desc',
    icon: 'laboratorio',
  },
  {
    id: 'diplomazia',
    branch: 'economy',
    tier: 1,
    prereqs: [],
    pos: { x: 690, y: 372 },
    cost: NONE,
    effect: { kind: 'unlock', what: '__placeholder__' },
    titleKey: 'tech.diplomazia.title',
    descKey: 'tech.diplomazia.desc',
    placeholder: true,
  },

  // ── Contromisure orbitali ───────────────────────────────────────
  {
    id: 'telescopio',
    branch: 'orbital',
    tier: 1,
    prereqs: [],
    pos: { x: 95, y: 522 },
    cost: { humt: 200, resources: { tecnologia: 20, energia: 10 } },
    effect: { kind: 'unlock', what: 'radar' },
    titleKey: 'tech.telescopio.title',
    descKey: 'tech.telescopio.desc',
    icon: 'telescopio',
  },
  {
    id: 'intercettore',
    branch: 'orbital',
    tier: 2,
    prereqs: ['telescopio'],
    pos: { x: 400, y: 522 },
    cost: NONE,
    effect: { kind: 'unlock', what: '__placeholder__' },
    titleKey: 'tech.intercettore.title',
    descKey: 'tech.intercettore.desc',
    placeholder: true,
  },
];

export const researchById = new Map(RESEARCH_TREE.map(n => [n.id, n] as const));

// id di tutti i nodi NON placeholder (sbloccabili): usato dalla migrazione salvataggi
// per concedere lo stato implicito alle partite in corso.
export const IMPLEMENTED_NODE_IDS = RESEARCH_TREE.filter(n => !n.placeholder).map(n => n.id);

// — Helper di stato (puri) — la UI/i comandi/il render li interrogano —
export function isResearched(state: GameState, nodeId: string): boolean {
  return state.research.unlocked.includes(nodeId);
}

// vero se una funzione (`what`) è stata sbloccata da un nodo ricercato.
export function isUnlocked(state: GameState, what: string): boolean {
  return state.research.unlocked.some(id => {
    const e = researchById.get(id)?.effect;
    return e?.kind === 'unlock' && e.what === what;
  });
}

// prodotto dei fattori dei nodi `mult` ricercati su un bersaglio (default 1). Futuro.
export function researchMult(state: GameState, target: ModifierTarget): number {
  let m = 1;
  for (const id of state.research.unlocked) {
    const e = researchById.get(id)?.effect;
    if (e?.kind === 'mult' && e.target === target) m *= e.factor;
  }
  return m;
}
