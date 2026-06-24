# Earth Defense — Contesto operativo

Aggiornato: 2026-06-24 (chiusura sessione 17, commit #116; release v0.122.0 — push su GitHub eseguito; design-system risincronizzato)
Repo pubblico: github.com/ThirdEyeoOo/Earth_Defense_game_developing (README bilingue, MIT, FUNDING).

## Cos'è
Gestionale di difesa planetaria nel browser (TypeScript + Vite + Three.js + Vitest).
Architettura a tre strati con confine netto: **simulazione** deterministica a tick
(`src/sim/`, zero import esterni, RNG con seed nello stato, 20 tick/giorno),
**render** Three.js (`src/render/`, sola lettura dello stato), **UI** DOM (`src/ui/`).
I comandi (`src/sim/commands.ts`) sono l'unico canale di mutazione UI→sim.
Modulo trasversale **i18n** (`src/i18n/`, importabile da ui e render, MAI da sim).

## Stato release
- **v0.1.0** — MVP completo (50 città reali, economia a tasse, ondate UFO, squadroni, salvataggi).
- **v0.101.0** — etichette città, orologio HUD, 10x, moto fluido (tickFraction), UFO orbitali, salvataggi v2.
- **v0.102.0** — restyle SVG (targhette città cliccabili, F-22 animati, dischi volanti, profilo di volo).
- **v0.103.0** — feedback di combattimento: registro eventi sim (salvataggi v3), barre HP
  da asset SVG (shadow DOM), scritte fluttuanti, contatore "Abductions = n", contatori HUD.
- **v0.103.1** — font: Orbitron per i nomi città in targhette semitrasparenti sempre visibili,
  Michroma per tutto il resto (bundlati via @fontsource, zero CDN); HUD a 12px con min-width
  tarati sul caso peggiore (Michroma non ha cifre tabulari).
- **v0.104.0** — gioco bilingue IT/EN (`src/i18n/`), menu impostazioni con selettore lingua
  (ingranaggio nell'HUD e sullo start screen), barra menu inferiore con 4 pulsanti placeholder
  (Bilancio, Costruisci, Ricerca, Città), automazione knowledge graph graphify.
- **v0.105.0** — sequenza d'intro a ogni caricamento (`src/ui/intro.ts`): logo animato
  Third Eye Studios con occhio interattivo (blink, pupilla che segue il mouse, click
  chiude/riapre), click sulla freccia → video 16 MB saltabile (click/Esc) → start screen.
- **v0.110.0** — rehaul economico "Humanity Treasure": mondo post-collasso, valuta HumT,
  10 risorse per città, fondazione del QG + espansione con ambasciate, salvataggi v4,
  pannello Bilancio (vedi sezione Economia).
- **v0.111.0** — tutorial "Terzo Occhio" (`src/ui/tutorial.ts`): l'occhio del logo come
  compagno sotto la data dell'HUD, fumetto a step in fase di fondazione.
- **v0.112.0** — finestra di scontro stile FTL (sola lettura) da badge battaglia +
  helper sim `activeBattles`; 10 icone risorse colorate + fix spaziatura Bilancio
  (table-layout fixed) + ordinamento per peso; finestra Enciclopedia (pulsante "?")
  con prima voce su HumT e gettito. Repo pubblicato su GitHub (README/MIT/FUNDING).
- **v0.113.0** — **fisica orbitale realistica** degli UFO (modulo puro `src/sim/orbit.ts`):
  crociera flip-and-burn, inserimento tangente con spirale di cattura, orbita kepleriana,
  caduta 1/r², salvataggi **v5**; **scala tempo** 1x = 1 s reale → 1 min-gioco, velocità
  **100x/1000x** + tasto **">>>"** (salta al prossimo attacco); nuovo asset UFO animato
  `alien_abductor.svg` reso come **overlay DOM CSS2D** (non più mesh) nel globo e nella
  finestra di scontro. (Vedi "Fisica orbitale" più sotto.)
- **v0.113.1** — **albero della Ricerca (anteprima struttura)**: pannello modale dal pulsante
  Ricerca che disegna il **DAG** dei nodi in SVG (sola lettura); nodi come **dati** in
  `src/sim/researchTree.ts` (3 rami / 8 nodi, campi gameplay non ancora consumati); modello
  completo in **`docs/research-model.md`** (funzionalità di gioco rimandate, finestre da
  ridisegnare). **Sistema di tracciamento dimensionale**: click su UFO/squadrone → etichetta
  flottante con **quota/velocità/ETA** in misure reali (vedi "Tracciamento dimensionale" più
  sotto). Rifiniture rendering UFO: base del raggio sopra il nome città in rapimento, "atterrato"
  a 2/3 con shrink in discesa, orientamento fisso (vista di profilo).
- **v0.113.2** — fix: la targhetta di tracciamento agganciata all'UFO selezionato ora **scompare
  durante il rapimento** (guardia `phase === 'abducting'` nel ramo UFO di `trackingLabel.update()`):
  prima restava visibile sovrapponendosi al raggio traente; ricompare da sé al cambio fase.
- **v0.114.0** — **modello risorse denso** (ogni città produce tutte e 10 le macro-risorse,
  valori 0-100 ancorati alla geografia economica reale — vedi `Economy-model/ranking-risorse-reali.md`;
  `gdp_post_apoc_humt` ricalcolato su 10 termini) + **economia per fascia di popolazione**:
  modulo puro `src/sim/population.ts` + `CONFIG.economy.populationTiers`, 6 fasce DINAMICHE
  (Cittadina 0,20× → Megalopoli 1,00×, soglie 1/4/10/18/26 M, schema "àncora Megalopoli")
  che scalano gettito e produzione (`sizeMultiplier` in `economy.ts`); badge fascia nel
  pannello Città, chiavi i18n `tier.*`. Nessuna compensazione ⇒ economia al ~40% (da tarare).
  Nessuna migrazione salvataggi. Spec/piano in `docs/superpowers/`.
- **v0.115.0** — **ecosistema Claude Design** (vedi sezione dedicata): ponte animazioni SVG
  (regole `docs/EARTH-DEFENSE-ASSET-RULES.md`, manuale PDF, progetto design-system su
  claude.ai/design, pull-on-demand via tool DesignSync) + **catalogo design-system** del gioco
  (generatore `scripts/design-system/`, 19 card token/asset/componenti resi dal codice vero via
  Vite+Chrome/CDP, brand font, auto-sync col pattern graphify). **F-22 ridisegnato** (round-trip
  Design→gioco, `BOOST_ATTACH_Y` 264→275) e squadrone sul globo reso come **un velivolo singolo**
  più grande (non più formazione a 3). **Fix**: durante un rapimento l'overlay UFO non ruba più i
  click destinati alla città (solo `#ufo` cliccabile) ⇒ si può trasferire e ingaggiare. **Widget di
  selezione** (`src/render/selection.ts`, sostituisce `trackingLabel.ts`): reticolo a parentesi
  d'angolo adattato al CORPO dell'oggetto + telemetria sopra + barra HP sotto (helper `render/hpBar.ts`).
- **v0.116.0** — **torretta al plasma** come **modulo arma** su hardpoint (`Assets/Alieni/Armamenti/`):
  finestra di scontro + **globo** (annidata nell'UFO, segue il bersaglio mentre spara, posa idle SW,
  perno al centro dell'ettagono); seam **moduli arma data-driven** (`sim/weapons.ts` `WEAPON_STATS`
  + registro `render/weaponModules.ts`, scala `TURRET_TO_UFO_WIDTH=0,22`). **Combattimento in TEMPO
  REALE a hitbox** (non più a tick): motore `render/combatEngine.ts` (orologio in minuti-gioco, danno
  via `cmdDamageSquadron`) + proiettili globo `render/combatFx.ts`; **rimosso `resolveCombat`**.
  Stat: torretta 15 danni/2 min-gioco; **F-22 150 HP, UFO 500 HP, armature 0** (in v0.116.0 sparava
  solo la torretta UFO; il fuoco caccia arriva in v0.116.1). **Fix pattuglia** (angolo legato all'orologio di gioco → si ferma in pausa, scala
  con la velocità). **Rapimento a capienza** (UFO capacità 100, 100 persone in 8 ore-gioco). **Traiettorie
  orbitali realistiche** a velocità continua C1 (avvicinamento già in moto e tangente, discesa a spirale/
  deorbit). Nessuna migrazione salvataggi. (Vedi sezioni "Fisica orbitale" e "Combattimento" più sotto.)
- **v0.116.1** — **minigun dell'F-22 come modulo arma** sugli hardpoint delle ali (asset da Claude
  Design, `Assets/Umani/Armamenti/minigun-rotante.svg`, rotta dom; `#hardpoint_ala_sx/dx` aggiunti
  all'F-22) + **combattimento a DUE SENSI**: l'UFO ora è **distruttibile**. Motore `combatEngine.ts`
  generalizzato (`Shot` con `from/to` tipizzati, fuoco bidirezionale; fix cap in blocco ad alta
  velocità); nuovo `cmdDamageUfo` (abbatte via `removeUfo('shotDown')`); `WeaponModuleId += 'minigun'`,
  `CONFIG.squadron.weaponModule`. Render globo: **`render/squadronWeapons.ts`** (overlay DOM sugli
  hardpoint **proiettati** del caccia mesh via `units.projectSquadronPoint`, mira all'UFO, spin/fuoco
  con `.on`); `combatFx` disegna entrambe le direzioni (traccianti **gialli** minigun / bolide **verde**
  plasma). Finestra di scontro: minigun annidati nell'SVG del jet, traccianti gialli, UFO con HP calanti.
  **Fix rendering**: volata dei traccianti dal bbox del gruppo arma (non da `#bocca_3` r=0); dimensione
  globo `MINIGUN_TO_JET_WIDTH` 0,34→0,11; armi montate anche in trasferimento. **Danno minigun = 1**
  (da playtest). **Skill di progetto `weapon-modules`** (`.claude/skills/`). Nessuna migrazione salvataggi.
- **v0.120.0** — **economia "Potenziale 1000 / 30 giorni"**: potenziale città = Σ amount (max 1000) =
  produzione su 30 giorni, accreditata 1/30 al giorno (`CONFIG.economy.cycleDays`, rimosso `conversionRate`);
  **gettito sulla somma NON pesata** (`cityPotential`) × popFactor × sizeMultiplier × 0,09 / cycleDays
  (fasce mantenute, 1000 = tetto megalopoli); `dailyIncome` ora **float** (HumT a frazioni). Pannello
  **Città**: ogni risorsa in **quota % sul totale** (`amount/Σamount`) + **Potenziale x/1000**; delta
  produzione mostrato **al giorno** in Città e Bilancio. **Rapimento in TEMPO REALE 1-a-1**
  (`render/abductionEngine.ts` + `cmdAbduct`, non più 15/tick; a capienza → fuga). **Fisica orbitale**:
  avvicinamento che **accelera entrando** (spawn ≥10.000 km/h, `visualStartDistance` 160) con capture-burn
  tangente; **fuga ease-in** (parte da ferma, accelera salendo); fix "teletrasporto" di fuga/trasferimento
  via `phaseStartFraction` (UfoState) / `startFraction` (TransferState) — lo squadrone parte dalla targhetta.
  **Combattimento**: torretta plasma **8** danni; **gittate armi** (`WeaponModule.rangeKm` = 50 km, plasma e
  minigun) con gating fuoco+animazione (`measure.ufoSquadronDistanceKm`); UFO scende vicino alla città in
  rapimento (`surfaceRadius` 1.02→1.004 ≈ 25 km); fix fuoco caccia→UFO sul globo in rapimento
  (`ufoCombatRect`, perché `ufoBodyRect` è null in `abducting`). **Audio**: musica di sottofondo
  `Signal From Vega` (`ui/music.ts`, loop dallo start screen, autoplay al gesto di fine intro) + cursore
  volume 0–100% in Impostazioni (pref `musicVolume`); font **Quantico** bundlato. **Start screen**: sfondo
  artwork `Assets/Intro/Earth Defense Title.jpg`, titolo Quantico verde con glow, finestra semitrasparente,
  **versione letta da `package.json`**, pulsanti Impostazioni/Esci (rimosso l'ingranaggio). **HUD**: valuta
  `🪙 HumT`, velocità 1x/5x/25x/100x/≫. Nessuna migrazione salvataggi.
- **v0.121.0** — rifiniture UI/UX da playtest. **Avvio a schermo intero** (Fullscreen API
  al primissimo gesto utente — i browser non concedono il fullscreen al primo paint —
  one-shot `enterFullscreenOnce` in `main.ts`; niente barra browser come con F11) + opzione
  **"Schermo intero"** in Impostazioni (toggle che segue `fullscreenchange`, chiavi
  `settings.fullscreen*`). **Pannello Città**: largh. **360px**; la quota **% non va più a
  capo** (legata all'ultima parola del nome col `&nbsp;` → il % non resta orfano); **resa/g
  sempre mostrata** anche per le città non collegate (verde = produzione reale collegata,
  **grigio** `res-day--potential` = solo potenziale); **decimali incolonnati** malgrado
  Michroma (split al separatore in celle `d-int`/`d-sep`/`d-frac`, **spazio prima/dopo** il
  separatore). **Pannello Ricerca**: stati nodo a 3 livelli **done** (verde, anello statico)
  / **ready** (BIANCO pulsante = sbloccabile ORA con le risorse attuali, override `--c/--f/--glow`
  + keyframe `research-readyPulse`) / **off** (grigio spento: bloccato/non pagabile/placeholder);
  **rimosso il badge ✓**; affordabilità ricalcolata **in tempo reale** ogni frame
  (`updateAffordability`, senza ridisegnare). **Widget scorte globali** nella card Ricerca:
  **sole iconcine + valore** (HumT 🪙 in testa, `resourcesWidgetHtml`/`updateResources`),
  agganciato allo **scaler** (non allo stage che ha `overflow:hidden`) con `right:100%`+`bottom:0`
  → adiacente in basso a sinistra e solidale col pannello. **Requisiti/costo del popover a
  SOLE iconcine** (`costText`→`costHtml`, nuova `prereqHtml`; icona risorsa per il costo, icona
  nodo per i prereq, nome nel `title`) — **regola fissata anche per le finestre Ricerca future**.
  **Fix**: dopo un pan dell'albero i nodi diventavano inerti (`moved` non azzerato sul
  `pointerdown` del nodo → il click veniva scartato); ora `moved=false` a ogni `pointerdown`.
  Nessuna migrazione salvataggi.
- **v0.122.0** — **Pannello Costruisci** (3° pulsante della barra), brainstormato in 4 sottosistemi
  e implementato a fasi. **Assemblaggio veicoli**: tab del pannello modale `ui/buildPanel.ts`, solo
  F-22 (riusa `cmdBuildSquadron`) con selettore città; catalogo costruibili dati-driven
  `sim/buildables.ts` (`placement: city|vehicle`, `researchWhat` per il gating); il bottone build
  esce dal pannello Città. **Costruzione su città** = **griglia esagonale a hardpoint** (porting
  prototipo Claude Design *Griglia Strutture.html* → `ui/structureGrid.ts`: drag&drop, stati
  empty/occupied/building/damaged, popover Ripara/Rimuovi, tavolozza dinamica per ricerca+classe).
  Sim: `CityState.structures` + `Structure`, `CONFIG.buildings` (capienza `gridCapacity` = 4 + 1 ogni
  2M ab., `sim/buildings.ts` con geometria esagonale), comandi `cmdBuildStructure`/`cmdRepairStructure`/
  `cmdRemoveStructure`, completamento `building→occupied` nel `tick` (buildDoneTick). **Salvataggi v7**.
  **Ricerca ad avanzamento nel tempo** (non più sblocco istantaneo): `research.selected/progress`,
  `ResearchNode.researchHours`, `labCount`/`researchRate` = **1 (QG) + 1/laboratorio operativo**/ora-gioco;
  `cmdUnlockResearch`→**`cmdStartResearch`** (paga all'avvio; i nodi a 0 ore — QG — restano istantanei,
  una ricerca alla volta `researchBusy`); avanzamento nel `tick` (`+researchRate×1,2`). `researchPanel`
  con stato **researching** (anello giallo + barra), `ready` solo se avviabile e nessun'altra in corso.
  Albero: nodo **`torre_dif`** (ramo combat) + campo allungato **610→688** (3 righe combat). **Torre
  difensiva**: asset `defense-tower` (rotta dom, ciano) in `Assets/Umani/Strutture/`, modulo arma
  `weapons.ts` (`defense-tower`: 12 danni/1,5 min/200 km), `cmdDamageStructure` (HP 0 → `damaged`,
  riparabile); `render/combatEngine.ts` ciclo torri↔UFO (torre spara dal globo, UFO risponde mirando
  la torre se non ci sono caccia di stanza), traccianti **ciano** in `combatFx.ts`. **Mini-griglia
  strutture accanto al nome città sul globo** (`render/cityStructures.ts`, figlia della targhetta
  CSS2D): la torre usa l'asset in shadow root e **spara da lì** (classe `on` + tracciante dalla bocca);
  **scala con lo zoom** (wrapper interno `scale(k)` su distanza camera). `ufoLayer` ora mira la torre
  col puntamento delle torrette plasma. `weaponModules` reso **PARZIALE** (la torre ha render proprio).
- Release: a ogni merge chiedere il nome semver all'utente (proponendone uno), **bumpare
  `package.json` `"version"` allo stesso semver** (la UI lo legge e lo mostra nello start
  screen — `src/main.ts` importa `version` da package.json), e aggiornare
  `lista aggiornamenti/releases.txt` (nuova voce IN ALTO; il file è locale, la cartella è
  gitignorata) con recap + delta byte (somma dimensioni `git ls-files`); tag ANNOTATO.
  `commits.txt` si aggiorna da solo (hook git).

## Ecosistema Claude Design (v0.115.0) — animazioni + catalogo
- **Tool DesignSync** (lato Claude, non una CLI): legge/scrive i progetti *design-system* di
  **claude.ai/design** col login claude.ai. Progetto **"Earth Defense — Animazioni"**
  `29a166d6-d6eb-4207-baac-77fea18d5d62` (memoria `claude-design-bridge`).
- **Ponte animazioni** (pull-on-demand): l'utente disegna un SVG là → dice «porta dentro X» → Claude
  `get_file` + valida (rotta `dom` overlay / `mesh` Three.js) + integra in `Assets/`. Regole in
  `docs/EARTH-DEFENSE-ASSET-RULES.md` (intestazione `<!-- ed-asset … -->`, manifest
  `<nome>.integration.json`), caricate anche sul progetto. Manuale `docs/Manuale-Claude-Design.pdf`.
  Il sanitizer SVG di Design **rifiuta i commenti con `--`** (rimuoverli all'upload).
- **Catalogo design-system** del gioco (`scripts/design-system/`, gitignored output `design-system/out/`):
  `node generate.mjs` produce card `@dsCard` di **token** (`tokens.json`), **asset** (SVG di `Assets/`)
  e **componenti** (HUD, Bilancio, Città, radar, ecc.) resi dal **codice vero** con stato finto
  (`testUtils`) via **dev server Vite (hmr:false) + Chrome headless pilotato in CDP** (DevTools
  Protocol; `--dump-dom` non basta su pagine-modulo; Chrome con `--user-data-dir` dedicato). Card
  autosufficienti (font woff2 base64 + style.css inline). 19 card + brand font (`fonts/` + `fonts.css`)
  pushate. **Auto-sync** col pattern graphify: hook `post-commit` locale segnala in
  `design-system/.push_pending` (rigenerazione deterministica); il **push lo lancia Claude** quando
  vede il flag, poi lo cancella.

## Economia HumT (v0.110.0) — il cuore del gameplay
- Lore: il mondo è già collassato (sparizione di quasi tutte le città); il dollaro è
  carta straccia, la valuta è l'**HumT**. Modello e razionali in `Economy-model/ECONOMIA.md`
  (versionato); dataset in `src/data/cities.json` (modello DENSO da giugno 2026: 50 città ×
  **tutte e 10 le risorse**, `amount` = capacità 1-100 ancorata alla geografia economica reale
  — vedi `Economy-model/ranking-risorse-reali.md`; `gdp_post_apoc_humt` = Σ peso×amount su 10
  termini, test d'invarianza in `src/sim/data.test.ts`). Pesi/tassi/costi/kit in `CONFIG.economy`; tipi in
  `src/sim/resources.ts` (modulo dedicato: evita l'import circolare config↔state).
- **Nuova partita = 0 HumT/risorse/squadroni, tempo congelato** (`hqCityId: null`,
  `tick()` no-op): si sceglie una città sul globo e si fonda il QG (`cmdFoundHq`, gratis,
  accredita lo starter kit: Ħ450 + 30 industria + 20 combustibili + 25 agroalimentare =
  basta per il primo squadrone). Da lì partono economia, orologio e ondate (l'arrivalTick
  della prima ondata decorre di fatto dalla fondazione).
- **Rete**: producono e pagano tasse solo le città collegate (QG + ambasciate).
  Modello "Potenziale 1000 / 30 giorni" (v0.120.0): potenziale città = Σ amount (max 1000) = produzione
  su `cycleDays` (30) giorni, accreditata 1/cycleDays al giorno. Gettito/giorno = cityPotential ×
  (pop/popIniziale) × sizeMultiplier × aliquota (0,09) / cycleDays (somma NON pesata: i `resourceWeights`
  non incidono più sul gettito, solo ordinamento Bilancio + lore `gdp_post_apoc_humt`); produzione/giorno
  per risorsa = amount × popFactor × sizeMultiplier / cycleDays → magazzino GLOBALE
  `state.resources` (float, la UI mostra floor; anche l'HumT ora è float). Rapimento attivo = città sospesa.
  Gli `amount` sono mutabili nello stato (deep-copy dal JSON!): predisposti per nemici
  futuri che danneggiano le risorse oltre alla popolazione.
- **Ambasciata** (`cmdBuildEmbassy`): costo (Ħ150 + 20 agroalimentare) × (1 + km/5000)
  dalla città collegata più vicina. **Squadroni**: Ħ300 + 25 industria + 15 combustibili,
  crescita +50% per squadrone in città su tutte le componenti (`payCost` helper).
  Vincolo emergente: senza città industriali collegate niente nuovi squadroni.
- **Salvataggi v4** (migrazione v3: credits→humt 1:1, città vive collegate, QG = città
  con più squadroni o la viva più popolosa). La fase di fondazione è salvabile
  (hqCityId null) e si salva ESPLICITAMENTE alla fondazione (l'autosave è a cambio giorno).
- **Test**: il guard di fondazione rende no-op `createNewGame()+tick()` → usare
  `newGameWithHq`/`grantRiches` da `src/sim/testUtils.ts` in ogni test che ticka.

## i18n (v0.104.0) — regole operative
- `src/i18n/it.ts` = fonte di verità (`MessageKey`); `en.ts` forzato completo da
  `Record<MessageKey, string>`; `t(chiave, {params})` interpola `{x}`.
- OGNI stringa visibile passa da i18n con ENTRAMBE le traduzioni (regola in CLAUDE.md).
- Sim pura: `CommandResult` = codici (`CommandErrorCode`) + params; la UI traduce con
  `t('cmd.<code>')`. Nomi dinamici: `cityName(id, fallback)`, `countryName`, `regionName`.
- Cambio lingua a caldo: span HUD/radar/pannelli si ridisegnano da soli; il resto è agganciato
  al callback `onLanguageChange` in main.ts (title, html.lang, bottoni HUD, targhette globo
  via `cityLayer.refreshNames()`, start/end screen, barra inferiore, modal).
- Preferenza in localStorage `earth-defense-prefs` (`src/ui/prefs.ts`), default dal browser.
- Date/numeri: `format.ts` usa `getLocale()` (it-IT/en-US).
- Test: parità chiavi e placeholder it/en, sync con cities.json (50 città, 40 paesi tradotti).

## UI (oltre l'HUD)
- **Finestra di scontro FTL** (`src/ui/combatWindow.ts` + `src/render/battleBadges.ts`,
  v0.112.0): visualizzazione cinematica SOLA LETTURA. Un badge CSS2D lampeggiante
  (`battle-badge`) sopra le città in combattimento → click → overlay centrato z-18
  (`#combat-window`) con F-22 inline e UFO (`alien_abductor`) in SHADOW DOM per istanza
  (l'inline+id-strip romperebbe le animazioni dell'asset), classe `.on` (raggio) solo in
  rapimento; barre HP, traccianti, flash d'impatto, esito.
  Tempo live; pattern toggle/update; chiusura Esc capture-phase. La condizione "città in
  combattimento" è l'helper PURO `activeBattles(state)` (+`interface Battle`) in
  `src/sim/combat.ts`: unica fonte usata da motore di combattimento, `hpBars`, `effects`, badge e
  finestra (niente più duplicazione; confine sim rispettato, nessun i18n).
  Da v0.116.0 la finestra monta sull'UFO le **torrette al plasma** (overlay che mirano al caccia) e
  disegna gli **stessi `shot` del motore real-time** (`render/combatEngine.ts`), non più traccianti
  finti; gli HP restano della sim (`cmdDamageSquadron`).
- **Enciclopedia** (`src/ui/encyclopedia.ts` + `encyclopediaEntries.ts`, v0.112.0):
  pulsante "?" a sinistra dell'ingranaggio nell'HUD (`tasto-enciclopedia.svg` 48×48 come il
  gear; `margin-left:auto` sul "?" per tenere la coppia a destra). Modale nav-voci+contenuto
  (z-20), voci COME DATI estendibili (`{id, titleKey, bodyKey}`). Prima voce: HumT e gettito.
  Corpo HTML dentro le stringhe i18n MA senza `{ }` (altrimenti `t()` li scambia per
  placeholder e rompe il test di parità).
- **Icone risorse** (`src/ui/resourceIcons.ts`, v0.112.0): 10 SVG colorate in
  `Assets/Widgets/Risorse/<ResourceType>.svg`, inline via `?raw`+`stripForInline` (ora
  esportata da `icons.ts`); usate in Bilancio e pannello Città. Nel Bilancio le risorse sono
  ordinate per peso (`CONFIG.economy.resourceWeights`, 10→1) e la tabella ha colonne a
  larghezza fissa (`table-layout: fixed` + `<colgroup>`) così i numeri non slittano
  (Michroma non ha cifre tabulari); nome a capo allineato sotto le lettere (cella flex).
- **Tutorial "Terzo Occhio"** (`src/ui/tutorial.ts` + `tutorialSteps.ts`, v0.111.0):
  l'occhio del logo estratto A RUNTIME da `Logo_intro.svg?raw` (DOMParser, viewBox
  ritagliato `320 105 80 50`, importare i `<g>` INTERI: fill/font vivono sui genitori),
  fisso sotto la data (`#tutorial-companion`, top 44 left 12, z-15). Le classi `intro-*`
  riusate danno gratis le animazioni CSS (apertura ~2s, blink, orbita pupilla, stato
  chiuso). Utility condivise intro/tutorial in `src/ui/eye.ts` (sanitizeSvg, trackPupil
  con dispose, bindEyeToggle: onToggle solo sui click utente, mai sui set programmatici).
  Sequenza a step COME DATI in `tutorialSteps.ts` (funzioni pure testate): 3 step
  founding + founded; niente `>` sull'ultimo step founding (si avanza fondando);
  fumetto ridisegnato solo al cambio chiave (ha un bottone). Click sull'occhio =
  tutorial nascosto → il banner `banner.chooseHq` torna come FALLBACK (main.ts decide
  via `tutorial.isHidden()` in bootGame/Esc/onLanguageChange/callback visibilità).
  L'occhio resta dopo la fondazione, pronto per step futuri. Riappare a ogni nuova
  partita (nessuna pref).
- **Pannello Bilancio** (`src/ui/balancePanel.ts`, v0.110.0): toggle dal pulsante
  Bilancio della barra inferiore (gli altri 3 restano placeholder); scorte per tipo
  con produzione/g, gettito Ħ/g, città collegate. Pattern radar (toggle+update).
- **Pannello città** (`src/ui/cityPanel.ts`): modalità fondazione (risorse + "Fonda
  qui" + anteprima kit), stato rete (★ QG / ● collegata / ○ neutrale), risorse con
  produzione/g, bottone ambasciata, costo squadrone composito. Targhette globo:
  classi `city-label--hq` (stella) e `--connected` (verde) in `render/cities.ts`.
- **Intro** (`src/ui/intro.ts`, v0.105.0): overlay `#intro-screen` z-25 (sopra start screen
  z-20, sotto impostazioni z-30), visibile dal primo paint; si nasconde da solo a fine intro
  (lo start screen è già costruito sotto), `onDone` no-op = hook per musica futura.
  Fase logo: SVG inlineato con sanitizzazione propria (title/desc/on*, NON stripForInline:
  servono le classi `intro-*`), timeline CSS in style.css sezione `/* intro */`, freccia
  cliccabile solo dopo l'`animationend` del suo fade-in (+ `stopPropagation` sul click).
  Occhio: blink ogni 4 s; pupilla segue il mouse (px schermo → unità SVG via larghezza reale
  dell'anello, max 4,5; dal primo mousemove `.intro-pupil--tracking` spegne l'orbita);
  click su `intro-eye-hit` chiude/riapre (`!important` per battere le animazioni di blink).
  Fase video: parte dal click (user gesture ⇒ audio ok); `finish()` idempotente su
  ended/error/click/Esc (Esc capture-phase come settings); teardown completo del `<video>`.
  Gotcha CSS: due animazioni sulla stessa proprietà → l'ultima vince per tutta la sua durata
  (pulse sui FIGLI del gruppo in fade-in; i keyframe del blink replicano lo stato a riposo).
- **Menu impostazioni** (`src/ui/settings.ts`): overlay z-30, bottoni Italiano/English,
  apertura da ingranaggio HUD (in fondo, `margin-left:auto`) e start screen; Esc chiude in
  capture-phase (non interferisce con l'annullamento trasferimenti, handler bubble).
- **Barra inferiore** (`src/ui/bottomBar.ts`): 4 pulsanti SVG in ordine Bilancio, Costruisci,
  Ricerca, Città; click → `showBanner(t('banner.comingSoon'))` (placeholder, pannelli da fare).
  Gli SVG hanno il `<text>` segnaposto vuoto riempito da i18n (`refreshLabels`).
- `showBanner(text, ms|null)` in main.ts è l'helper unico per il banner (null = resta visibile).
- Font: Michroma default ovunque (i `<button>` NON ereditano: `font-family: inherit` nel CSS;
  gli shadow DOM richiedono la dichiarazione nel loro `<style>`); Orbitron solo `.city-label`.

## Vincoli asset SVG (Three.js SVGLoader)
- Solo **fill solidi**: niente gradienti, filtri, `defs`/`use`, testo, animazioni SMIL/CSS
  (SVGLoader converte solo la geometria dei path in mesh; le animazioni si fanno nel loop di render).
- `viewBox` definito, forma centrata; velivoli col **muso verso l'alto** (flip Y in `buildSvgModel`).
- **Parti animabili su path separati con `id`**: il builder le indicizza per nome.
- Gli SVG per la UI DOM (widget, pulsanti, icone) invece possono usare tutto, MA: niente
  `@import` di font esterni (Michroma è bundlata) e niente testo hardcoded (i18n).
  All'inject nel DOM: strip di id e `<title>` (`stripForInline` in `src/ui/icons.ts`).

## Asset esistenti e id animabili
### `Assets/Umani/Velivoli/f22_raptor_animabile.svg` (viewBox 200×300)
- Statici: `fusoliera`, `deriva_sx/dx`, `presa_sx/dx`, `ugello_sx/dx`, `abitacolo`.
- `boost_sx_esterno/interno`, `boost_dx_esterno/interno` — fiamme, pivot ugelli (y SVG = 264).
- `luce_nav_sx` (rossa), `luce_nav_dx` (verde), `luce_strobo_coda` (bianca).

### `Assets/Alieni/UFO/alien_abductor.svg` (viewBox 600×860, v0.113.0)
- Sostituisce `ufo_disco_volante.svg`. SVG **DOM ricco** (gradienti/filtri/animazioni CSS):
  **NON passa da SVGLoader** → reso come overlay DOM/CSS2D in shadow root (`render/ufoLayer.ts`)
  e nella finestra di scontro. Gruppi separabili: nave `#ufo` (sempre) + raggio/suolo `#beam`
  (rapito/detriti/erba/terreno bruciato). Hardpoint armi `#hardpoint-left/right` (feature futura).
- Adattato a **on-demand** (regola README dell'asset): a riposo ante chiuse + raggio spento;
  la classe **`.on`** sul root (toggle in fase `abducting`) apre le ante e accende `#beam` con
  transizioni. Animazioni idle della nave in loop (levitazione, visor, beacon, rimlight, glifi).
- Inbox per asset sostitutivi futuri: `AssetsReplacedbydev/` (gitignored; integrare in `Assets/`).

### `Assets/Widgets/Barre/health-bar-{humans,aliens}.svg` (viewBox 530×92)
- **Non passano da SVGLoader** (gradienti/filtri/testo): inline nel DOM, uno shadow root per
  istanza. API: `#hb-fill-group` scalato via `scaleX(0..1)`, `#hb-value` testo %, classe
  `is-critical` su `#hb-root` ≤25%; colori con `--hb-fill-a/b` inline su `#hb-root`.
  Font testo: Michroma (dichiarato nello `<style>` interno). Testi "HP"/"%"/"LOW" non tradotti.

### `Assets/Widgets/Barra_Menu_Superiore/tasto-{impostazioni,enciclopedia}.svg` (48×48)
- Ingranaggio (gearIcon) ed Enciclopedia "?" (encyclopediaIcon), stesso stile (rect arrotondato
  `#121B33`/`#2B3D63`, glifo a stroke `#A9BCD9`); inline via `?raw`+`stripForInline` in icons.ts.

### `Assets/Widgets/Risorse/<ResourceType>.svg` (viewBox 24×24, v0.112.0)
- 10 icone risorsa colorate (nome = `ResourceType`), inline DOM via `src/ui/resourceIcons.ts`.

### `Assets/Widgets/badge-scontro.svg` (viewBox 32×32, v0.112.0)
- Badge "scontro in corso": disco rosso con spade incrociate; CSS2D pulsante sopra le città
  in combattimento (render/battleBadges.ts), nessun `<text>`.

### `Assets/Widgets/Barra_Menu_Inferiore/Pulsanti/tasto-{bilancio,costruisci,ricerca,citta}.svg` (190×48)
- Pulsanti barra inferiore, gruppo `btn-*`, icona stroke + `<text>` segnaposto vuoto (i18n).

### `Assets/Intro/` — Logo_intro.svg (viewBox 690×420) + Intro_video.mp4 (16 MB)
- Logo: classi (non id) come hook CSS/JS — `intro-dash` ×3 (occhio chiuso), `intro-eye-open`
  (parentesi + gruppo cerchi con `intro-eye-ring`/`intro-pupil`), `intro-studio`,
  `intro-presents`, `intro-author`, `intro-next` (pulsante), `intro-eye-hit` (rect di click
  invisibile). Testi brand in inglese = artwork, esenti da i18n. Inline nel DOM da intro.ts
  (mai da SVGLoader). Video: import Vite come URL, scaricato solo al click sulla freccia.

## Animazioni implementate (`src/render/units.ts`, loop di render)
### Caccia (squadrone = UN solo F-22 ingrandito, da v0.115.0)
- Luci nav in controfase sfasate, strobo coda ~90 ms ogni 1,5 s; boost solo in trasferimento
  (crescita eased + flicker); pattugliamento circolare rasoterra a scala 0.5, decollo/atterraggio
  smoothstep (12% della rotta) fino a crociera 1.045 a scala 1.
- **Pattuglia legata al tempo-gioco** (v0.116.0): l'angolo usa l'orologio in **minuti-gioco**
  (`PATROL_SPEED_PER_GAMEMIN`, passato a `UnitLayer.update`) → si ferma in pausa e accelera col
  time-scale (prima girava su `performance.now()`, indipendente da pausa/velocità).
### UFO (v0.113.0 — overlay DOM, non più mesh Three.js)
- Reso da `render/ufoLayer.ts`: una istanza CSS2D in shadow DOM per UFO (asset `alien_abductor`,
  animazioni interne via CSS). Posizione 3D da `UnitLayer.ufoPosition` (UnitLayer resta l'autorità,
  calcolata da `orbit.positionAt`, letta anche da hpBars/effects/floatingText). **Shrink prospettico**
  per distanza dalla camera (`px = W·H/(2·d·tan(fov/2))`, scala clampata); occlusione dietro il globo
  (`isOccludedByGlobe`); classe `.on` (raggio+ante) solo in `abducting`. Manopole in `ufoLayer.ts`:
  `WORLD_WIDTH` (dimensione), `MIN/MAX_SCALE`, `SHIP_OFFSET_PX`.
### Feedback (layer CSS2D separati)
- `hpBars.ts`: barre visibili solo se danneggiati/ingaggiati (linger 1,2 s), colori continui,
  critico ≤25% con LOW. `floatingText.ts`: toast dagli eventi sim (chiavi `float.*`), cursore
  `lastSeenId`; contatore "Abductions = n". `horizon.ts`: `isOccludedByGlobe` anche in quota.
- Gotcha CSS2D: offset/animazioni su elementi INTERNI; `element.remove()` manuale alla rimozione.

## Fisica orbitale (v0.113.0) — `src/sim/orbit.ts` (modulo PURO, condiviso sim↔render)
- Unica fonte di verità della traiettoria nemica (come `combat.activeBattles`): zero import
  esterni, ritorni plain `{x,y,z}`, niente THREE/i18n. Sim e render la condividono.
- Modello a **velocità continua (C1) a ogni bordo di fase** (rifatto v0.116.0): avvicinamento con
  profilo radiale **ease-out** `p(2−p)` (parte GIÀ in moto, niente da-fermo; radiale 0 all'orbita =
  tangente), virata di cattura calibrata sulla velocità angolare REALE dell'orbita
  (`computeCaptureSweep` su ω=(T−Δ)/Porb, manopola `CAPTURE_FRACTION`); orbita kepleriana che spazza
  **T−Δ** (`orbitPhaseTicks` su T geometrico); **discesa a SPIRALE che decelera** (deorbit: parte a
  velocità orbitale, atterra ~ferma sopra la città) con **Δ = T·Tf/(2·Porb+Tf)** (forma chiusa che
  rende C1 sia approach→orbita sia orbita→discesa→hover); fuga speculare. `cruiseTicks` (timing da
  distanza UA) e `freefallTicks` (durata discesa/fuga) invariati. Niente migrazione salvataggi
  (forma `OrbitalParams` invariata; `captureSweep` ricalcolato per le nuove partite).
- **Determinismo blindato**: la sim usa solo tick interi precalcolati; i float trascendentali
  vivono solo nel pixel disegnato. Parametri in `CONFIG.physics` (μ, quote, scala UA, distanza
  lunare, `engageAltitude`) + `CONFIG.ufoAbductor` (massa, spinta, `startDistanceAu`, giri).
  Costanti "reali scalate" (μ da g reale, τ = 4320 s-gioco/tick); **leva di taratura principale =
  quota d'orbita**.
- **Tasto ">>>"** (main.ts): 1000x finché il primo UFO incrocia la distanza lunare (`lunarCrossTick`),
  poi 1x (one-shot; controllo DENTRO il loop tick per non sorpassare). `GameSpeed` = 0|1|2|4|10|100|1000.
- Test: `src/sim/orbit.test.ts` (20, incl. regressione **continuità di velocità** avvicinamento→orbita);
  `ufos`/`events` test osservano le transizioni (durate non più costanti → `advanceUfoToPhase` in testUtils).

## Gameplay/sim — punti chiave
- UFO: spazio profondo → avvicinamento → orbita (N giri) → discesa → **rapimento a capienza**
  → fuga. **Durate derivate dalla fisica** (vedi sopra). Rapimento (v0.116.0): l'UFO ha
  `captureCapacity = 100` e rapisce `abductionPerDay = 300` (= 100 persone in 8 ore-gioco, 15/tick);
  la fase `abducting` finisce a **capienza piena o città esaurita** (non più a durata fissa; rimosso
  `abductionDays`). Perdita popolazione = rapiti a bordo, applicata **all'uscita** (`removeUfo`).
- **Combattimento in TEMPO REALE a DUE SENSI** (v0.116.1, non più a tick): `resolveCombat` rimosso dal
  `tick`; il motore `render/combatEngine.ts` (orologio in minuti-gioco di `main.ts`) genera gli `shot`
  bidirezionali (`Shot` con `from/to` tipizzati: torrette UFO→caccia **e** minigun caccia→UFO) e applica
  il danno a impatto via `cmdDamageSquadron` / `cmdDamageUfo` (l'UFO è **distruttibile**: a HP≤0
  `removeUfo('shotDown')`). Stat arma nei moduli (`sim/weapons.ts` `WEAPON_STATS`): torretta 15/2min,
  minigun 1/0,25min. Cap in blocco (`BLOCK_CAP`) separato dal cap proiettili (`MAX_QUEUED`) per non
  strozzare le armi a cadenza alta ad alta velocità.
- Ingaggio **per quota** (`combat.isEngageable`: fase atmosferica + `altitudeAt ≤ engageAltitude`;
  default `engageAltitude` = quota d'orbita ⇒ comportamento come prima). `UfoState` += `orbit`/
  `phaseTotalTicks`/`lunarCrossTick`/`captureSweep`.
- Registro eventi sim (`state.events`): id monotoni, trim a 40 tick; UI legge col cursore.
- Salvataggi versionati (**v7**; v4→v5 ricostruisce `orbit` da spawnDir + città; **v5→v6** aggiunge
  `research.unlocked` sbloccando i nodi implementati; **v6→v7** aggiunge `CityState.structures`,
  `nextStructureId`, `research.selected/progress`); la velocità è salvata (pausa ⇒ riparte in pausa).

## Tracciamento dimensionale (v0.113.1) — `src/sim/measure.ts` (modulo PURO)
- Conversioni unità-gioco→reali: `altitudeKm`/`speedKmH` (1 raggio render = `EARTH_RADIUS_KM`
  = 6371 km; `GAME_SECONDS_PER_TICK` = 86400/`ticksPerDay` = 4320). La fisica è già in scala:
  velocità orbitale a 1.6 raggi ≈ 22.500 km/h (valore reale). Helper UFO: quota da `altitudeAt`,
  velocità per differenza centrale di `positionAt`, **ETA** = tick residui fino al rapimento
  (somma durate fasi via `orbitPhaseTicks`/`freefallTicks`, `null` in abducting/escaping); helper
  squadrone (15 km, 2250 km/h, ETA dal transfer). `kmToMiles`/`kmToFeet` per le unità americane.
- **Widget di selezione** `src/render/selection.ts` (da v0.115.0, sostituisce `trackingLabel.ts`):
  overlay in **coordinate-schermo** (NON CSS2D) sull'oggetto selezionato. **Reticolo a parentesi
  d'angolo adattato al CORPO**: UFO = bbox della sola nave `#ufo` via `getBoundingClientRect`
  (esclude il raggio, `ufoBodyRect` in `ufoLayer.ts`); velivolo = dimensione proiettata (`squadronRect`
  in `units.ts`). **Telemetria SOPRA** (titolo + Quota + Velocità + **ETA → città**) e **barra HP
  SOTTO** (asset SVG via helper condiviso `render/hpBar.ts`; `HpBarLayer` salta l'unità selezionata).
  Occluso dietro il globo; **nascosto durante il rapimento UFO**. **ETA continuo** (sottrae
  `tickFraction`). **Unità per lingua**: EN ⇒ americane (piedi/mph), IT ⇒ km/km/h; ETA in tempo
  (g/h IT, d/h EN). Chiavi `track.*` in it/en. Formatta con solo i18n (niente import da `ui/`).
- **Picking**: UFO (DOM) via handler `click` sull'anchor in `ufoLayer.ts` (guardia anti-drag,
  `.ufo-anchor/.ufo-host` `pointer-events:auto`); squadroni (mesh) via **THREE.Raycaster** sul
  canvas in `main.ts` (risale a `userData.squadronId`; click nel vuoto deseleziona). Stato
  `selectedUnit` in main.ts (Esc/nuova partita azzerano; auto-clear se l'oggetto sparisce).
- **Squadroni**: il rendering resta a quota esagerata (modelli ~223 km ingranditi per visibilità);
  i 15 km / 2250 km/h vivono **solo nel readout**. `CONFIG.squadron.speedKmPerDay` 24000→54000
  (crociera 2250 km/h, velocità di trasferimento effettiva) + `cruiseAltitudeKm: 15`.

## Albero della Ricerca (sessione 15, NON ancora rilasciato) — pannello + meccanica completa
- Ricreato dal prototipo Claude Design (`Albero della Ricerca.html` + `RICERCA-PANEL-INSTRUCTIONS.md`).
  **`src/ui/researchPanel.ts`** è ora un overlay **DOM/CSS** (non più DAG statico in SVG): stage
  913×610 con `fit()`, campo **zoomabile/trascinabile** (wheel verso il puntatore, `− ↻ +`, pan su
  spazio vuoto soglia 3px, limiti 0,5–3×), **bordi animati** (`@property --ang` + `borderRun`, tutte
  le animazioni in `prefers-reduced-motion`), **tooltip** su hover, **popover requisiti** ✓/✗ (flip
  sopra il nodo per le righe basse). Icone dei 7 nodi in **`src/ui/researchIcons.ts`**. CSS del
  prototipo in `style.css` **scoped sotto `.research-stage`** (evita collisioni coi nomi generici).
- **Dati** (`src/sim/researchTree.ts`): **10 nodi** (combat/economy/orbital), interfaccia ricca con
  `effect` **dichiarativo** (`unlock`/`mult`) + `researchHours` (ore-ricerca, 0 = istantaneo), `pos`
  = angolo alto-sx nel campo 913×688, `cost`, `icon`, `isResult`, `placeholder`; helper puri
  **`isUnlocked`/`isResearched`/`researchMult`/`labCount`/`researchRate`**. `RESEARCH_CANVAS` = 913×688
  (3 righe nel ramo combat: minigun/blindatura/torre_dif).
- **Meccanica (v0.122.0 — ad avanzamento nel tempo)**: stato `research.{unlocked,selected,progress}`;
  comando **`cmdStartResearch`** paga il costo **all'avvio** e imposta `selected` (i nodi a 0 ore — QG —
  si sbloccano subito; una ricerca alla volta). L'avanzamento è nel **`tick`**: `progress += researchRate
  × 1,2`, dove `researchRate = 1 (QG) + 1/laboratorio operativo`; a quota piena sblocca. **Gating** delle
  funzioni: `quartier_gen` (gratis/istantaneo) → `cmdFoundHq`; `caccia` → `cmdBuildSquadron`;
  `collegamento` → `cmdBuildEmbassy`; `minigun`/`blindatura` → moduli arma/armatura; `telescopio` → Radar;
  **`lab`** → edificio Laboratorio (accelera la Ricerca); **`torre_dif`** → Torre difensiva.
  `diplomazia`/`intercettore` ancora placeholder.
- **Salvataggi v7** (migrazione **v6→v7**: aggiunge `structures`/`nextStructureId`/`research.selected/progress`).
  `newGameWithHq` (testUtils) sblocca i nodi implementati. Da tarare a playtest (costi, `researchHours`,
  `armor`).

## Knowledge graph (graphify)
- Grafo del codebase in `graphify-out/` (gitignored), ~570 nodi. Hook git aggiornano la parte
  codice a ogni commit/checkout/merge (AST, background, log in `~/.cache/graphify-rebuild.log`);
  i non-code finiscono in `.semantic_pending` → eseguire `/graphify --update` (regola CLAUDE.md).
- Interprete pinnato negli hook (`_PINNED`); dopo refactoring distruttivi: `graphify update . --force`.
- Gotcha: il rebuild AST-only scarta i nodi semantici dei file non-code nel diff (ripristino
  dalla cache); i merge convertono LF→CRLF e cambiano gli hash di cache.
- Esplorazione: `graphify query "<domanda>"`, `path`, `explain`, `affected`.

## Prossimi passi concordati
1. Pannelli della barra inferiore: Bilancio (v0.110.0), Ricerca (v0.113.1+) e **Costruisci** (v0.122.0)
   fatti; resta solo **Città** come placeholder "Funzione in arrivo".
2. Economia: edifici di produzione, torri difensive, mercato/vendita surplus, nemici che
   danneggiano gli amount delle risorse (stato già predisposto); SVG QG/ambasciata (oggi
   placeholder funzionali); bilanciamento col playtest (CONFIG.economy). Icone risorse FATTE
   (v0.112.0).
3. Tutorial: step futuri (primo squadrone, prima ambasciata, prima ondata) — la sequenza
   a dati in tutorialSteps.ts è già pronta; eventuale accenno al collasso nell'intro.
4. Taratura visiva del nuovo UFO (`WORLD_WIDTH`/scala in `ufoLayer.ts`, offset, alone abducting in
   style.css) e bilanciamento della fisica orbitale col playtest (CONFIG.physics, quota d'orbita).
   Stat per-nemico già parziali (massa/spinta/UA su `ufoAbductor`); orientamento UFO sul globo oggi
   billboard verticale (raggio verso il basso-schermo), polish futuro.
5. Meta-progressione / **albero tecnologico**: pannello interattivo + meccanica di sblocco a
   pagamento + gating FATTI (sessione 15, vedi sezione "Albero della Ricerca"). Da fare: tarare
   costi/bilanciamento a playtest, step dedicato del tutorial per lo sblocco del QG, eventuali
   nodi-potenziamento `mult` (l'helper `researchMult` c'è ma nessun nodo v1 lo usa), e contenuto
   per i placeholder `diplomazia`/`intercettore` + la feature `lab`.
6. Eventuale: HUD responsive sotto i ~1460px (oggi sfora, l'ingranaggio esce dal viewport).
7. Enciclopedia: nuove voci (squadroni, ambasciate, ondate UFO, combattimento) — struttura
   a dati pronta in encyclopediaEntries.ts.
8. Finestra di scontro: eventuale audio/animazioni più ricche.
9. **Combattimento**: il fuoco caccia a due sensi è FATTO (v0.116.1, minigun → vedi sezione e skill
   `weapon-modules`). Da fare: stat `range` + gating del fuoco sul globo per distanza, accuratezza/miss
   veri sulla hitbox, bilanciamento HP/danno/cadenza col playtest (danno minigun oggi = 1, da rivedere);
   **playtest visivo del globo** (minigun in patrol/trasferimento/combat). Eventuale `descentDuration`
   dedicata se si vuole la discesa a spirale più lenta. Eventuale secondo modulo / armi multiple per unità.
   **Design-system da risincronizzare** (i commit di sessione 12/13 hanno cambiato UI/asset → `design-system/.push_pending`).
