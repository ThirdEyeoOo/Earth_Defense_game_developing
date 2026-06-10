# Sessione 01 — 2026-06-10

**Intervallo commit:** dal commit #1 (`9e410bd`) al commit #39 (chiusura sessione) — 39 commit.
Stato a fine sessione: tutto mergiato in `main`, release **v0.1.0**, **v0.101.0** e **v0.102.0** taggate.

## Cosa abbiamo fatto

1. **Brainstorming e design** (la sessione era ripartita dopo due crash): definito Earth Defense
   come gestionale di difesa planetaria nel browser. Spec approvata a sezioni e salvata in
   `docs/superpowers/specs/2026-06-10-earth-defense-design.md`.
2. **Piano di implementazione** (16 task TDD) in `docs/superpowers/plans/2026-06-10-earth-defense-mvp.md`,
   eseguito con sviluppo subagent-driven (implementatore + revisione spec + revisione qualità per task,
   più revisione finale d'insieme). → **v0.1.0** (merge `a237cc9`).
3. **Sistema "lista aggiornamenti"**: hook git (post-commit/merge/rewrite →
   `scripts/aggiorna-lista-commit.sh`) che rigenera `lista aggiornamenti/commits.txt` con dimensioni
   e delta per commit; `releases.txt` con recap e delta byte per release, aggiornato a ogni merge.
4. **Migliorie v0.101.0** (merge `9be2034`): etichette città, orologio nell'HUD, velocità 10x,
   moto fluido delle unità (frazione di tick passata al render), UFO orbitali (spazio profondo →
   decelerazione → 3 orbite → discesa), salvataggi v2 con migrazione, fix accumulatore del loop
   in unità di tick (eliminati i "teletrasporti" al cambio velocità).
5. **Restyle con asset SVG dell'utente** (branch `feature/restyle-unita`):
   - città come targhette cliccabili (niente più marker sferici, picking via DOM con guardia anti-drag);
   - squadroni = formazione a ^ di 3 F-22 dal file SVG, con animazioni (luci nav, strobo, boost, pattugliamento);
   - UFO = disco volante dal file SVG con luci rotanti, cupola, raggio traente;
   - profilo di volo (pattugliamento rasoterra a scala 0.5, decollo/crociera 1.045/atterraggio,
     atmosfera alzata a 1.05), UFO billboard a schermo con effetto distanza, HUD a larghezze stabili.

## Decisioni prese e perché

- **Architettura a tre strati** (sim pura deterministica / render / UI, comandi come unico canale):
  testabilità senza browser, salvataggi = stato serializzato, porta aperta a un futuro backend.
- **Tempo**: 1 min reale a 1x = 1 giorno di gioco, 20 tick/giorno; le velocità cambiano solo i
  tick/secondo, mai la logica. L'accumulatore del loop è in unità di tick (non ms) per evitare
  salti al cambio velocità.
- **UFO ingaggiabili solo dalla discesa in poi**: con ~2 giorni di preavviso orbitale, l'ingaggio
  in orbita avrebbe reso quasi invulnerabili le città difese; l'orbita è preavviso e spettacolo.
- **Perdita popolazione al momento dell'uscita di scena dell'UFO** (fuga o abbattimento): i rapiti
  a bordo non si recuperano; abbattere prima dell'atterraggio = zero perdite.
- **Evacuazione sempre permessa dalle città distrutte** (e targhette delle città morte ancora
  cliccabili): altrimenti gli squadroni resterebbero intrappolati per sempre.
- **SVG: perché niente animazioni SMIL/CSS nei file** — Three.js `SVGLoader` legge solo la
  geometria dei path e la converte in mesh WebGL statiche; gli SVG animati "girano" solo nel DOM
  del browser, e le unità sul globo non sono DOM. **Divisione dei compiti concordata**: l'utente
  fornisce SVG statici con le parti da animare su path separati e nominati (`id`), e le animazioni
  vengono realizzate in codice nel loop di render (più fluide e controllabili: stati di gioco come
  "in trasferimento" o "sta rapendo" pilotano le animazioni).
- **UFO billboard allineato allo schermo** (non ancorato alla verticale del globo): l'ancoraggio
  radiale degenerava in certe geometrie camera/UFO causando flip e distorsioni.
- **Nomi release scelti dall'utente** (schema v0.x.0 suo, es. v0.101.0); Claude propone, l'utente decide.
- **"Pausa-fantasma" dopo caricamento**: non era un bug — il salvataggio conserva la velocità,
  salvare in pausa fa ripartire in pausa. Tenuto comunque il fix dell'HUD a larghezze stabili
  (i pulsanti velocità non si spostano più sotto il mouse quando i testi cambiano).

## File creati/modificati (principali)

- `src/sim/*` — simulazione completa + 55 test Vitest (config, rng, geo, calendar, state, economy,
  squadrons, ufos, combat, waves, tick, commands, save).
- `src/render/*` — scene (CSS2DRenderer), globe (atmosfera 1.05), cities (targhette cliccabili),
  units (builder SVG condiviso + animazioni caccia/UFO), effects (traccianti, esplosioni).
- `src/ui/*` — hud (orologio, 10x, larghezze stabili), cityPanel, radar, endScreen, format, style.css.
- `src/main.ts` — loop (accumulatore in tick), picking DOM, autosave, start screen.
- `Assets/Umani/Velivoli/f22_raptor_animabile.svg`, `Assets/Alieni/UFO/ufo_disco_volante.svg` (dell'utente).
- `scripts/aggiorna-lista-commit.sh` + hook git locali; `lista aggiornamenti/` (generata, in .gitignore).
- `docs/superpowers/specs/...-design.md`, `docs/superpowers/plans/...-mvp.md`.

## Problemi aperti

- Merge di `feature/restyle-unita` da fare (playtest utente già ok).
- Gli hook git vivono in `.git/hooks/` (non versionati): da ricreare se il repo viene riclonato.
- Bilanciamento: 10 rapimenti su popolazioni in milioni sono simbolici — il danno arriverà
  con l'escalation (più UFO, nemici futuri).
- UX possibile: scelta esplicita "pausa al caricamento" con indicatore più visibile.

## Commit della sessione (#1–#36)

```
 #1 9e410bd Add Earth Defense MVP design doc
 #2 60515e3 Add Earth Defense MVP implementation plan
 #3 ef02e1e chore: scaffold Vite + TypeScript + Three.js + Vitest
 #4 b802342 feat(sim): config di bilanciamento e RNG deterministico
 #5 f8d11ea feat(sim): geografia sferica e calendario a tick
 #6 fe028f5 feat(sim): 50 città reali e stato di gioco
 #7 42f32c4 feat(sim): economia a tasse proporzionali alla popolazione
 #8 fb39fc6 feat(sim): squadroni con costi crescenti e trasferimenti a tempo
 #9 57a211b feat(sim): UFO rapitore con ciclo discesa/rapimento/fuga
#10 001cb48 feat(sim): combattimento per città con priorità bersagli
#11 d9ae02a feat(sim): direttore delle ondate con escalation e regioni
#12 950943d fix(sim): guardia su pool vuoto e test del fallback regionale delle ondate
#13 ac56732 feat(sim): tick orchestratore con esito e ordine fisso
#14 585a578 feat(sim): comandi validati per costruzione, rischieramento, velocità
#15 2f80bff test(sim): sancisce l'evacuazione degli squadroni da città distrutte
#16 8ed1f9b feat(sim): serializzazione versionata dei salvataggi
#17 f4ba019 feat(render): scena Three.js con globo, atmosfera e stelle
#18 c992973 feat(render): marker città, unità UFO/squadroni, traccianti ed esplosioni
#19 082fed3 fix(render): dispose di geometrie e materiali alla rimozione delle mesh
#20 97bb3ff feat(ui): HUD, pannello città, radar e schermata di fine
#21 6884f4e feat: wiring completo - loop, picking, autosave, start screen
#22 2bc8085 fix: città distrutte selezionabili per l'evacuazione e validazione forma dei salvataggi
#23 b02c458 chore: lista aggiornamenti auto-generata a ogni commit (hook git)
#24 75a5e8a chore: forza LF per gli script shell
#25 a237cc9 Merge branch 'feature/earth-defense-mvp' - Earth Defense MVP  [tag v0.1.0]
#26 5eb4195 feat(sim): UFO orbitali (avvicinamento/orbite/discesa), velocita 10x, orologio, salvataggi v2
#27 1a872e2 feat(render+ui): etichette citta, orologio HUD, 10x, moto fluido e traiettorie orbitali UFO
#28 72e7750 fix(render): rimozione delle etichette DOM quando il layer citta viene sostituito
#29 a1e726c fix: accumulatore del loop in unita di tick - niente salti al cambio velocita o in pausa
#30 9be2034 Merge branch 'feature/v0.2-migliorie'  [tag v0.101.0]
#31 f2c4a7e feat(render): citta come targhette cliccabili al posto dei marker sferici
#32 c542cdb feat(render): squadroni come formazione di 3 F-22 dall asset SVG, con animazioni
#33 abeaefb feat(render): UFO come disco volante animato dall asset SVG
#34 0472831 feat(render): profilo di volo squadroni e atmosfera a 1.05
#35 ee1bdfe fix(render): UFO billboard allineato allo schermo con effetto distanza; HUD a larghezze stabili
#36 0d61fd8 chore: rimossa strumentazione diagnostica della pausa-fantasma
#37 e5aeb8c docs: sistema di memoria persistente del progetto
#38 20aac59 Merge branch 'feature/restyle-unita'  [tag v0.102.0]
#39 (questo commit) docs: chiusura sessione 01 (diario, indice, releases, contesto)
```
