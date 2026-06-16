# Earth Defense — Contesto operativo

Aggiornato: 2026-06-16 (chiusura sessione 08, commit #84, main pulito, v0.113.1 rilasciata)
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
- Release: a ogni merge chiedere il nome semver all'utente (proponendone uno) e aggiornare
  `lista aggiornamenti/releases.txt` (nuova voce IN ALTO; il file è locale, la cartella è
  gitignorata) con recap + delta byte (somma dimensioni `git ls-files`); tag ANNOTATO.
  `commits.txt` si aggiorna da solo (hook git).

## Economia HumT (v0.110.0) — il cuore del gameplay
- Lore: il mondo è già collassato (sparizione di quasi tutte le città); il dollaro è
  carta straccia, la valuta è l'**HumT**. Modello e razionali in `Economy-model/ECONOMIA.md`
  (versionato); dataset in `src/data/cities.json` (50 città × 2-5 risorse tra 10 macrogruppi,
  `amount` = capacità 0-100; `gdp_post_apoc_humt` = Σ peso×amount, test d'invarianza in
  `src/sim/data.test.ts`). Pesi/tassi/costi/kit in `CONFIG.economy`; tipi in
  `src/sim/resources.ts` (modulo dedicato: evita l'import circolare config↔state).
- **Nuova partita = 0 HumT/risorse/squadroni, tempo congelato** (`hqCityId: null`,
  `tick()` no-op): si sceglie una città sul globo e si fonda il QG (`cmdFoundHq`, gratis,
  accredita lo starter kit: Ħ450 + 30 industria + 20 combustibili + 25 agroalimentare =
  basta per il primo squadrone). Da lì partono economia, orologio e ondate (l'arrivalTick
  della prima ondata decorre di fatto dalla fondazione).
- **Rete**: producono e pagano tasse solo le città collegate (QG + ambasciate).
  Gettito/giorno per città = Σ(peso×amount_corrente) × (pop/popIniziale) × aliquota (0,09);
  produzione/giorno per risorsa = amount × 0,1 × popFactor → magazzino GLOBALE
  `state.resources` (float, la UI mostra floor). Rapimento attivo = città sospesa.
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
  `src/sim/combat.ts`: unica fonte usata da `resolveCombat`, `hpBars`, `effects`, badge e
  finestra (niente più duplicazione; confine sim rispettato, nessun i18n).
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
### Caccia (squadrone = formazione a ^ di 3 F-22)
- Luci nav in controfase sfasate, strobo coda ~90 ms ogni 1,5 s; boost solo in trasferimento
  (crescita eased + flicker); pattugliamento circolare rasoterra a scala 0.5, decollo/atterraggio
  smoothstep (12% della rotta) fino a crociera 1.045 a scala 1.
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
- Modello ibrido (l'UFO ha i motori): crociera **flip-and-burn** (timing da distanza UA,
  `cruiseTicks`), **spirale di cattura** che arriva TANGENTE all'orbita con velocità che combacia
  (continuità C1, niente scatti — `computeCaptureSweep`/`captureSweep`, manopola `CAPTURE_FRACTION`),
  orbita kepleriana (`orbitalPeriodTicks`, `orbitPhaseTicks`), caduta 1/r² (`freefallTicks`),
  hover propulso, fuga.
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
- UFO: spazio profondo → avvicinamento → orbita (N giri) → discesa → rapimento (10 persone/giorno)
  → fuga. **Durate ora derivate dalla fisica** (vedi sopra), non più costanti da CONFIG.
- Ingaggio **per quota** (`combat.isEngageable`: fase atmosferica + `altitudeAt ≤ engageAltitude`;
  default `engageAltitude` = quota d'orbita ⇒ comportamento come prima). `UfoState` += `orbit`/
  `phaseTotalTicks`/`lunarCrossTick`/`captureSweep`. Perdita popolazione = rapiti a bordo all'uscita.
- Registro eventi sim (`state.events`): id monotoni, trim a 40 tick; UI legge col cursore.
- Salvataggi versionati (**v5**, migrazione v4→v5: ricostruisce `orbit` da spawnDir + città); la
  velocità viene salvata (pausa ⇒ riparte in pausa).

## Tracciamento dimensionale (v0.113.1) — `src/sim/measure.ts` (modulo PURO)
- Conversioni unità-gioco→reali: `altitudeKm`/`speedKmH` (1 raggio render = `EARTH_RADIUS_KM`
  = 6371 km; `GAME_SECONDS_PER_TICK` = 86400/`ticksPerDay` = 4320). La fisica è già in scala:
  velocità orbitale a 1.6 raggi ≈ 22.500 km/h (valore reale). Helper UFO: quota da `altitudeAt`,
  velocità per differenza centrale di `positionAt`, **ETA** = tick residui fino al rapimento
  (somma durate fasi via `orbitPhaseTicks`/`freefallTicks`, `null` in abducting/escaping); helper
  squadrone (15 km, 2250 km/h, ETA dal transfer). `kmToMiles`/`kmToFeet` per le unità americane.
- **Etichetta flottante** `src/render/trackingLabel.ts` (CSS2D, una sola label sull'oggetto
  selezionato, occlusa dietro il globo, ricostruita ogni frame; formatta con solo i18n, niente
  import da `ui/`). Mostra titolo + Quota + Velocità + **ETA → città**. **ETA continuo**: sottrae
  `tickFraction` → scorre in tempo reale (non a scatti di tick). **Unità per lingua**: EN ⇒
  americane (altitudine in **piedi**, velocità in **mph**); IT ⇒ km/km/h; l'ETA è tempo (g/h IT,
  d/h EN). Chiavi `track.*` in it/en.
- **Picking**: UFO (DOM) via handler `click` sull'anchor in `ufoLayer.ts` (guardia anti-drag,
  `.ufo-anchor/.ufo-host` `pointer-events:auto`); squadroni (mesh) via **THREE.Raycaster** sul
  canvas in `main.ts` (risale a `userData.squadronId`; click nel vuoto deseleziona). Stato
  `selectedUnit` in main.ts (Esc/nuova partita azzerano; auto-clear se l'oggetto sparisce).
- **Squadroni**: il rendering resta a quota esagerata (modelli ~223 km ingranditi per visibilità);
  i 15 km / 2250 km/h vivono **solo nel readout**. `CONFIG.squadron.speedKmPerDay` 24000→54000
  (crociera 2250 km/h, velocità di trasferimento effettiva) + `cruiseAltitudeKm: 15`.

## Albero della Ricerca (v0.113.1) — anteprima struttura, funzionalità da fare
- Nodi come **dati** puri in `src/sim/researchTree.ts` (`ResearchNode`: ramo, tier, prereq,
  coordinate, costo/punti/effetto **non ancora consumati**); 3 rami / 8 nodi nella v1. Modello
  completo e razionali in **`docs/research-model.md`** (progressione a tempo, velocità da
  produzione _tecnologia_ + lab futuri, **DAG** con coordinate manuali, effetti dichiarativi →
  modificatori derivati, stato `research` + migrazione salvataggi v5→v6 da implementare).
- `src/ui/researchPanel.ts`: modale dal pulsante Ricerca che disegna il **DAG in SVG** (sola
  lettura, `tech.*` i18n). Le **finestre verranno ridisegnate** prima di agganciare la meccanica.

## Knowledge graph (graphify)
- Grafo del codebase in `graphify-out/` (gitignored), ~570 nodi. Hook git aggiornano la parte
  codice a ogni commit/checkout/merge (AST, background, log in `~/.cache/graphify-rebuild.log`);
  i non-code finiscono in `.semantic_pending` → eseguire `/graphify --update` (regola CLAUDE.md).
- Interprete pinnato negli hook (`_PINNED`); dopo refactoring distruttivi: `graphify update . --force`.
- Gotcha: il rebuild AST-only scarta i nodi semantici dei file non-code nel diff (ripristino
  dalla cache); i merge convertono LF→CRLF e cambiano gli hash di cache.
- Esplorazione: `graphify query "<domanda>"`, `path`, `explain`, `affected`.

## Prossimi passi concordati
1. Pannelli veri per i 3 pulsanti rimasti della barra inferiore (Costruisci, Ricerca, Città)
   — Bilancio è fatto (v0.110.0); gli altri sono placeholder "Funzione in arrivo".
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
5. Meta-progressione / **albero tecnologico**: struttura+anteprima FATTE (v0.113.1, vedi sezione
   "Albero della Ricerca" e `docs/research-model.md`). Da fare: ridisegno finestre poi meccanica
   vera — stato `research`, comandi `cmdStartResearch`, avanzamento nei tick, effetti→modificatori,
   migrazione salvataggi v5→v6 (tutto già speccato nel doc).
6. Eventuale: HUD responsive sotto i ~1460px (oggi sfora, l'ingranaggio esce dal viewport).
7. Enciclopedia: nuove voci (squadroni, ambasciate, ondate UFO, combattimento) — struttura
   a dati pronta in encyclopediaEntries.ts.
8. Finestra di scontro: eventuale audio/animazioni più ricche; oggi è sola lettura.
