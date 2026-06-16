# Sessione 08 — 2026-06-16

Punto di partenza: commit #82 (e9806f4), v0.113.0.
Fine sessione: commit #84 (docs di chiusura), v0.113.1 rilasciata e taggata (al commit #83, 2008873).

## Resoconto

1. **Albero della Ricerca — brainstorming + anteprima struttura (commit #83)** — brainstorming
   con companion visivo (mockup nel browser) per fissare il modello: progressione **a tempo**,
   velocità di ricerca dalla **produzione di _tecnologia_** + (futuri) laboratori, forma **DAG
   libero** con prerequisiti arbitrari + coordinate manuali, 6 rami totali sviluppati a tappe,
   una ricerca attiva alla volta, effetti dichiarativi → modificatori derivati. Documento di
   riferimento versionato in **`docs/research-model.md`**. Su richiesta dell'utente si è
   implementata **solo la struttura** (le finestre verranno riviste): nuovo `src/sim/researchTree.ts`
   (nodi come **dati** puri: 3 rami / 8 nodi con prereq, coordinate, costo/punti/effetto non ancora
   consumati) + `src/ui/researchPanel.ts` (modale che disegna il **DAG in SVG**, sola lettura,
   agganciata al pulsante Ricerca). Test d'integrità (`researchTree.test.ts`: id unici, prereq
   esistenti, **aciclicità**, tier coerenti, parità chiavi i18n).
2. **Rifiniture rendering UFO (commit #83)** — su feedback dell'utente: (a) in rapimento la **base
   del raggio** traente è ancorata appena sopra il nome città (proiezione schermo città↔UFO,
   manopola `LABEL_CLEARANCE_PX`); (b) UFO **"atterrato" a 2/3** (`LANDED_SCALE`); (c) in **discesa**
   rimpicciolimento progressivo fino ai 2/3 (smoothstep) per senso prospettico. Poi correzione bug:
   avevo aggiunto una **rotazione in-piano** (puntare verso l'hover) calcolata in spazio schermo →
   ruotava con la camera. Rimossa: la discesa è radiale sulla verticale della città, un billboard
   verticale già "punta" al punto d'atterraggio → **orientamento fisso** (vista di profilo).
   Passato `tickFraction` anche a `ufoLayer.update`.
3. **Sistema di tracciamento dimensionale (commit #83)** — brainstorming a domande (semantica
   squadroni, forma readout, dati). Nuovo modulo **PURO** `src/sim/measure.ts`: conversioni
   `altitudeKm`/`speedKmH` (1 raggio = `EARTH_RADIUS_KM` = 6371; τ = 4320 s-gioco/tick) — la fisica
   è già in scala (velocità orbitale a 1.6 raggi ≈ 22.500 km/h, valore reale); helper UFO
   (quota da `altitudeAt`, velocità per differenza centrale di `positionAt`, **ETA** sommando le
   durate di fase fino al rapimento) e squadrone. **Picking**: UFO via handler DOM sull'anchor
   (anti-drag), squadroni via **THREE.Raycaster** sul canvas (`userData.squadronId`). **Etichetta
   flottante** `src/render/trackingLabel.ts` (CSS2D, una sola label sull'oggetto selezionato,
   occlusione dietro il globo, ricostruita ogni frame). **ETA continuo** (sottrae `tickFraction` →
   scorre in tempo reale). **Unità americane in inglese**: altitudine in **piedi**, velocità in
   **mph** (italiano resta km/km/h; ETA è tempo). Cambio gameplay: squadroni a **crociera 2250 km/h**
   (`speedKmPerDay` 24000→54000) e quota riportata **15 km** (`cruiseAltitudeKm`); aggiornato
   `squadrons.test.ts`. 142 test verdi.
4. **Release v0.113.1 + chiusura (commit #83 tag, #84 docs)** — semver concordato con l'utente,
   tag annotato, `releases.txt` aggiornato (voce in alto; file locale, cartella gitignored),
   push di `main` + tag, `/graphify --update` (contenuti non-code: research-model + doc di sessione).

## Decisioni

- **Albero della Ricerca**: progressione a tempo; velocità = produzione di _tecnologia_ + bonus
  laboratori (additivo, lab = incremento futuro); forma **DAG** con coordinate manuali (niente
  auto-layout); 6 rami a tappe; effetti dichiarativi → modificatori derivati (sim deterministica).
  Per ora **solo struttura**: dati + pannello di anteprima, funzionalità rimandate (le finestre
  verranno ridisegnate).
- **Squadroni a 15 km — solo nel readout, non nel rendering**: i modelli sono enormemente ingranditi
  (un caccia ≈ 223 km, `FIGHTER_LENGTH = 0.035` raggi). Niente compenetrazione col globo (modelli
  piatti tangenti restano fuori dalla sfera), MA a 15 km reali un modello 15× più grande della sua
  quota sembrerebbe steso a terra → la quota esagerata (pattuglia 51 km, crociera 287 km) resta;
  i 15 km/2250 km/h vivono solo nel tracciamento.
- **Tracciamento = etichetta flottante** (non pannello d'angolo), con **ETA in più** (richiesta
  utente). ETA in **tempo di gioco**, non distanza/velocità (la traiettoria UFO è curva: l'ETA è
  somma di tick residui delle fasi).
- **Unità per lingua**: inglese ⇒ americane (piedi per l'altitudine, mph per la velocità); l'ETA
  resta tempo (g/h in IT, d/h in EN). Le unità sono testo nelle stringhe i18n; il valore si converte.
- Versione **v0.113.1** (bump patch, scelto dall'utente: rifiniture/aggiunte; nessun cambio salvataggi).

## Gotcha scoperti

- **Rotazione billboard accoppiata alla camera**: orientare un overlay CSS2D verso un punto via
  proiezione schermo lo fa ruotare quando si orbita la camera. Per "vista di profilo" stabile
  serve orientamento **fisso** (la discesa radiale rende il billboard verticale già corretto).
- **ETA a scatti**: basata su `ticksRemaining` intero resta ferma tra i tick (72 s reali a 1x) e
  salta. Va resa **continua** sottraendo `tickFraction` (l'etichetta si ricostruisce ogni frame).
- **Quota esagerata = compensazione della dimensione esagerata** dei modelli, non un bug: abbassarla
  a valori reali romperebbe la leggibilità (caccia "stesi a terra").
- **render → ui è un'inversione di livello**: `trackingLabel` (render) deve formattare con solo
  i18n (come `floatingText`), non importare `ui/format` → conversioni/formattazione locali.
- **Chiavi i18n con HTML/unità**: il suffisso unità (km/mi/ft/mph) sta nella stringa i18n, il
  valore numerico si converte a parte; i placeholder `{km}`/`{kmh}` restano uguali tra it/en
  (test di parità).

## File modificati (principali)

- Nuovi: `src/sim/researchTree.ts(+test)`, `src/ui/researchPanel.ts`, `docs/research-model.md`,
  `src/sim/measure.ts(+test)`, `src/render/trackingLabel.ts`.
- Modificati (ricerca/tracciamento/UFO): `src/render/ufoLayer.ts`, `src/render/units.ts`,
  `src/sim/config.ts`, `src/sim/squadrons.test.ts`, `src/main.ts`, `src/i18n/{it,en}.ts`,
  `src/ui/style.css`, `index.html`.
- Release: v0.113.1 (commit #83, 2008873).

## Intervallo di commit

Dal commit #83 (2008873, feature: ricerca + UFO + tracciamento, tag v0.113.1) al commit #84
(docs di chiusura).
