// Albero della Ricerca — definizione dei nodi COME DATI (modulo puro, niente i18n).
// Vedi docs/research-model.md per il modello completo. In questa prima versione la
// UI mostra solo la STRUTTURA (rami, nodi, prerequisiti): le funzionalità di gioco
// (avvio ricerca, avanzamento nei tick, effetti sui modificatori) arriveranno dopo.
//
// Aggiungere un nodo = una voce in RESEARCH_TREE + le due chiavi i18n
// `tech.<id>.title` / `tech.<id>.desc` in it.ts ed en.ts (parità controllata dai test).

import type { Cost } from './resources';

export type ResearchBranch =
  | 'combat'
  | 'economy'
  | 'orbital'
  | 'intel'
  | 'network'
  | 'xeno';

// Bersaglio di un effetto moltiplicativo: la sim leggerà `base × modificatore`
// (vedi docs/research-model.md). Non ancora consumato: predisposto per il futuro.
export type ModifierTarget =
  | 'squadronAttack'
  | 'squadronArmor'
  | 'squadronHp'
  | 'resourceProduction'
  | 'taxIncome'
  | 'embassyCost'
  | 'engageAltitude'
  | 'waveWarning';

// Effetto dichiarativo del nodo: si piegherà in un set di modificatori derivati.
export type ResearchEffect =
  | { kind: 'mult'; target: ModifierTarget; factor: number }
  | { kind: 'unlock'; what: string };

export interface ResearchNode {
  id: string; // stabile: usato (in futuro) nei salvataggi
  branch: ResearchBranch;
  tier: number;
  prereqs: string[]; // id dei nodi prerequisito (archi del DAG)
  pos: { x: number; y: number }; // coordinate del CENTRO per il layout del pannello
  cost: Cost; // anticipo all'avvio (riuserà payCost) — non ancora applicato
  researchPoints: number; // punti da accumulare per completare — non ancora applicato
  effect: ResearchEffect; // non ancora applicato
  titleKey: string; // chiave i18n, tradotta dalla UI
  descKey: string;
}

// Ordine dei rami presenti nella v1 (righe del pannello, dall'alto in basso).
export const RESEARCH_BRANCH_ORDER: ResearchBranch[] = ['combat', 'economy', 'orbital'];

// Spazio di layout di riferimento (viewBox del pannello). Le `pos` dei nodi sono
// coordinate del centro entro questo riquadro.
export const RESEARCH_CANVAS = { width: 660, height: 360 } as const;

export const RESEARCH_TREE: ResearchNode[] = [
  // ── Combattimento ───────────────────────────────────────────────
  {
    id: 'combat-ap',
    branch: 'combat',
    tier: 1,
    prereqs: [],
    pos: { x: 115, y: 70 },
    cost: { humt: 200, resources: { tecnologia: 15 } },
    researchPoints: 100,
    effect: { kind: 'mult', target: 'squadronAttack', factor: 1.2 },
    titleKey: 'tech.combat-ap.title',
    descKey: 'tech.combat-ap.desc',
  },
  {
    id: 'combat-armor',
    branch: 'combat',
    tier: 1,
    prereqs: [],
    pos: { x: 115, y: 135 },
    cost: { humt: 200, resources: { tecnologia: 15 } },
    researchPoints: 100,
    effect: { kind: 'mult', target: 'squadronArmor', factor: 1.25 },
    titleKey: 'tech.combat-armor.title',
    descKey: 'tech.combat-armor.desc',
  },
  {
    id: 'combat-nextgen',
    branch: 'combat',
    tier: 2,
    prereqs: ['combat-ap', 'combat-armor'],
    pos: { x: 345, y: 100 },
    cost: { humt: 500, resources: { tecnologia: 35, industria: 20 } },
    researchPoints: 250,
    effect: { kind: 'mult', target: 'squadronHp', factor: 1.3 },
    titleKey: 'tech.combat-nextgen.title',
    descKey: 'tech.combat-nextgen.desc',
  },

  // ── Economia ────────────────────────────────────────────────────
  {
    id: 'economy-extraction',
    branch: 'economy',
    tier: 1,
    prereqs: [],
    pos: { x: 115, y: 205 },
    cost: { humt: 200, resources: { tecnologia: 15 } },
    researchPoints: 100,
    effect: { kind: 'mult', target: 'resourceProduction', factor: 1.15 },
    titleKey: 'tech.economy-extraction.title',
    descKey: 'tech.economy-extraction.desc',
  },
  {
    id: 'economy-tax',
    branch: 'economy',
    tier: 2,
    prereqs: ['economy-extraction'],
    pos: { x: 340, y: 205 },
    cost: { humt: 350, resources: { tecnologia: 25 } },
    researchPoints: 180,
    effect: { kind: 'mult', target: 'taxIncome', factor: 1.15 },
    titleKey: 'tech.economy-tax.title',
    descKey: 'tech.economy-tax.desc',
  },
  {
    id: 'economy-diplomacy',
    branch: 'economy',
    tier: 3,
    prereqs: ['economy-tax'],
    pos: { x: 555, y: 205 },
    cost: { humt: 500, resources: { tecnologia: 40 } },
    researchPoints: 250,
    effect: { kind: 'mult', target: 'embassyCost', factor: 0.75 },
    titleKey: 'tech.economy-diplomacy.title',
    descKey: 'tech.economy-diplomacy.desc',
  },

  // ── Contromisure orbitali ───────────────────────────────────────
  {
    id: 'orbital-radar',
    branch: 'orbital',
    tier: 1,
    prereqs: [],
    pos: { x: 115, y: 305 },
    cost: { humt: 200, resources: { tecnologia: 20 } },
    researchPoints: 120,
    effect: { kind: 'mult', target: 'waveWarning', factor: 1.5 },
    titleKey: 'tech.orbital-radar.title',
    descKey: 'tech.orbital-radar.desc',
  },
  {
    id: 'orbital-interceptors',
    branch: 'orbital',
    tier: 2,
    prereqs: ['orbital-radar'],
    pos: { x: 345, y: 305 },
    cost: { humt: 450, resources: { tecnologia: 35, combustibili_fossili: 15 } },
    researchPoints: 220,
    effect: { kind: 'mult', target: 'engageAltitude', factor: 1.4 },
    titleKey: 'tech.orbital-interceptors.title',
    descKey: 'tech.orbital-interceptors.desc',
  },
];
