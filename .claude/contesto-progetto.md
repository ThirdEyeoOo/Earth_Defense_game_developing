# Earth Defense — Contesto operativo

Aggiornato: 2026-06-11 (chiusura sessione 03, commit #58, main pulito, v0.104.0 rilasciata)

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
- Release: a ogni merge chiedere il nome semver all'utente (proponendone uno) e aggiornare
  `lista aggiornamenti/releases.txt` (recap + delta byte, somma dimensioni `git ls-files`).
  `commits.txt` si aggiorna da solo (hook git).

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

### `Assets/Alieni/UFO/ufo_disco_volante.svg` (viewBox 240×200, profilo, centro disco 120,95)
- Statici: `disco_corpo`, `mozzo_inferiore`.
- `cupola`, `luce_cupola`, `luce_1`…`luce_7`, `raggio_traente` (pivot y SVG = 108, nascosto di default).

### `Assets/Widgets/Barre/health-bar-{humans,aliens}.svg` (viewBox 530×92)
- **Non passano da SVGLoader** (gradienti/filtri/testo): inline nel DOM, uno shadow root per
  istanza. API: `#hb-fill-group` scalato via `scaleX(0..1)`, `#hb-value` testo %, classe
  `is-critical` su `#hb-root` ≤25%; colori con `--hb-fill-a/b` inline su `#hb-root`.
  Font testo: Michroma (dichiarato nello `<style>` interno). Testi "HP"/"%"/"LOW" non tradotti.

### `Assets/Widgets/Barra_Menu_Superiore/tasto-impostazioni.svg` (48×48)
- Ingranaggio del menu impostazioni; inline via `?raw` (gearIcon in icons.ts).

### `Assets/Widgets/Barra_Menu_Inferiore/Pulsanti/tasto-{bilancio,costruisci,ricerca,citta}.svg` (190×48)
- Pulsanti barra inferiore, gruppo `btn-*`, icona stroke + `<text>` segnaposto vuoto (i18n).

## Animazioni implementate (`src/render/units.ts`, loop di render)
### Caccia (squadrone = formazione a ^ di 3 F-22)
- Luci nav in controfase sfasate, strobo coda ~90 ms ogni 1,5 s; boost solo in trasferimento
  (crescita eased + flicker); pattugliamento circolare rasoterra a scala 0.5, decollo/atterraggio
  smoothstep (12% della rotta) fino a crociera 1.045 a scala 1.
### UFO
- Billboard (`quaternion.copy(camera.quaternion)`); luci 1–7 in sequenza rotante (2,5× in volo,
  lenta nel rapimento); cupola+luce pulsanti (lampeggio 150 ms nel rapimento); raggio traente
  esteso a terra durante il rapimento; scala 1 (orbita) → 0.5 (suolo) smoothstep sulla quota.
### Feedback (layer CSS2D separati)
- `hpBars.ts`: barre visibili solo se danneggiati/ingaggiati (linger 1,2 s), colori continui,
  critico ≤25% con LOW. `floatingText.ts`: toast dagli eventi sim (chiavi `float.*`), cursore
  `lastSeenId`; contatore "Abductions = n". `horizon.ts`: `isOccludedByGlobe` anche in quota.
- Gotcha CSS2D: offset/animazioni su elementi INTERNI; `element.remove()` manuale alla rimozione.

## Gameplay/sim — punti chiave
- UFO: spazio profondo → ~1 giorno avvicinamento → 3 orbite da ⅓ giorno → discesa → rapimento
  (10 persone/giorno) → fuga. Ingaggiabile solo da discesa in poi (`ENGAGEABLE_PHASES`).
- Perdita popolazione = rapiti a bordo all'uscita di scena. Config velocità per fase in
  `CONFIG.ufoAbductor.travel` (predisposta per stat per-fase future).
- Registro eventi sim (`state.events`): id monotoni, trim a 40 tick; UI legge col cursore.
- Salvataggi versionati (**v3**) con migrazioni; la velocità viene salvata (pausa ⇒ riparte in pausa).

## Knowledge graph (graphify)
- Grafo del codebase in `graphify-out/` (gitignored), ~490 nodi. Hook git aggiornano la parte
  codice a ogni commit/checkout/merge (AST, background, log in `~/.cache/graphify-rebuild.log`);
  i non-code finiscono in `.semantic_pending` → eseguire `/graphify --update` (regola CLAUDE.md).
- Interprete pinnato negli hook (`_PINNED`); dopo refactoring distruttivi: `graphify update . --force`.
- Gotcha: il rebuild AST-only scarta i nodi semantici dei file non-code nel diff (ripristino
  dalla cache); i merge convertono LF→CRLF e cambiano gli hash di cache.
- Esplorazione: `graphify query "<domanda>"`, `path`, `explain`, `affected`.

## Prossimi passi concordati
1. Pannelli veri per i 4 pulsanti della barra inferiore (Bilancio, Costruisci, Ricerca, Città)
   — oggi placeholder "Funzione in arrivo".
2. Stat di velocità per-fase di viaggio per ogni nemico/difesa (config già strutturata).
3. Meta-progressione / albero tecnologico (pulsante Ricerca già pronto) — post-MVP, da spec.
4. Eventuale: HUD responsive sotto i ~1460px (oggi sfora, limite noto).
