# Sessione 11 — 2026-06-18

Punto di partenza: commit #94 (8946489), v0.114.0.
Fine sessione: commit #98 (docs di chiusura), v0.115.0 rilasciata e taggata (al commit #97, 930f08d).

## Resoconto

1. **Ponte Claude Design (animazioni SVG)** — collegato il gioco a **claude.ai/design** tramite il
   tool **DesignSync** (legge/scrive progetti design-system col login claude.ai). Creato il progetto
   **"Earth Defense — Animazioni"** (`29a166d6-d6eb-4207-baac-77fea18d5d62`) e caricate le **regole di
   authoring** `docs/EARTH-DEFENSE-ASSET-RULES.md` (due rotte `dom`/`mesh`, intestazione
   `<!-- ed-asset … -->`, manifest gemello `<nome>.integration.json`) + esempi (alien_abductor, f22).
   Flusso bidirezionale ma **pull-on-demand**: l'utente disegna là, Claude preleva e integra. Manuale
   d'uso `docs/Manuale-Claude-Design.pdf` (sorgente .md → HTML → PDF con convertitore Node + Chrome
   headless). **Commit #95**.

2. **Catalogo design-system del gioco su Claude Design (Tier 2 + auto-sync)** — brainstorming →
   scelta Tier 2 (token + asset + anteprime componenti) con sync automatico. Generatore
   `scripts/design-system/` (deterministico, no LLM): **token** da `tokens.json`, **asset** dagli SVG
   di `Assets/` (commenti XML rimossi per il sanitizer), **componenti** resi dal **codice vero** con
   stato finto (`testUtils`) via **dev server Vite (hmr:false) + Chrome headless pilotato in CDP**
   (DevTools Protocol; `--dump-dom` non basta — la pagina-modulo non scatta `load`). 19 card pushate +
   brand font (woff2 + `fonts.css`) per togliere l'avviso "Missing brand fonts". Auto-sync col pattern
   graphify: hook `post-commit` locale segnala in `design-system/.push_pending`; il push lo lancia
   Claude (DesignSync). **Commit #96**.

3. **F-22 ridisegnato (round-trip Design→gioco) + squadrone a velivolo singolo** — l'utente ha
   ridisegnato l'F-22 sul canvas; prelevato con `DesignSync get_file`, validato (rotta mesh, fill
   solidi, id intatti) e re-importato in `Assets/Umani/Velivoli/f22_raptor_animabile.svg`. Le fiamme
   ora attaccano a y=275 → riallineata la costante **`BOOST_ATTACH_Y` 264→275** per mantenere
   l'animazione dei booster. Lo squadrone sul globo è ora **un solo F-22 più grande**
   (`SQUADRON_FIGHTER_LENGTH`, ~1.6×), non più la formazione a ^ di tre. **Commit #97**.

4. **Fix: trasferimento/ingaggio durante un rapimento** — bug: non si riusciva a trasferire uno
   squadrone nella città sotto rapimento. **Causa radice (systematic-debugging)**: a livello sim era
   già permesso (città viva, fase `abducting` ingaggiabile, difensore arrivato combatte); il blocco era
   l'**overlay UFO** (`.ufo-anchor`/`.ufo-host` `pointer-events:auto` + `stopPropagation`) che durante
   il rapimento copre il nome della città e ruba il click. Fix: **solo la nave `#ufo` cattura i click**
   (`pointer-events:auto` nel shadow DOM), riquadro/raggio trasparenti ai click. Test di regressione in
   `combat.test.ts`. **Commit #97**.

5. **Widget di selezione** — brainstorming → design approvato. Selezionando UFO o velivolo compare un
   **reticolo a parentesi d'angolo adattato al corpo** (UFO: solo la nave via `getBoundingClientRect`
   su `#ufo`, niente raggio; velivolo: dimensione proiettata), con **telemetria SOPRA** e **barra HP
   SOTTO**. Nuovo `render/selection.ts` (overlay in coordinate-schermo, sostituisce `trackingLabel.ts`),
   helper condiviso `render/hpBar.ts`; `HpBarLayer` salta l'unità selezionata (no doppioni). **Commit #97**.

6. **Merge + release v0.115.0 + chiusura** — 3 commit logici su `main`, tag annotato v0.115.0 al
   commit #97, `releases.txt` aggiornato (delta +238.690 byte, di cui ~162 KB il PDF), push su
   `origin/main`. **Commit #98** (docs di chiusura).

## Decisioni

- **claude.ai/design = strato visivo, non logica** (la logica resta a graphify). Ponte = catalogo di
  card + asset, non sync sorgente live. Push lato Claude (DesignSync non è una CLA), rigenerazione
  deterministica via hook — stesso schema di graphify (`.semantic_pending`).
- **Componenti renderizzati dal codice vero** (Vite+CDP) invece di mockup riscritti a mano → le card
  non divergono. **CDP** invece di `--dump-dom` (più affidabile su pagine-modulo). Chrome con
  `--user-data-dir` dedicato (evita conflitto col profilo dell'utente).
- **F-22**: tenere gli id animabili stabili è il vincolo; un cambio di geometria che sposta gli ugelli
  richiede di riallineare il pivot delle fiamme nel codice (264→275).
- **Bug rapimento**: fix alla radice nel layer di interazione (pointer-events sulla sola nave), non
  workaround nella sim (che era già corretta).
- **Widget di selezione**: reticolo **adattivo** (non fisso) sul CORPO visibile; un unico overlay
  screen-space con i tre pezzi (telemetria/reticolo/HP) per allineamento garantito; riuso dell'asset
  HP via helper condiviso. HP sempre visibile mentre l'oggetto è selezionato.

## File modificati

- Ponte Design (doc): `docs/EARTH-DEFENSE-ASSET-RULES.md` (nuovo), `docs/manuale-claude-design.md`
  (nuovo), `docs/Manuale-Claude-Design.pdf` (nuovo).
- Catalogo: `scripts/design-system/{tokens.json,cards.json,harness.html,harness.ts,generate.mjs,README.md}`
  (nuovi), `.gitignore` (ignora `design-system/out/`).
- Gioco/render: `Assets/Umani/Velivoli/f22_raptor_animabile.svg`, `src/render/units.ts`
  (single fighter + BOOST_ATTACH_Y + `squadronRect`), `src/render/ufoLayer.ts` (pointer-events nave +
  `ufoBodyRect`), `src/render/hpBars.ts` (refactor + salta selezionato), `src/render/hpBar.ts` (nuovo),
  `src/render/selection.ts` (nuovo, sostituisce `trackingLabel.ts` rimosso), `src/main.ts`,
  `src/ui/style.css`, `src/sim/combat.test.ts` (test regressione).
- Chiusura: `docs/sessioni/sessione-11.md` (nuovo), `docs/sessioni/INDICE.md`,
  `.claude/contesto-progetto.md`, `lista aggiornamenti/releases.txt` (locale, gitignored).

## Esterno al repo (Claude Design)

Progetto `29a166d6-d6eb-4207-baac-77fea18d5d62`: `EARTH-DEFENSE-ASSET-RULES.md`, `README.md`,
`examples/` (alien_abductor, f22), `design-system/` (19 card token/asset/componenti), `fonts/` +
`fonts.css`. Memoria `claude-design-bridge` con projectId e convenzioni.

## Prossimi passi / note

- Il catalogo `design-system/` su Design è da **ri-sincronizzare** dopo il commit #97 (asset F-22 e
  `style.css` cambiati ⇒ flag `design-system/.push_pending`): rigenerare e ripushare le card cambiate.
- Widget di selezione: misure (`PAD_PX`/`GAP_PX`/braccia) facili da ritoccare col playtest; durante il
  rapimento il widget si nasconde (scelta di design, riconsiderabile).
- Tutto il rendering resta non testabile a livello unit (niente DOM hit-testing in vitest): le verifiche
  dei layer sono per ragionamento + screenshot/HMR.

## Intervallo commit

commit #95 (ac07da8) → commit #98 (docs di chiusura). Tag v0.115.0 al commit #97 (930f08d).
