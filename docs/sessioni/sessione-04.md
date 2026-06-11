# Sessione 04 — 2026-06-11

Punto di partenza: commit #58 (1494e0c), main pulito, v0.104.0.
Fine sessione: commit #61 (docs), v0.105.0 rilasciata e taggata.

## Resoconto

1. **Sequenza d'intro (v0.105.0)** — a ogni caricamento la pagina si apre su
   un overlay nero `#intro-screen` (z-25: sopra lo start screen, sotto le
   impostazioni) col logo `Assets/Intro/Logo_intro.svg` inlineato nel DOM.
   Timeline CSS: tre trattini dorati (occhio chiuso) → l'occhio si apre a
   ~2,1 s → scritte "Third Eye ◉ Studios" / "presents" / "a game by Daniele
   Bigoni" in dissolvenza scaglionata → pulsante next che pulsa da ~5,6 s.
   Click sulla freccia → `Intro_video.mp4` (16 MB) a tutto schermo con audio,
   saltabile con click o Esc; a fine/skip/errore si rivela lo start screen
   già costruito sotto. Nuovo modulo `src/ui/intro.ts` (factory `createIntro`
   come settings/bottomBar), wiring minimo in main.ts (`intro.refreshLabels()`
   nel callback lingua), chiave i18n `intro.skipHint` in entrambi i dizionari.
2. **Occhio interattivo** (iterazioni su richiesta) — blink automatico ogni
   4 s (ciclo infinito che replica lo stato a riposo nei keyframe); pupilla
   che segue il cursore (conversione px schermo → unità SVG via larghezza
   reale dell'anello, tetto a 4,5 unità, dal primo mousemove sostituisce
   l'orbita automatica); click sull'occhio lo chiude/riapre (rect invisibile
   `intro-eye-hit`, `!important` per vincere sulle animazioni di blink).
   Provata e annullata su richiesta la rotazione dell'intero occhio.
3. **Pulizia asset** — Logo_intro.svg riscritto: via `onclick="sendPrompt"`,
   `<title>`/`<desc>` e style gonfiati del tool di authoring; classi `intro-*`
   come hook (niente id: stripForInline li strippa); `intro.ts` ha la sua
   sanitizzazione difensiva (title/desc/on*) per future ri-esportazioni.
4. **Release v0.105.0** — branch feature/intro, merge --no-ff in main
   (ee015f0), tag, releases.txt aggiornato (+15,9 MB, quasi tutto il video).
5. **Knowledge graph** — /graphify --update post-merge: 514 nodi, 1013 archi,
   37 community (nuova community "Intro"); trascrizione video saltata
   (faster-whisper non installato: `pip install 'graphifyy[video]'` se servirà).

## Decisioni

- L'intro si vede a OGNI caricamento pagina (niente flag "già vista").
- Video saltabile (click/Esc) e logo con sequenza animata completa: scelte
  esplicite dell'utente tra le opzioni proposte.
- Esc salta solo la fase video; il logo avanza solo con la freccia.
- I testi dentro il logo SVG (brand/credits in inglese) NON passano da i18n:
  sono artwork, non stringhe UI. Unica chiave nuova: `intro.skipHint`.
- `onDone` di `createIntro` resta un no-op: hook futuro per partire con la
  musica di menu sullo stesso user gesture del click.
- Import `.mp4` via Vite (tipizzato da vite/client, emesso come asset >
  assetsInlineLimit, scaricato solo alla creazione del `<video>`).

## Gotcha scoperti

- Due animazioni CSS sulla stessa proprietà: l'ultima della lista vince per
  tutta la sua durata (fill backwards compreso) — il pulse va sui FIGLI del
  gruppo che fa il fade-in, e il ciclo di blink deve replicare lo stato a
  riposo nei propri keyframe.
- Il click che avvia il video bubbla fino al listener di skip su root appena
  registrato: serve `stopPropagation()` sul click della freccia.
- Dichiarazioni `!important` battono le animazioni CSS (unico modo per
  forzare uno stato sopra un'animazione in corso senza rimuoverla).
- `transform-box: fill-box` + `rotate() translateX()` = orbita attorno al
  centro originale di un elemento SVG; i px dei transform CSS su elementi
  SVG sono unità utente del viewBox, non pixel schermo.
- La freccia è cliccabile solo dopo `animationend` (filtrato per
  `animationName`): prima è invisibile ma riceverebbe click.

## File modificati (principali)

- Nuovi: `src/ui/intro.ts`, `Assets/Intro/Logo_intro.svg` (riscritto),
  `Assets/Intro/Intro_video.mp4`
- Modificati: `src/main.ts`, `src/ui/style.css` (sezione `/* intro */`),
  `index.html` (`#intro-screen`), `src/i18n/{it,en}.ts`
- Release: v0.105.0 (commit #60, ee015f0)

## Intervallo di commit

Dal commit #59 (88ebd81, feat intro su feature/intro) al commit #61 (docs di
chiusura): merge v0.105.0 #60 (ee015f0).
