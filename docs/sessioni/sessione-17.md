# Sessione 17 — 2026-06-24

**Versione:** v0.122.0
**Commit:** #115–#116 (`bd87a4f`–`<docs>`)
**Punto di partenza:** `4143cd5` (docs: chiusura sessione 16)

## Obiettivo
Realizzare il **Pannello Costruisci** (3° dei 4 pulsanti della barra inferiore), brainstormato
in 4 sottosistemi e implementato fase per fase con verifica a ogni passo.

## Lavoro svolto

### Fase 1 — Pannello Costruisci + Assemblaggio veicoli
- **`src/ui/buildPanel.ts`** (nuovo): modale dal pulsante Costruisci, due tab — **Assemblaggio
  veicoli** | **Costruzione su città**. Scheletro costruito una volta, etichette aggiornate in
  place al cambio lingua, Esc in capture-phase.
- **`src/sim/buildables.ts`** (nuovo): catalogo costruibili come dati (`placement: city|vehicle`,
  `researchWhat` per il gating, chiavi i18n). Helper `vehicleCatalog`/`cityStructureCatalog`
  (filtrano per ricerca sbloccata). v1: F-22 (vehicle), Torre/Lab (city).
- Tab Assemblaggio: selettore città collegate + card F-22 (costo `squadronCost`, si aggiorna
  col cambio città/risorse) → `cmdBuildSquadron`. **Rimosso** il bottone build dal pannello Città.

### Fase 2 — Griglia Strutture (sistema + UI drag&drop)
- **Dati sim**: `CityState.structures` + tipo `Structure` (cell/type/state building·occupied·damaged/
  hp/buildDoneTick), `nextStructureId`. `CONFIG.buildings` (baseSlots 4, popPerSlot 2M, costi/
  buildMinutes/hp, repairCostFactor). **`src/sim/buildings.ts`**: `gridCapacity` (= 4 + pop/2M),
  `structureCost`, `buildTicksFor` (72 min-gioco/tick), geometria esagonale (`hexCells`, costanti
  del prototipo).
- **Comandi**: `cmdBuildStructure` (gate ricerca tower/lab, città collegata, cella libera, paga),
  `cmdRepairStructure`, `cmdRemoveStructure`; promozione `building→occupied` nel tick a buildDoneTick.
- **UI**: **`src/ui/structureGrid.ts`** (nuovo) — porting del prototipo Claude Design *Griglia
  Strutture.html*: griglia esagonale, **drag&drop** dalla tavolozza (ghost + mapping schermo→SVG),
  stati cella, anello di costruzione pilotato dal tempo-gioco, tooltip, popover Ripara/Rimuovi,
  contatore Occupazione. Tavolozza **dinamica** (solo strutture ricercate, classe città). Listener
  window/document agganciati una sola volta. **`src/ui/buildableIcons.ts`** (nuovo): icone condivise.
- Albero: nodo **`torre_dif`** (gate Torre); `laboratorio` esistente gate del Lab. **Salvataggi v7**
  (migrazione v6→v7).

### Fase 3 — Ricerca ad avanzamento nel tempo
- `research` += `selected` + `progress`; `ResearchNode.researchHours` (QG/placeholder 0, altri 24–48h);
  `labCount`/`researchRate` = **1 (QG) + 1/laboratorio operativo** per ora-gioco.
- **`cmdStartResearch`** (rinomina `cmdUnlockResearch`): paga il costo **all'avvio**, imposta
  `selected`; i nodi a 0 ore si sbloccano subito (in fondazione il tick non gira); una ricerca alla
  volta (`researchBusy`). Avanzamento nel **tick** (`progress += researchRate × 1,2`, epsilon float).
- `researchPanel`: stato nodo **researching** (anello giallo + barra), `ready` solo se avviabile e
  nessun'altra in corso; popover con "Avvia ricerca"/"In corso"; transizioni live in
  `updateAffordability` (un nodo si completa da solo a fine ricerca).

### Fase 4 — Torre difensiva (combattimento) + mini-griglia sul globo
- Asset **defense-tower** (rotta `dom`, canna ciano verso l'alto) in `Assets/Umani/Strutture/`;
  modulo arma `defense-tower` in `weapons.ts` (12 danni, 1,5 min, gittata 200 km); `cmdDamageStructure`
  (HP 0 → `damaged`, riparabile, non distrutta).
- **`combatEngine.ts`**: ciclo torri ↔ UFO (sorgente `Shot` tipo `tower`): la torre operativa spara
  all'UFO ingaggiabile in gittata; l'UFO risponde alla torre **solo senza caccia di stanza**. Gating
  per quota (torre a terra). `combatFx.ts`: sorgente/bersaglio `tower` + proiettili **ciano**;
  `combatWindow` ignora gli shot torre.
- **`src/render/cityStructures.ts`** (nuovo): **mini-griglia** delle strutture accanto al nome città
  sul globo (figlia della targhetta CSS2D). La torre usa l'asset in shadow root (id/animazioni
  isolati), riceve la classe `on` quando un UFO è in gittata e **spara da lì** (tracciante ciano dalla
  bocca). La mini-griglia **scala con lo zoom** (wrapper interno `scale(k)`, scatola che riserva lo
  spazio scalato → niente buco sotto il nome).
- **`ufoLayer.ts`**: le torrette plasma ora **mirano la torre** (ruotano verso la città) quando
  rispondono al fuoco senza caccia di stanza (prima `engaged`/`aimTarget` consideravano solo gli
  squadroni).

## File modificati
- Nuovi: `src/ui/buildPanel.ts`, `src/ui/structureGrid.ts`, `src/ui/buildableIcons.ts`,
  `src/sim/buildables.ts`, `src/sim/buildings.ts`, `src/sim/buildings.test.ts`,
  `src/render/cityStructures.ts`, `Assets/Umani/Strutture/defense-tower.{svg,integration.json}`.
- Sim: `state.ts`, `config.ts`, `commands.ts`, `tick.ts`, `researchTree.ts`, `weapons.ts`, `save.ts`,
  `commands.test.ts`.
- Render: `cities.ts` (labelElement), `combatEngine.ts`, `combatFx.ts`, `ufoLayer.ts`,
  `weaponModules.ts` (registro PARZIALE), `squadronWeapons.ts`.
- UI: `cityPanel.ts` (rimosso build), `researchPanel.ts`, `researchIcons.ts` (icona torre_dif),
  `combatWindow.ts`, `style.css`.
- `index.html` (#build-panel), `src/i18n/{it,en}.ts`, `package.json` (0.122.0).

## Decisioni
- Costruzione su città = **griglia esagonale a hardpoint** (prototipo Design), capienza legata alla
  popolazione (4 + 1/2M). Mercato scartato; ambasciata resta nel pannello Città.
- Ricerca **a tempo** guidata dai laboratori (non più sblocco istantaneo); QG dà il tasso base.
- Torre nel ramo **Combattimento** (incolonnata sotto la blindatura → campo allungato a 688).
- Mini-griglia sul globo che **scala con lo zoom**; la torretta UFO mira la torre nel rispondere.

## Test
- `vitest run`: 25 file, **179 test** verdi. `tsc --noEmit` pulito, `vite build` ok.

## Da fare / aperti
- **Tarature a playtest**: costi/`buildMinutes`/HP strutture, `researchHours`, gittate/danno torre,
  scala mini-griglia (`MINI`/`ZOOM_*`), capienza griglia.
- Ultimo pulsante della barra (**Città**) ancora segnaposto.
- Strutture future (scudo, generatore, raffineria, radar, deposito del prototipo): definire effetto/
  costo/ricerca; il Laboratorio è l'unica struttura non-combat con effetto (velocità Ricerca).
- Eventuale: badge/feedback per le città difese da sola torre; UFO che risponde più in alto.
