# Sessione 07 — 2026-06-15

Punto di partenza: commit #79 (3a9a0b2), v0.112.0.
Fine sessione: commit #82 (docs di chiusura), v0.113.0 rilasciata e taggata.

## Resoconto

1. **Brainstorming "fisica orbitale" + implementazione (Fasi 0-4, commit #80, 43fa435)** —
   lungo brainstorming a domande (ambito, fedeltà, timing, architettura, calibrazione, scala
   tempo, controlli velocità), poi implementazione TDD. Nuovo modulo **PURO** `src/sim/orbit.ts`
   (zero import, ritorni `{x,y,z}`): crociera **flip-and-burn** (timing da distanza UA), orbita
   **kepleriana**, **caduta 1/r²**, hover propulso, fuga; durate di fase e soglie d'ingaggio
   **derivate dalla fisica** e salvate come **tick interi** (determinismo). `UfoState` +=
   `orbit`/`phaseTotalTicks`/`lunarCrossTick`; ingaggio **per quota** (`combat.isEngageable`);
   migrazione **salvataggi v4→v5**; `render/units.ts` `ufoTarget` delega a `orbit.positionAt`.
   Scala tempo (main.ts): **1x = 1 s reale → 1 min-gioco** (`72000`); velocità **100x/1000x** e
   tasto **">>>"** (salta al prossimo attacco: 1000x → 1x quando il primo UFO incrocia la distanza
   lunare). 20 test in `orbit.test.ts`; `ufos`/`events` test riscritti sulle transizioni.
2. **Fix "scatto" avvicinamento→orbita (in #80)** — l'avvicinamento radiale decelerava a ~zero
   e l'orbita partiva tangenziale ⇒ discontinuità di velocità. Aggiunta **spirale di cattura**
   (`computeCaptureSweep`/`captureSweep`, `CAPTURE_FRACTION`): l'UFO arriva **tangente** all'orbita
   con velocità che combacia (continuità C1). Test di regressione sulla continuità di velocità.
3. **Nuovo asset UFO + rework rendering (commit #81, 21ae1b1)** — l'utente ha fornito
   `alien_abductor.svg` (in `AssetsReplacedbydev/`) per sostituire `ufo_disco_volante.svg`.
   È un **SVG DOM ricco** (gradienti/filtri/animazioni CSS) → incompatibile con SVGLoader:
   l'UFO del globo passa da mesh Three.js a **overlay CSS2D** (`src/render/ufoLayer.ts`, una
   istanza in **shadow DOM** per UFO, come hpBars). Posizione dalla fisica (`UnitLayer` resta
   autorità delle posizioni); **shrink prospettico** per distanza dalla camera; `#beam` (raggio)
   solo in `abducting` via classe `.on`. Asset adattato da loop demo a **on-demand**. Finestra di
   scontro: nave UFO in shadow root per istanza. Rimosso `ufo_disco_volante.svg`.
4. **Release v0.113.0 (commit #81, +delta)** — tag annotato, push di `main` + tag su GitHub,
   `releases.txt` aggiornato (voce in alto; file locale, `lista aggiornamenti/` gitignored).
   `AssetsReplacedbydev/` aggiunta a `.gitignore` (inbox per asset sostitutivi).
5. **Knowledge graph**: `/graphify --update` (asset rimosso/aggiunto + doc di sessione).

## Decisioni

- **Fisica nel gameplay** (non solo estetica): la fisica **deriva** i tempi delle fasi e l'ingaggio
  diventa per quota. Architettura **A**: stato orbitale analitico nella sim + **soglie in tick
  precalcolate** (interi → determinismo blindato), modulo puro condiviso col render.
- **Meccanica orbitale piena ma "onesta"** per un UFO con motori: cattura/hover/salita propulse,
  solo caduta/coast balistiche. Crociera **flip-and-burn** (UA → tempo); orbita **circolare** +
  deorbita. Calibrazione **costanti reali scalate** (μ da g reale, τ=4320 s/tick); leva = quota d'orbita.
- **Combattimento spaziale**: modello di colpo **homing/hitscan** scelto (mantiene economico
  l'intercetto), ma il modello di **danno** resta a HP per ora (rimandato).
- **Scala tempo**: rallento globale 24× (1 s reale = 1 min-gioco); **100x/1000x** + ">>>" che torna
  a **1x** quando il **primo** UFO arriva a distanza lunare (one-shot).
- **Nuovo asset UFO in ENTRAMBI** globo + finestra di scontro; **nave sempre, raggio solo in
  rapimento**; UFO del globo come **overlay DOM** (non mesh, l'asset non passa da SVGLoader);
  **shrink prospettico** (richiesta esplicita) invece della dimensione pixel fissa.
- Versione **v0.113.0** (bump minor: feature retrocompatibili con migrazione salvataggi).

## Gotcha scoperti

- **Scatto avvicinamento→orbita = discontinuità di velocità** (modulo *e* direzione): il moto
  radiale che decelera a zero incontra l'orbita tangenziale. Serve una traiettoria che arrivi
  **tangente** con velocità che combacia → spirale di cattura tarata sulle durate (C1).
- **Determinismo float**: le funzioni trascendentali possono divergere tra macchine → la sim
  decide solo su **tick interi** precalcolati e salvati; i float vivono solo nel render.
- **Tensione di scala "costanti reali"**: 1 UA reale ≈ 23.500 raggi (non sta nella scena) → si
  separa il **timing fisico** (distanza UA) dalla **quota visiva** di comparsa nel render.
- **`alien_abductor.svg` non passa da SVGLoader** (gradienti/filtri/anim) e le sue animazioni sono
  in un `<style>` keyed per id/classi → **non** si possono strippare gli id (romperebbe tutto) né
  inlineare N volte (collisioni) → **shadow DOM per istanza** (globo e finestra di scontro).
- **CSS2D ha dimensione in pixel fissa** (non rimpicciolisce con la prospettiva) → lo shrink a
  distanza va calcolato a mano: `px = W·H/(2·d·tan(fov/2))`, scala clampata.
- A **1000x** il loop fa molti tick/frame: il controllo del ">>>" va **dentro** il `while (acc>=1)`
  dopo ogni `tick()`, per scendere a 1x esattamente al tick d'incrocio.

## File modificati (principali)

- Nuovi: `src/sim/orbit.ts(+test)`, `src/render/ufoLayer.ts`,
  `Assets/Alieni/UFO/alien_abductor.svg`. Rimosso: `Assets/Alieni/UFO/ufo_disco_volante.svg`.
- Modificati (fisica): `src/sim/{config,state,ufos(+test),combat,save,commands,testUtils}.ts`,
  `src/sim/events.test.ts`, `src/render/units.ts`, `src/main.ts`, `src/ui/hud.ts`,
  `src/i18n/{it,en}.ts`.
- Modificati (asset UFO): `src/render/units.ts`, `src/main.ts`, `src/ui/combatWindow.ts`,
  `src/ui/style.css`, `.gitignore`.
- Release: v0.113.0 (commit #81, 21ae1b1).

## Intervallo di commit

Dal commit #80 (43fa435, fisica orbitale) al commit #82 (docs di chiusura):
fisica #80 (43fa435), asset UFO + release v0.113.0 #81 (21ae1b1).
