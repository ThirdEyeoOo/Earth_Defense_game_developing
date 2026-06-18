# Design — Moltiplicatore economico per fascia di popolazione

Data: 2026-06-18 · Stato: approvato in brainstorming, da revisionare

## Problema

Nel modello attuale la **popolazione assoluta di una città non influisce sull'economia**.
La formula usa solo `popFactor = popolazione / popolazioneIniziale`, che parte da **1,0
per tutte le città** e scende solo quando gli alieni rapiscono persone. Conseguenza: a
parità di `amount` delle risorse, Suva (~330k ab.) e Tokyo (~37M ab.) **producono e
incassano identico**. La popolazione assoluta serve oggi solo a pesare i bersagli UFO
(`waves.ts`).

Obiettivo: introdurre un **moltiplicatore per fascia di popolazione** che scali
**gettito (HumT) e produzione (risorse)**, così le città grandi pesano di più.

## Decisioni di design (dal brainstorming)

1. **Cosa scala**: sia il gettito sia la produzione di risorse.
2. **Struttura**: 6 fasce con nome (non curva continua).
3. **Aggressività**: moderata (forbice ~5× tra la fascia più piccola e la più grande).
4. **Fasce dinamiche**: calcolate dalla popolazione **attuale** (non quella iniziale).
   Una città cresce/scende di fascia al variare della popolazione. `popFactor` e fascia
   scalano entrambi con la popolazione corrente → calo doppiamente amplificato quando una
   città viene svuotata (accettato esplicitamente).
5. **Àncora — schema B**: il riferimento 1,0× è la **Megalopoli** (fascia massima); tutte
   le altre sono frazioni. Mantiene gli stessi rapporti dello schema "àncora Metropoli"
   ma scala l'intera economia a ~40%.
6. **Nessuna compensazione**: `taxRatePerDay` e `conversionRate` restano invariati →
   economia volutamente più lenta (~40% dei volumi precedenti), da rivedere col playtest.
7. **Nomi (standard demografico ONU)**: megacittà = >10M, metacittà = >20M.

## Le 6 fasce

| Fascia | Popolazione | Moltiplicatore | Chiave i18n | EN |
|---|---|---:|---|---|
| Cittadina | < 1 M | 0,20× | `tier.cittadina` | Town |
| Città | 1–4 M | 0,30× | `tier.citta` | City |
| Metropoli | 4–10 M | 0,40× | `tier.metropoli` | Metropolis |
| Megacittà | 10–18 M | 0,56× | `tier.megacitta` | Megacity |
| Metacittà | 18–26 M | 0,76× | `tier.metacitta` | Meta-city |
| Megalopoli | > 26 M | 1,00× | `tier.megalopoli` | Megalopolis |

Soglie (minPopulation) in interi: `0 / 1_000_000 / 4_000_000 / 10_000_000 / 18_000_000 /
26_000_001`. La fascia è "la più alta la cui `minPopulation ≤ pop`". Il `+1` su Megalopoli
fa sì che una città esattamente a 26.000.000 (Seul) resti **Metacittà**; il confine cade
comunque nel vuoto demografico tra Seul (26,0 M) e Shanghai (30,5 M), quindi è robusto.

I rapporti tra fasce sono identici allo schema "àncora Metropoli" `0,5/0,75/1,0/1,4/1,9/2,5`
(ogni valore × 0,4).

### Distribuzione attuale delle 50 città (per popolazione iniziale; le fasce sono dinamiche)

- **Megalopoli (4)**: Tokyo, Delhi, Giacarta, Shanghai.
- **Metacittà (10)**: Seul, Dhaka, San Paolo, Il Cairo, Pechino, Città del Messico, Mumbai,
  New York, Osaka, Karachi.
- **Megacittà (14)**: Bangkok, Mosca, Kinshasa, Lagos, Istanbul, Teheran, Buenos Aires,
  Manila, Londra, Ho Chi Minh, Los Angeles, Parigi, Bogotà, Lima.
- **Metropoli (14)**: Baghdad, Chicago, Riyad, Santiago, Madrid, Toronto, Johannesburg,
  Berlino, Singapore, Nairobi, Sydney, Melbourne, Roma, Casablanca.
- **Città (5)**: Vancouver, Antananarivo, Perth, Auckland, Honolulu.
- **Cittadina (3)**: Anchorage, Suva, Reykjavik.

Totale 3 / 5 / 14 / 14 / 10 / 4 = 50.

## Architettura

### Nuovo modulo puro `src/sim/population.ts`

Coerente con `resources.ts` / `measure.ts`: zero import esterni alla sim, niente
THREE/i18n. Espone:
- `type PopulationTierKey = 'cittadina' | 'citta' | 'metropoli' | 'megacitta' | 'metacitta' | 'megalopoli'`.
- `populationTier(pop: number): PopulationTierKey` — dinamica, dalla popolazione attuale.
- `sizeMultiplier(pop: number): number` — moltiplicatore della fascia.

I dati (soglie + moltiplicatori + chiave) vivono in **`CONFIG.economy.populationTiers`**
(unica leva di taratura): array ordinato `{ key, minPopulation, multiplier }`. Il modulo
`population.ts` legge da `CONFIG`. Nessun ciclo di import: `population → config`,
`economy → population + config` (config non importa né population né economy).

### Integrazione in `src/sim/economy.ts`

Un solo fattore in più, calcolato dalla popolazione corrente:

```
const sm = sizeMultiplier(city.population);
cityIncomePerDay        = gdp    × popFactor(city) × sm × taxRatePerDay
cityProductionPerDay[t] = amount × conversionRate  × popFactor(city) × sm
```

Punti di modifica: `cityIncomePerDay` (riga ~28), `cityProductionPerDay` (riga ~45),
`dailyProductionByType` (riga ~55). `dailyIncome`/`applyDailyEconomy` non cambiano (usano
le funzioni sopra).

### UI (i18n obbligatorio)

- Il sim espone solo la **chiave** della fascia (codice); la UI traduce con `t('tier.<key>')`.
- Chiavi `tier.*` in **entrambi** `src/i18n/it.ts` e `src/i18n/en.ts`.
- **Pannello Città** (`src/ui/cityPanel.ts`): badge fascia + moltiplicatore, es.
  "Metropoli · 0,40×". Si aggiorna a cambio lingua col pattern esistente.
- **Pannello Bilancio** (`src/ui/balancePanel.ts`): mostra la fascia accanto a ogni città
  collegata (opzionale ma utile per leggere il gettito).

### Salvataggi

Nessuna migrazione: la fascia è **derivata** da `population` (già persistita). Funziona
identico con salvataggi vecchi e nuovi. Nessun bump di versione.

## Test

- **`src/sim/population.test.ts`** (nuovo): casi di confine e monotonìa —
  999.999→cittadina, 1.000.000→città, 3.999.999→città, 4.000.000→metropoli,
  10.000.000→megacittà, 18.000.000→metacittà, 26.000.000→metacittà (Seul),
  26.000.001/30.500.000→megalopoli; `sizeMultiplier` ritorna i valori attesi; la fascia
  cresce in modo monotòno con la popolazione.
- **`src/sim/economy.test.ts`** (aggiorna): i test usano Roma (4,3 M → Metropoli 0,40×),
  quindi le asserzioni che passano per `cityIncomePerDay`/`cityProductionPerDay` restano
  coerenti (calcolano l'atteso con le stesse funzioni). Aggiungere asserzioni esplicite:
  una città Megalopoli (Tokyo) ha `sm = 1,0`, una Cittadina (Suva) ha `sm = 0,20`, e il
  gettito scala di conseguenza.
- **`src/sim/data.test.ts`**: opzionale — asserire che ogni città mappa a una fascia nota.

## Fuori scope (spec future)

- **Meccanica di crescita della popolazione**: oggi la popolazione solo cala (rapimenti).
  Le fasce dinamiche sono già pronte a reagire alla crescita, ma il *motore* di crescita
  (natalità/immigrazione tra città collegate) è una spec a parte.
- **Ribilanciamento col playtest**: i moltiplicatori e l'economia al ~40% andranno tarati
  giocando; i valori sono in `CONFIG.economy` per facilità.
- **Effetto fascia su altri sistemi** (costo ambasciata, bersagli UFO, difese): non
  toccati in questa spec.
