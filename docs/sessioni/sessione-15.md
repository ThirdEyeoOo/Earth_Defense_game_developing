# Sessione 15 — 2026-06-20

Punto di partenza: commit #109 (f127c2b), v0.120.0.
Fine sessione: commit #111 (docs di chiusura). Nessuna release/merge (lavoro su `main`, non pushato).

## Resoconto

1. **HUD — restyle "a stanghette" (da figura Claude Design).** Aggiunte le **stanghette
   divisorie** (`.hud-sep`) fra i campi (data · HumT · Pop · Abductions · Morti · Prossima ondata ·
   gruppo velocità) e racchiuso il **gruppo velocità in un riquadro** (`#hud-speeds` con bordo/sfondo).
   Span centrati. Un primo passaggio aveva aggiunto un **pallino arancione** all'HumT, poi **rimosso**
   su richiesta. Markup in `ui/hud.ts`, stile in `ui/style.css`.

2. **Pannello Ricerca — ricreazione fedele del prototipo Claude Design** (`Albero della
   Ricerca.html` + `RICERCA-PANEL-INSTRUCTIONS.md`, letti via DesignSync). Riscritto
   **`ui/researchPanel.ts`** come overlay **DOM/CSS** (prima era un DAG statico in SVG):
   stage 913×610 con `fit()`, campo **zoomabile/trascinabile** (wheel verso il puntatore, `− ↻ +`,
   pan su spazio vuoto con soglia 3px, limiti 0,5–3×), **bordi animati** (`@property --ang` +
   `borderRun`, tutte le animazioni dentro `prefers-reduced-motion`), **tooltip** su hover, **popover
   requisiti** con ✓/✗ (con flip sopra il nodo per le righe basse). Icone dei 7 nodi estratte in
   **`ui/researchIcons.ts`**. CSS del prototipo portato in `ui/style.css`, **scoped sotto
   `.research-stage`** (evita collisioni coi nomi generici), font Michroma al posto di Quantico/Quicksand.

3. **Ricerca — meccanica COMPLETA (data-driven, modello B).** `sim/researchTree.ts` riscritto:
   **9 nodi** del prototipo (combat/economy/orbital), interfaccia ricca con `effect` **dichiarativo**
   (`unlock`/`mult`), `pos` = angolo alto-sx nel campo 913×610, `cost`, `icon`, `isResult`,
   `placeholder`; helper puri **`isUnlocked`/`isResearched`/`researchMult`**. Stato
   **`GameState.research.unlocked`** (`state.ts`). Comando **`cmdUnlockResearch`** (`commands.ts`):
   verifica prereq, paga il costo via `payCost`, sblocca. **Gating** delle funzioni esistenti:
   - `quartier_gen` (**gratis**, ricerca iniziale) → `cmdFoundHq`;
   - `caccia` → `cmdBuildSquadron`; `collegamento` → `cmdBuildEmbassy`;
   - `minigun` → minigun montato/fuoco (`render/combatEngine.ts`, `render/squadronWeapons.ts`);
   - `blindatura` → `CONFIG.squadron.armor` (2) riduce il danno in `cmdDamageSquadron`;
   - `telescopio` → pulsante Radar + preavviso ondate nell'HUD (`ui/hud.ts`).
   `lab`/`diplomazia`/`intercettore` senza consumer (placeholder/feature future).
   **Salvataggi v6** (migrazione **v5→v6** che sblocca tutti i nodi implementati per le partite in
   corso). **Banner e tutorial** aggiornati per guidare lo sblocco gratuito del QG a inizio partita.
   Wiring in `main.ts` (`onUnlock`/`getState`).

4. **Bootstrap "uovo e gallina" risolto.** Fondare il QG è gated, ma serve per avere risorse da
   spendere in ricerca → il nodo **Quartier Generale è a costo 0**: è la prima ricerca (gratis) che
   abilita la fondazione; tutto il resto costa e richiede l'economia già avviata.

5. **Verifica.** `tsc` pulito, **169 test** verdi (aggiornati: `commands.test.ts` per gating/armatura
   + nuovo blocco `cmdUnlockResearch`; `save.test.ts` per la migrazione v5→v6; `testUtils.newGameWithHq`
   sblocca i nodi implementati così i test esistenti che fondano/costruiscono passano), `vite build` ok.
   Commit #110 su `main`.

6. **Ipotesi NON applicata — gettito pesato.** Discusso (su domanda dell'utente) un modello in cui il
   **gettito = aliquota × valore di produzione** (Σ produzione×peso), che riallineerebbe codice ed
   Enciclopedia (che descrive già il "PIL = Σ peso×capacità"). Pianificato e quasi avviato, poi
   **fermato dall'utente: era solo un'ipotesi.** Nessuna modifica al codice economico.

## Decisioni

- **Ricerca: meccanica completa, non solo anteprima** (scelta utente), modello dati **B**
  (`effect` dichiarativo per gating/bonus), **QG come ricerca iniziale gratuita** per sciogliere il
  circolo d'avvio, **placeholder** per Diplomazia/Intercettore, **costi di default** proposti (da
  tarare a playtest), unlock **istantaneo a pagamento** (come da istruzioni) e non a punti-nel-tempo
  (modello di `research-model.md` superato).
- **Modifica al codice del gioco** (fonte di verità), non solo alla card del catalogo (che si
  rigenera dal codice). Colori/font del gioco mantenuti dove le istruzioni li chiedevano (Michroma).
- **HUD**: niente pallino HumT (rimosso su richiesta); restano stanghette + riquadro velocità.
- **Gettito pesato**: scelto "9% sul valore di produzione (~6×)" in fase di pianificazione, ma il
  lavoro è stato **annullato** prima di toccare il codice.

## File modificati (commit #110)

- Sim: `sim/researchTree.ts` (riscritto), `sim/state.ts` (+`research`), `sim/commands.ts`
  (+`cmdUnlockResearch`, gating, armatura), `sim/config.ts` (`saveVersion` 6, `squadron.armor` 2),
  `sim/save.ts` (migrazione v5→v6), `sim/testUtils.ts`.
- Render: `render/combatEngine.ts`, `render/squadronWeapons.ts` (gating minigun).
- UI: `ui/researchPanel.ts` (riscritto), `ui/researchIcons.ts` (nuovo), `ui/hud.ts` (stanghette +
  gating radar/ondate), `ui/style.css` (pannello Ricerca + restyle HUD), `main.ts` (wiring pannello).
- i18n: `i18n/it.ts` + `i18n/en.ts` (chiavi `tech.*` dei 9 nodi + chrome pannello, `cmd.research*`,
  `hud.nextWaveUnknown`, testi banner/tutorial d'avvio).
- Test: `sim/commands.test.ts`, `sim/save.test.ts`.
- Chiusura: `docs/sessioni/sessione-15.md` (nuovo), `docs/sessioni/INDICE.md`,
  `.claude/contesto-progetto.md`.

## Prossimi passi / note

- **Design-system da risincronizzare**: il commit ha cambiato 4 file UI/asset → hook segnala
  `design-system/.push_pending`. Rigenerare le card (`node scripts/design-system/generate.mjs`) e
  ripushare su Claude Design (non fatto in sessione).
- **Bilanciamento Ricerca a playtest**: squadroni dietro 3 ricerche (minigun+blindatura→caccia),
  costi di default e `CONFIG.squadron.armor` (2) da tarare.
- **`lab`/`diplomazia`/`intercettore`**: nodi senza effetto (feature future / placeholder).
- **Tutorial**: l'apertura ora richiede di sbloccare il QG nella Ricerca; banner/tutorial aggiornati
  via testo, ma uno step dedicato del tutorial "Terzo Occhio" sarebbe più chiaro.
- **Gettito pesato** (`gettito = aliquota × valore di produzione`): ipotesi accantonata, ripristinabile
  dal piano se si decide di riprenderla (riallineerebbe Enciclopedia e `gdp_post_apoc_humt`).
- **Release**: il lavoro è su `main`, **non pushato** e senza bump semver/tag (non richiesto). Da
  decidere il semver al prossimo merge/release.

## Intervallo commit

commit #110 (5e5bdb6, feat: pannello Ricerca + stanghette HUD) → commit #111 (docs di chiusura).
Nessun merge/tag in questa sessione.
