# Albero della Ricerca — template di struttura

> **Documento di riferimento.** Fissa la **struttura/architettura** dell'albero della ricerca
> decisa in brainstorming (sessione del 2026-06-16). Non è ancora implementato.
> Le finestre/pannelli (UI) verranno ridisegnati in seguito e qui sono volutamente lasciati come placeholder.

## Contesto

Il gioco ha il pulsante **Ricerca** nella barra inferiore già predisposto (`BarAction = 'ricerca'`, oggi mostra "Funzione in arrivo") ed è elencato tra i prossimi passi (meta-progressione / albero tecnologico). Questo documento definisce il **modello dati e l'architettura** dell'albero, in modo che cresca un ramo/nodo alla volta riusando i pattern esistenti (dati-driven come enciclopedia/tutorial, comandi sim, salvataggi versionati).

## Decisioni di design (dal brainstorming)

1. **Progressione = ricerca a tempo.** Un nodo si avvia e progredisce nei tick fino al completamento (non acquisto istantaneo).
2. **Velocità di ricerca = produzione di _tecnologia_ + bonus laboratori (additivo).**
   `velocità = baseTech(città collegate) + bonusLab`. I **laboratori** (edifici) sono un **incremento successivo**: finché non esiste la meccanica di costruzione, `bonusLab = 0`. La formula è additiva apposta, così i lab si innestano senza riscrivere nulla.
3. **Forma dell'albero = DAG libero.** Ogni nodo dichiara **prerequisiti arbitrari** (archi del grafo) **+ coordinate esplicite a mano** (`pos`) per il layout del pannello → niente algoritmo di auto-layout.
4. **Sei rami totali, sviluppati a tappe.** `combat, economy, orbital, intel, network, xeno`. **Struttura template della v1 = 3 rami** (Combattimento, Economia, Orbitale, ~8 nodi). Gli altri rami e i lab si aggiungono come nodi-dato.
5. **Una ricerca attiva alla volta** (coda singola) come default; modificabile in futuro.
6. **Effetti dichiarativi → modificatori derivati** (vedi sotto): la sim resta deterministica e i nodi sono pure dati.

## Confine architetturale (rispetta i 3 strati)

- La **definizione gameplay** dei nodi (id, ramo, tier, prereq, costo, punti, effetto, coordinate) vive nella **sim** (`src/sim/`), pura, **senza import i18n**.
- Le **chiavi i18n** del titolo/descrizione sono semplici `string` sul nodo; la **UI** le traduce con `t(node.titleKey)` (come fanno gli `EncyclopediaEntry`).
- Gli **effetti** modificano la sim tramite una funzione pura che deriva i moltiplicatori dall'insieme dei nodi completati — la UI non calcola mai effetti.

## Template del modello dati (sim, puro)

`src/sim/researchTree.ts` (nuovo, nessun import esterno):

```ts
export type ResearchBranch =
  | 'combat' | 'economy' | 'orbital' | 'intel' | 'network' | 'xeno';

// Effetto dichiarativo: si piega in un set di moltiplicatori/unlock.
export type ResearchEffect =
  | { kind: 'mult'; target: ModifierTarget; factor: number }   // es. attacco ×1.2
  | { kind: 'unlock'; what: string };                          // es. nuovo velivolo

export type ModifierTarget =
  | 'squadronAttack' | 'squadronArmor' | 'squadronHp'
  | 'resourceProduction' | 'taxIncome' | 'embassyCost'
  | 'engageAltitude' | 'waveWarning';

export interface ResearchNode {
  id: string;                 // stabile, usato nei salvataggi
  branch: ResearchBranch;
  tier: number;
  prereqs: string[];          // id dei nodi prerequisito (archi del DAG)
  pos: { x: number; y: number }; // coordinate manuali per il pannello
  cost: Cost;                 // anticipo HumT + risorse all'AVVIO (riusa payCost)
  researchPoints: number;     // punti da accumulare per completare
  effect: ResearchEffect;
  titleKey: string;           // chiave i18n (tradotta dalla UI)
  descKey: string;
}

export const RESEARCH_TREE: ResearchNode[] = [ /* ~8 nodi v1, dati */ ];
```

**Derivazione dei modificatori** (funzione pura, usata dalla sim):

```ts
export interface Modifiers {       // default neutri (mult = 1)
  squadronAttack: number; squadronArmor: number; squadronHp: number;
  resourceProduction: number; taxIncome: number; embassyCost: number;
  engageAltitude: number; waveWarning: number;
  unlocks: Set<string>;
}
export function researchModifiers(completedIds: string[]): Modifiers
```

I punti di consumo nella sim leggono `base × mods.<target>` (es. `CONFIG.squadron.attack * mods.squadronAttack`, costo ambasciata `× mods.embassyCost`, `engageAltitude × mods.engageAltitude`, ecc.).

## Template dello stato persistito

In `GameState` (`src/sim/state.ts`):

```ts
research: {
  completed: string[];                          // id nodi completati
  active: { nodeId: string; points: number } | null;  // nodo in corso + punti accumulati
};
```

(Array, non Set, per serializzazione JSON diretta.)

**Salvataggi:** bump `CONFIG.saveVersion` 5 → 6 e aggiungere `MIGRATIONS[5]` che inizializza `research: { completed: [], active: null }` sui salvataggi vecchi.

## Template dei comandi (sim)

In `src/sim/commands.ts`:
- `cmdStartResearch(state, nodeId)`: valida che il nodo esista, non sia già completato/attivo, prereq soddisfatti, **una sola ricerca attiva**; `payCost` dell'anticipo; imposta `active`. Nuovi `CommandErrorCode` (es. `researchPrereqMissing`, `researchAlreadyActive`, `researchAlreadyDone`, `researchUnknownNode`).
- (Opzionale) `cmdCancelResearch(state)`: azzera `active` (eventuale rimborso parziale, da decidere).

## Template della progressione (tick)

In `src/sim/tick.ts`, al cambio giorno: se `research.active != null`, `points += researchRate(state)` con
`researchRate = Σ(produzione tecnologia città collegate) × CONFIG.research.pointsFactor + bonusLab(=0)`.
Al raggiungimento di `researchPoints` → sposta il nodo in `completed`, `active = null`, emette un `SimEvent` (la UI lo legge col cursore).

## Template di config

`CONFIG.research = { pointsFactor, /* eventuale baseRate minimo */ }` in `src/sim/config.ts`.

## UI — **DIFERITA** (placeholder, da ridisegnare)

> Oggi **non** si progetta la finestra. Si annota solo come si aggancerà.

- Pulsante **Ricerca** (`bottomBar.ts`, azione `'ricerca'` già esistente) → `researchPanel.toggle()`.
- `src/ui/researchPanel.ts` (futuro) con firma standard `{ toggle(), update(state) }` come `balancePanel.ts`; renderizza il DAG da `node.pos` + archi dai `prereqs`, mostra il progresso del nodo attivo, click sul nodo → `cmdStartResearch`.
- Chiavi i18n `tech.*` (titolo/desc per nodo + messaggi comando `cmd.research*`) in **entrambi** `it.ts` e `en.ts`.
- **Le finestre/aspetto saranno riviste in seguito** → non vincolare il modello dati al layout attuale.

## File toccati (quando si implementerà)

- Nuovi: `src/sim/researchTree.ts`, `src/ui/researchPanel.ts` (poi).
- Modificati: `src/sim/state.ts`, `src/sim/commands.ts`, `src/sim/tick.ts`, `src/sim/config.ts`, `src/sim/save.ts`, `src/i18n/{it,en}.ts`, `src/ui/main.ts`, `src/ui/bottomBar.ts` (wiring).

## Verifica (quando si implementerà)

- Test sim puri: `researchModifiers` (folding effetti), guard di `cmdStartResearch` (prereq/attivo/già fatto), progressione punti nel tick fino al completamento, migrazione v5→v6 (campo `research` inizializzato).
- Parità chiavi i18n it/en per le nuove `tech.*` / `cmd.research*`.
- Determinismo: i punti accumulano con la stessa logica intera/float già usata per le risorse (UI mostra floor).
