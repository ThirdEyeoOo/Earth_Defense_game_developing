# Sessione 05 — 2026-06-12

Punto di partenza: commit #61 (41a2323), main pulito, v0.105.0.
Fine sessione: commit #73 (docs), v0.110.0 e v0.111.0 rilasciate e taggate.

## Resoconto

1. **Rehaul economico "Humanity Treasure" (v0.110.0)** — dal brainstorming sul
   modello preparato dall'utente in `Economy-model/` (ECONOMIA.md + nuovo
   cities.json) all'implementazione completa in 5 fasi committabili:
   - **Dati**: `src/data/cities.json` sostituito col dataset risorse (50 città
     × 2–5 risorse tra 10 macrogruppi, amount 0–100); `citiesgdp.json` superato;
     pesi risorse / tassi / costi / kit in `CONFIG.economy`; test d'invariante
     `gdp_post_apoc_humt = Σ peso×amount` su tutte le città.
   - **Sim**: `credits`→`humt`, magazzino globale `state.resources` (float),
     `hqCityId` (null = fase di fondazione, `tick()` no-op), `CityState.embassy`
     e `resources` mutabili (deep-copy dal JSON, predisposti per nemici che
     danneggiano l'economia). `economy.ts` riscritto: producono/pagano solo le
     città collegate (QG+ambasciate), gettito = Σ(peso×amount)×popFactor×aliquota,
     produzione giornaliera nel magazzino, sospensione durante rapimento attivo,
     `embassyCost` che cresce con la distanza dalla rete (riuso greatCircleKm).
     `cmdFoundHq` (gratis + starter kit), `cmdBuildEmbassy`, squadroni a costo
     composito (Ħ300 + 25 industria + 15 combustibili, crescita +50% invariata)
     con helper `payCost`; nuovi codici errore. Salvataggi **v4** con migrazione
     v3 (credits→humt 1:1, vive collegate, QG = città con più squadroni o la più
     popolosa).
   - **UI**: fase di fondazione (banner persistente, salvataggio immediato alla
     fondazione perché l'autosave è a cambio giorno, speed disabilitati, frame
     loop fermo); pannello città con stato rete (★ QG / ● collegata / ○ neutrale),
     risorse con produzione/g, bottone ambasciata; pannello **Bilancio** vero dal
     pulsante della barra inferiore (`src/ui/balancePanel.ts`, pattern radar);
     HUD in Ħ; targhette globo con classi `city-label--hq/--connected`.
     26 chiavi i18n nuove (res.*, cmd.*, panel.*, balance.*, banner.*).
   - **Test**: helper `src/sim/testUtils.ts` (`newGameWithHq`/`grantRiches`)
     perché col guard di fondazione ogni `createNewGame()+tick()` nei test
     sarebbe diventato un no-op silenzioso; suite economia/commands/save
     riscritte; 95 test al merge.
2. **Tutorial "Terzo Occhio" (v0.111.0)** — compagno di gioco: l'occhio animato
   del logo d'intro, estratto a runtime dallo stesso SVG (DOMParser su
   `Logo_intro.svg?raw`, viewBox ritagliato `320 105 80 50`, gruppi `<g>` interi
   per ereditare fill/font) e ancorato sotto la data dell'HUD. Le classi
   `intro-*` riusate portano gratis le animazioni CSS (apertura ritardata,
   blink, orbita pupilla, stato chiuso). Fumetto comic (bordo dorato, codina)
   con sequenza a step **come dati** (`src/ui/tutorialSteps.ts`, funzioni pure
   testate): 3 messaggi di fondazione avanzabili col `>` + «Ben fatto! QG
   fondato a {city}!». Niente `>` sull'ultimo step founding (si avanza fondando).
   Click sull'occhio = tutorial nascosto e banner-istruzione come fallback;
   l'occhio resta dopo la fondazione, pronto per step futuri. Refactor: utility
   occhio condivise in `src/ui/eye.ts` (sanitizeSvg, trackPupil con dispose,
   bindEyeToggle che non invoca il callback sui set programmatici).
3. **Verifiche runtime in browser** (novità di processo): Playwright usa-e-getta
   (`npm i --no-save playwright` + Chrome di sistema via executablePath, script
   poi rimossi) contro il dev server — partita giocata davvero: fondazione a
   Reykjavik, kit, squadrone, gettito = teorico (138 Ħ/g), ambasciata a
   Casablanca, Bilancio coerente, tutta la sequenza tutorial con fallback,
   cambio lingua a caldo, reload da save fondato.
4. **Release**: v0.110.0 (merge 4ff91f0, +96,7 KB) e v0.111.0 (merge 161fc5c,
   +13,6 KB), tag annotati, releases.txt aggiornato (voci in alto; il file è
   locale: `lista aggiornamenti/` è in .gitignore).
5. **Knowledge graph**: aggiornato a ogni tornata (/graphify --update) — nuove
   community "Sim: comandi ed economia HumT" e "Modello economico HumT";
   per i re-flag CRLF post-merge la semantica è stata riusata dal grafo senza
   rilanciare l'estrazione LLM. Ripulito anche un commit accidentale di
   `.superpowers/` (ora in .gitignore).

## Decisioni

- **Lore post-collasso**: la partita inizia DOPO il collasso (0 HumT, 0 risorse);
  si sceglie la città del QG (gratis, con kit di partenza) e solo da lì partono
  economia, orologio e ondate. L'arrivalTick della prima ondata decorre di
  fatto dalla fondazione (tick congelato prima).
- **Espansione progressiva** via Ambasciate (nome scelto dall'utente al posto
  di "Avamposto"): costo HumT+agroalimentare × (1 + distanza/5000 km).
- **Scorte globali + HumT** (no logistica per-città/convogli, per ora);
  nemici futuri potranno danneggiare popolazione E/O amount delle risorse.
- Set edifici minimo: solo QG + Ambasciata; produzione/torri in iterazioni future.
- Migrazione v3→v4 conservativa: vecchie partite restano giocabili con tutte
  le città vive collegate.
- UI con placeholder grezzi funzionali (niente nuovi asset SVG): icone e
  raffinamenti arriveranno dopo senza toccare la logica.
- Versione **v0.110.0** (salto marcato voluto dall'utente per il cambio di
  gameplay); tutorial = v0.111.0.
- Tutorial: riappare a ogni nuova partita (nessuna pref); banner solo fallback;
  4° messaggio post-fondazione col testo breve dell'utente.

## Gotcha scoperti

- Il guard di fondazione in `tick()` rende no-op i test che fanno
  `createNewGame()+tick()`: senza l'helper `newGameWithHq` la suite passerebbe
  senza testare nulla.
- Il JSON importato è un singleton di modulo: le risorse città vanno
  deep-copiate o le mutazioni inquinano le partite successive.
- `git commit -- <pathspec>` su file con deletion staged ne committa il
  contenuto del working tree (annulla il `git rm --cached`).
- I merge convertono LF→CRLF e ri-flaggano i file in `.semantic_pending` anche
  a contenuto identico: si può riusare la semantica già nel grafo senza LLM.
- Playwright: `browser.newPage()` crea un context isolato (localStorage non
  condiviso); l'HUD sfora sotto ~1460px e l'ingranaggio esce dal viewport
  (limite già noto, conferma dal playtest automatico).
- Attributi SVG ereditati (fill/font/text-anchor) vivono sui `<g>` genitori:
  estraendo nodi per un nuovo viewBox vanno importati i gruppi interi.
- `satisfies Record<ResourceType, number>` su CONFIG `as const` dà la
  type-safety dei pesi senza import circolare (tipi risorsa in modulo dedicato
  `resources.ts`, importabile sia da config che da state).

## File modificati (principali)

- Nuovi: `src/sim/resources.ts`, `src/sim/testUtils.ts`, `src/sim/data.test.ts`,
  `src/ui/balancePanel.ts`, `src/ui/eye.ts`, `src/ui/tutorial.ts`,
  `src/ui/tutorialSteps.ts(+test)`, `Economy-model/` (versionato)
- Modificati: `src/data/cities.json` (dataset risorse), `src/sim/{state,economy,
  commands,squadrons,tick,save,config}.ts` e relativi test, `src/main.ts`,
  `src/ui/{hud,cityPanel,intro,style.css}`, `src/i18n/{it,en}.ts` (+33 chiavi),
  `index.html`, `.gitignore` (.superpowers/)
- Release: v0.110.0 (commit #69, 4ff91f0), v0.111.0 (commit #72, 161fc5c)

## Intervallo di commit

Dal commit #62 (ccfdd86, dataset+config fase 1) al commit #73 (docs di
chiusura): merge v0.110.0 #69 (4ff91f0), merge v0.111.0 #72 (161fc5c).
