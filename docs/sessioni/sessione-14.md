# Sessione 14 — 2026-06-20

Punto di partenza: commit #106 (0617ec8), v0.116.1.
Fine sessione: commit #109 (docs di chiusura), v0.120.0 rilasciata e taggata (al merge #108, 4b0f9d9).

## Resoconto

1. **HUD: valuta e velocità.** Etichetta valuta da `Ħ {n}` (il glifo Ħ rendeva come "H" in Michroma) a
   **`🪙 HumT {n}`**. Velocità di avanzamento ridisegnate: **1x / 5x / 25x / 100x** + tasto salto `≫`
   (1000x), `GameSpeed = 0|1|5|25|100|1000`.

2. **Rapimento in TEMPO REALE (1 persona alla volta).** La sim prelevava 15 persone a tick; ora un
   motore real-time **`render/abductionEngine.ts`** (orologio in minuti-gioco) preleva **1 alla volta**
   alla cadenza corretta (derivata da `abductionPerDay`: 1 ogni 4,8 min-gioco) via nuovo comando puro
   **`cmdAbduct`**; a capienza/città esaurita fa partire la fuga. Rimosso il prelievo dal tick.

3. **Fisica orbitale — avvicinamento e fuga (`sim/orbit.ts`).** L'avvicinamento ora **accelera entrando**
   (caduta gravitazionale, velocità radiale che cresce verso la Terra) con **capture-burn** nell'ultima
   frazione per inserirsi tangente all'orbita; la **fuga parte da ferma e accelera** salendo (ease-in,
   non più specchio della discesa che rallentava in cima). Spawn ad **≥10.000 km/h** dallo spazio profondo
   (`visualStartDistance` 8→160). Inverso del profilo radiale per bisezione (lunarCrossTick).

4. **Fix "teletrasporto" di fuga e trasferimento.** Le fasi avviate a metà tick (fuga da `cmdAbduct`,
   trasferimento squadrone su rotte brevi) partivano già a metà arco: introdotto
   **`UfoState.phaseStartFraction`** e **`TransferState.startFraction`** (frazione di tick d'avvio,
   sottratta dal render in `units.phaseProgress`/`measure.progressOf`, denominatore `total − startFraction`).
   Lo squadrone ora decolla dalla **targhetta della città**.

5. **Combattimento.** (a) **Fix fuoco caccia→UFO sul globo durante il rapimento**: `ufoBodyRect` torna
   `null` in fase `abducting` (per il reticolo di selezione) ed era usato anche come bersaglio del minigun →
   nuovo **`ufoCombatRect`** (senza la guardia) per mira/bersaglio. (b) **Danno torretta plasma 15→8**.
   (c) **Gittate armi**: `WeaponModule.rangeKm` (plasma e minigun **50 km**), con gating del fuoco nel
   motore e dell'animazione (`ufoLayer`/`squadronWeapons`); l'UFO scende **vicino alla città in rapimento**
   (`surfaceRadius` 1.02→1.004 ≈ 25 km) così il caccia (15 km) lo raggiunge entro i 50 km;
   `measure.ufoSquadronDistanceKm` come distanza.

6. **Audio.** Musica di sottofondo (**`Assets/Audio/Themes/Signal From Vega.mp3`**) in loop dallo start
   screen e in partita (`ui/music.ts`, autoplay sbloccato al gesto di fine intro, retry al primo input);
   **cursore volume 0–100%** in Impostazioni (pref `musicVolume`, default 50%). Font **Quantico** aggiunto
   (`@fontsource/quantico`).

7. **Economia "Potenziale 1000 / 30 giorni".** Riformulazione: **potenziale città = Σ amount** (10 risorse
   0–100, max **1000**) = produzione su **30 giorni**, accreditata **1/30 al giorno** (`cycleDays=30`,
   rimosso `conversionRate`); **gettito sulla somma NON pesata** (`cityPotential`) × popFactor × sizeMult ×
   0,09 / 30 (fasce mantenute, 1000 = tetto megalopoli); **HumT accumulato a frazioni** (`dailyIncome` non
   più arrotondato, altrimenti < 1/g → 0). Pannello **Città**: ogni risorsa in **quota % sul totale**
   (`amount/Σamount`, somma 100%) + **Potenziale x/1000** in testa; il **delta produzione resta al giorno**
   in Città e Bilancio (su richiesta). PDF di anteprima generato per validare i numeri (Roma/Tokyo/Reykjavik
   + simulazione di rete). I pesi risorsa non incidono più sull'economia viva (solo ordinamento + lore).

8. **Start screen.** Sfondo **artwork del titolo** (`Earth Defense Title.jpg`, convertito da PNG 2,1 MB →
   JPEG 229 KB), **finestra semitrasparente** (blur), titolo "EARTH DEFENSE" in **Quantico verde con glow**,
   **versione del gioco** sotto il titolo (letta da `package.json`), **pulsanti Impostazioni ed Esci**
   impilati (rimosso l'ingranaggio; Esci = `window.close()` + hint). `package.json.version` allineato alla
   release (0.120.0) e **bump aggiunto al workflow di rilascio** (contesto + memoria).

9. **Verifica & release.** `tsc` + **164 test** verdi, `vite build` ok a ogni passo. Merge `--no-ff` su
   `main`, tag annotato **v0.120.0**, push su `origin/main`.

## Decisioni

- **Rapimento e gettito real-time / a frazioni, non a tick.** Coerente con il combattimento (già real-time
  da v0.116): il tick è troppo grossolano per "1 alla volta"; l'HumT si accumula come le risorse (float,
  UI col floor).
- **Fasce dimensione mantenute** nell'economia: 1000 è il **massimo** (megalopoli piena), le città minori
  scalano. **Anche il gettito** ribasato sul potenziale non pesato (scelta utente).
- **Produzione su 30 giorni** (÷30): il magazzino non esplode (rete esempio 774/30g invece di 23.220/30g).
  Il **delta a schermo resta al giorno** (richiesta utente).
- **`taxRate` lasciato a 0,09**, da ritarare a playtest (il gettito scende, è la leva principale).
- **Spawn lontano (160 raggi)** per avere ≥10.000 km/h visibili: l'UFO è un puntino che entra veloce
  (alternativa scartata: readout fisico con render compresso).
- **PNG del titolo eliminato** (2,1 MB) a favore del JPEG; sfondo **senza velo** (l'immagine piena, su
  richiesta).

## File modificati

- Sim: `sim/orbit.ts`, `sim/economy.ts`, `sim/config.ts`, `sim/commands.ts` (+`cmdAbduct`),
  `sim/ufos.ts` (+`startEscape`/`phaseStartFraction`), `sim/state.ts`, `sim/weapons.ts` (+`rangeKm`),
  `sim/measure.ts` (+`ufoSquadronDistanceKm`/denominatore).
- Render: `render/abductionEngine.ts` (nuovo), `render/combatEngine.ts` (gittate), `render/combatFx.ts`,
  `render/squadronWeapons.ts`, `render/ufoLayer.ts` (+`ufoCombatRect`), `render/units.ts`.
- UI: `ui/music.ts` (nuovo), `ui/settings.ts` (volume), `ui/prefs.ts` (`musicVolume`),
  `ui/cityPanel.ts` (quota %/potenziale), `ui/balancePanel.ts`, `ui/format.ts` (`fmtDecimal1`),
  `ui/hud.ts` (velocità), `ui/style.css` (start screen, Quantico, glow), `main.ts` (musica, font,
  versione, start screen, ≫/velocità).
- i18n: `i18n/it.ts` + `i18n/en.ts` (`hud.humt`, `settings.musicVolume`, `panel.resourcePct`,
  `panel.cityPotential`, `start.exit`/`start.exitHint`).
- Asset: `Assets/Audio/Themes/Signal From Vega.mp3` (nuovo), `Assets/Intro/Earth Defense Title.jpg`
  (nuovo, PNG eliminato).
- Config/deps: `package.json` (`version` 0.120.0, `@fontsource/quantico`), `.gitignore` (PDF review).
- Test: `render/{abductionEngine,combatEngine}.test.ts`, `sim/{orbit,measure,economy,commands,events,
  tick,ufos,weapons,squadrons,combat}.test.ts`.
- Chiusura: `docs/sessioni/sessione-14.md` (nuovo), `docs/sessioni/INDICE.md`,
  `.claude/contesto-progetto.md`, `lista aggiornamenti/releases.txt` (locale, gitignored).

## Prossimi passi / note

- **Bilanciamento economia a playtest**: `taxRate` (gettito ora più basso col potenziale 1000), eventuale
  ritocco se l'HumT è troppo scarso; i costi (squadroni/ambasciate) restano in HumT.
- **Combattimento**: `range` ora c'è; restano accuratezza/miss veri sulla hitbox e bilanciamento
  HP/danno/cadenza (minigun danno 1). Playtest visivo del globo (gittate, fuoco in rapimento).
- **Design-system da risincronizzare** (flag `design-system/.push_pending`): i commit di sessione hanno
  cambiato UI/asset → rigenerare le card e ripushare su Claude Design.
- **Start screen**: titolo ancora maiuscolo "EARTH DEFENSE"; eventuale rifinitura posizione/opacità.
- `Esci`: nel browser `window.close()` è spesso bloccato; funziona in un'eventuale build desktop.

## Intervallo commit

commit #107 (fe21837, feat) → commit #108 (4b0f9d9, merge). Tag **v0.120.0** al merge #108.
Commit #109 = docs di chiusura sessione.
