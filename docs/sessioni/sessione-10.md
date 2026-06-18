# Sessione 10 — 2026-06-18

Punto di partenza: commit #86 (eedd63b), v0.113.2.
Fine sessione: commit #93 (docs di chiusura), v0.114.0 rilasciata e taggata (al commit #92, ba426c9).

## Resoconto

1. **Ricerca: produzione reale delle 10 risorse (deep-research + sintesi)** — su richiesta
   dell'utente, ricerca web sulla geografia economica reale per ancorare i valori delle risorse.
   Metodo concordato: NON dato città-per-città, ma poche ricerche MIRATE per risorsa (hub mondiali:
   GFCI per finanza, USGS/MINING.COM per metalli, EIA/Enerdata per fossili/gas, world-steel/cement,
   semiconduttori, export tessile, produzione auto, ecc.) + verifiche sulle città ambigue. Output:
   report **`Economy-model/ranking-risorse-reali.md`** (tabella 50×10 0-100, criterio+fonti per
   risorsa, effetto post-apocalisse come moltiplicatori, città stimate senza fonte solida).

2. **Modello risorse DENSO (commit #87)** — su decisione dell'utente: ogni città passa da 2-5 a
   **tutte e 10 le macro-risorse**, con i valori del ranking. `gdp_post_apoc_humt` ricalcolato su
   10 termini (totale ~137.800 HumT, range 1.190-3.941, top Shanghai/Mosca/Pechino). Invariante
   `data.test.ts` aggiornata ("10 tipi per città"); `ECONOMIA.md` e `contesto-progetto.md` allineati.
   144 test verdi, tsc pulito.

3. **Economia per fascia di popolazione — brainstorming + spec + piano** — la popolazione assoluta
   non influiva sull'economia (popFactor parte da 1,0). Brainstorming iterativo sulle fasce e i
   moltiplicatori (vedi Decisioni). Spec `docs/superpowers/specs/2026-06-18-bilancio-popolazione-design.md`
   (commit #88) e piano TDD `docs/superpowers/plans/2026-06-18-bilancio-popolazione.md`.

4. **Implementazione (commit #89–#92, subagent-driven TDD)** — un implementer fresco per task +
   review spec/qualità per task + review finale whole-branch ("ready to merge"):
   - #89 `src/sim/population.ts` (modulo puro) + `CONFIG.economy.populationTiers` + test confini/monotonìa.
   - #90 innesto `sizeMultiplier(city.population)` in `economy.ts` (gettito + produzione); aggiornati
     i test economy (il test "popolazione dimezzata" ora tiene conto del salto di fascia dinamico).
   - #91 chiavi i18n `tier.*` + `panel.tier` (it+en).
   - #92 helper `fmtMultiplier` + badge fascia (nome + moltiplicatore) nell'header del pannello Città.

5. **Merge + release v0.114.0 + chiusura (commit #92 tag, #93 docs)** — fast-forward su `main`,
   push su `origin/main`, `releases.txt` aggiornato (delta +53.985 byte), tag annotato v0.114.0.

## Decisioni

- **Modello denso** invece di sparse: ogni città ha tutte e 10 le risorse (il profilo dei valori
  fa la specializzazione, non la presenza/assenza). Mantenuta la formula `gdp = Σ peso×amount`.
- **Fasce di popolazione** (brainstorming): 6 fasce **dinamiche** (dalla popolazione attuale, così
  una città sale crescendo e scende se svuotata — calo doppiamente amplificato, accettato). Nomi
  da classificazione demografica ONU: Cittadina / Città / Metropoli / Megacittà / Metacittà /
  Megalopoli. Soglie `1 / 4 / 10 / 18 / 26 M` (26.000.001 tiene Seul in Metacittà). Distribuzione
  3/5/14/14/10/4.
- **Schema B (àncora Megalopoli = 1×)**: moltiplicatori `0,20 / 0,30 / 0,40 / 0,56 / 0,76 / 1,00`
  (stessi rapporti dello schema "àncora Metropoli", ×0,4). **Nessuna compensazione** di
  `taxRatePerDay`/`conversionRate` ⇒ economia volutamente al ~40% dei volumi precedenti.
- Il moltiplicatore scala **sia** gettito **sia** produzione. Nessuna migrazione salvataggi
  (fascia derivata da `population`, già persistita). Badge fascia solo nel pannello Città
  (Bilancio fuori scope: niente lista per-città). Crescita popolazione = spec futura.

## File modificati

- Dati/economia: `src/data/cities.json` (10 risorse/città, gdp ricalcolato), `src/sim/data.test.ts`,
  `Economy-model/ECONOMIA.md`, `Economy-model/ranking-risorse-reali.md` (nuovo).
- Feature popolazione: `src/sim/population.ts` (nuovo), `src/sim/population.test.ts` (nuovo),
  `src/sim/config.ts` (populationTiers), `src/sim/economy.ts`, `src/sim/economy.test.ts`,
  `src/i18n/it.ts`, `src/i18n/en.ts`, `src/ui/cityPanel.ts`, `src/ui/format.ts`.
- Doc/process: `docs/superpowers/specs/2026-06-18-bilancio-popolazione-design.md` (nuovo),
  `docs/superpowers/plans/2026-06-18-bilancio-popolazione.md` (nuovo).
- Chiusura: `docs/sessioni/sessione-10.md` (nuovo), `docs/sessioni/INDICE.md`,
  `.claude/contesto-progetto.md`, `lista aggiornamenti/releases.txt` (locale, gitignored).

## Prossimi passi / note

- **Playtest economia**: con lo schema B senza compensazione l'economia gira al ~40%; tarare
  `CONFIG.economy.populationTiers` (e tasse/conversione se servono volumi maggiori).
- Minor deferiti (dalle review): guardia array vuoto in `population.ts` (difensiva), test esplicito
  `populationTier(0)`, test per `fmtMultiplier`/`cityProductionPerDay` (no DOM test surface).
- Salvataggi vecchi restano validi ma mantengono il modello sparse: per vedere le 10 risorse +
  le fasce serve una **nuova partita**.

## Intervallo commit

commit #87 (70e02bc) → commit #93 (docs di chiusura). Tag v0.114.0 al commit #92 (ba426c9).
