# Moltiplicatore economico per fascia di popolazione — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far sì che la popolazione di una città scali il suo gettito (HumT) e la sua produzione di risorse, tramite un moltiplicatore a 6 fasce dinamiche.

**Architecture:** Nuovo modulo puro `src/sim/population.ts` legge la tabella delle fasce da `CONFIG.economy.populationTiers` ed espone `populationTier(pop)` e `sizeMultiplier(pop)`. `economy.ts` moltiplica gettito e produzione per `sizeMultiplier(city.population)`. La UI mostra la fascia tradotta via i18n. Nessuna migrazione salvataggi (la fascia è derivata da `population`, già persistita).

**Tech Stack:** TypeScript, Vite, Vitest. Confine a tre strati: sim puro (zero import esterni) → render/ui.

## Global Constraints

- **i18n obbligatorio**: ogni stringa visibile passa da `src/i18n/` con traduzione in ENTRAMBI `it.ts` e `en.ts`. Mai testo hardcoded.
- **Sim puro**: `src/sim/**` non importa mai i18n/THREE/ui. `population.ts` può importare solo `./config`.
- **Schema fasce (schema B, àncora Megalopoli = 1×)**: soglie `0 / 1.000.000 / 4.000.000 / 10.000.000 / 18.000.000 / 26.000.001`; moltiplicatori `0,20 / 0,30 / 0,40 / 0,56 / 0,76 / 1,00`; chiavi `cittadina / citta / metropoli / megacitta / metacitta / megalopoli`.
- **Nessuna compensazione**: `taxRatePerDay` e `conversionRate` restano invariati.
- TDD, commit frequenti. Branch corrente: `feat/economia-popolazione`.

---

### Task 1: Modulo `population.ts` + tabella fasce in CONFIG

**Files:**
- Modify: `src/sim/config.ts` (blocco `economy`, dopo `starterKit`)
- Create: `src/sim/population.ts`
- Test: `src/sim/population.test.ts`

**Interfaces:**
- Consumes: `CONFIG.economy.populationTiers` (definito in questo task).
- Produces:
  - `type PopulationTierKey = 'cittadina' | 'citta' | 'metropoli' | 'megacitta' | 'metacitta' | 'megalopoli'`
  - `populationTier(population: number): PopulationTierKey`
  - `sizeMultiplier(population: number): number`

- [ ] **Step 1: Aggiungi la tabella fasce a CONFIG**

In `src/sim/config.ts`, dentro `economy`, subito dopo il blocco `starterKit: { ... },` (riga ~29) aggiungi:

```ts
    // Moltiplicatore economico per fascia di popolazione (vedi
    // docs/superpowers/specs/2026-06-18-bilancio-popolazione-design.md).
    // Dinamico: la fascia è calcolata dalla popolazione ATTUALE.
    // Schema B (àncora Megalopoli = 1×). minPopulation in ordine crescente;
    // la fascia è l'ultima con minPopulation <= popolazione.
    populationTiers: [
      { key: 'cittadina', minPopulation: 0, multiplier: 0.2 },
      { key: 'citta', minPopulation: 1_000_000, multiplier: 0.3 },
      { key: 'metropoli', minPopulation: 4_000_000, multiplier: 0.4 },
      { key: 'megacitta', minPopulation: 10_000_000, multiplier: 0.56 },
      { key: 'metacitta', minPopulation: 18_000_000, multiplier: 0.76 },
      { key: 'megalopoli', minPopulation: 26_000_001, multiplier: 1 },
    ],
```

(Il `26_000_001` fa sì che Seul, esattamente a 26.000.000, resti `metacitta`.)

- [ ] **Step 2: Scrivi il test che fallisce**

Crea `src/sim/population.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { populationTier, sizeMultiplier } from './population';

describe('fasce di popolazione', () => {
  it('mappa ogni popolazione alla fascia giusta sui confini', () => {
    expect(populationTier(999_999)).toBe('cittadina');
    expect(populationTier(1_000_000)).toBe('citta');
    expect(populationTier(3_999_999)).toBe('citta');
    expect(populationTier(4_000_000)).toBe('metropoli');
    expect(populationTier(9_999_999)).toBe('metropoli');
    expect(populationTier(10_000_000)).toBe('megacitta');
    expect(populationTier(17_999_999)).toBe('megacitta');
    expect(populationTier(18_000_000)).toBe('metacitta');
    expect(populationTier(26_000_000)).toBe('metacitta'); // Seul
    expect(populationTier(26_000_001)).toBe('megalopoli');
    expect(populationTier(37_000_000)).toBe('megalopoli'); // Tokyo
  });

  it('sizeMultiplier ritorna il moltiplicatore della fascia', () => {
    expect(sizeMultiplier(330_000)).toBe(0.2); // Suva
    expect(sizeMultiplier(2_800_000)).toBe(0.3); // Vancouver
    expect(sizeMultiplier(4_300_000)).toBe(0.4); // Roma
    expect(sizeMultiplier(12_300_000)).toBe(0.56); // Parigi
    expect(sizeMultiplier(19_500_000)).toBe(0.76); // New York
    expect(sizeMultiplier(37_000_000)).toBe(1); // Tokyo
  });

  it('la fascia non decresce al crescere della popolazione (monotonìa)', () => {
    const order = ['cittadina', 'citta', 'metropoli', 'megacitta', 'metacitta', 'megalopoli'];
    let last = -1;
    for (const pop of [0, 1e6, 4e6, 10e6, 18e6, 27e6]) {
      const idx = order.indexOf(populationTier(pop));
      expect(idx).toBeGreaterThan(last);
      last = idx;
    }
  });
});
```

- [ ] **Step 3: Esegui il test, deve fallire**

Run: `npx vitest run src/sim/population.test.ts`
Expected: FAIL — "Failed to resolve import './population'".

- [ ] **Step 4: Implementa il modulo**

Crea `src/sim/population.ts`:

```ts
// Fascia di popolazione di una città → moltiplicatore economico (gettito +
// produzione). Modulo PURO (vedi confine sim): importa solo CONFIG.
// La tabella delle fasce (soglie, moltiplicatori) vive in
// CONFIG.economy.populationTiers; qui solo la logica di selezione.
import { CONFIG } from './config';

export type PopulationTierKey = (typeof CONFIG.economy.populationTiers)[number]['key'];

// fascia = l'ultima voce (in ordine crescente) con minPopulation <= popolazione
function tierFor(population: number) {
  const tiers = CONFIG.economy.populationTiers;
  let result = tiers[0];
  for (const tier of tiers) {
    if (population >= tier.minPopulation) result = tier;
  }
  return result;
}

export function populationTier(population: number): PopulationTierKey {
  return tierFor(population).key;
}

export function sizeMultiplier(population: number): number {
  return tierFor(population).multiplier;
}
```

- [ ] **Step 5: Esegui i test, devono passare**

Run: `npx vitest run src/sim/population.test.ts`
Expected: PASS (3 test).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (nessun errore).

- [ ] **Step 7: Commit**

```bash
git add src/sim/config.ts src/sim/population.ts src/sim/population.test.ts
git commit -m "feat: fasce di popolazione e moltiplicatore economico (sim puro)"
```

---

### Task 2: Innesto del moltiplicatore in `economy.ts`

**Files:**
- Modify: `src/sim/economy.ts:26-59` (`cityIncomePerDay`, `cityProductionPerDay`, `dailyProductionByType`)
- Test: `src/sim/economy.test.ts` (aggiorna 3 test)

**Interfaces:**
- Consumes: `sizeMultiplier(population: number): number` da `./population` (Task 1).
- Produces: nessuna nuova firma; `cityIncomePerDay`/`cityProductionPerDay`/`dailyProductionByType` ora includono il fattore fascia.

- [ ] **Step 1: Aggiorna i test (devono fallire)**

In `src/sim/economy.test.ts`, aggiungi l'import in cima (dopo gli altri import):

```ts
import { sizeMultiplier } from './population';
```

Sostituisci il test `'gettito città = Σ(peso×amount) × popFactor × aliquota'` (righe ~25-37) con:

```ts
  it('gettito città = Σ(peso×amount) × popFactor × sizeMultiplier × aliquota', () => {
    const s = newGameWithHq(1, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const gdp = rome.resources.reduce(
      (sum, r) => sum + CONFIG.economy.resourceWeights[r.type] * r.amount,
      0,
    );
    const sm = sizeMultiplier(rome.population);
    expect(cityIncomePerDay(rome)).toBeCloseTo(gdp * sm * CONFIG.economy.taxRatePerDay);
    expect(dailyIncome(s)).toBe(Math.round(cityIncomePerDay(rome)));
    // dimezzare la popolazione dimezza il popFactor E può abbassare la fascia
    rome.population = rome.initialPopulation / 2;
    const sm2 = sizeMultiplier(rome.population);
    expect(cityIncomePerDay(rome)).toBeCloseTo(gdp * 0.5 * sm2 * CONFIG.economy.taxRatePerDay);
  });
```

Sostituisci il test `'produzione giornaliera = amount × tasso × popFactor, per tipo'` (righe ~49-56) con:

```ts
  it('produzione giornaliera = amount × tasso × popFactor × sizeMultiplier, per tipo', () => {
    const s = newGameWithHq(1, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const sm = sizeMultiplier(rome.population);
    const prod = dailyProductionByType(s);
    for (const r of rome.resources) {
      expect(prod[r.type]).toBeCloseTo(r.amount * CONFIG.economy.conversionRate * sm);
    }
  });
```

Sostituisci, nel test `'applyDailyEconomy accredita HumT e riempie il magazzino'` (righe ~71-83), il ciclo finale `for (const r of rome.resources) { ... }` con:

```ts
    const sm = sizeMultiplier(rome.population);
    for (const r of rome.resources) {
      expect(s.resources[r.type] - before[r.type]).toBeCloseTo(
        r.amount * CONFIG.economy.conversionRate * sm,
      );
    }
```

- [ ] **Step 2: Esegui i test, devono fallire**

Run: `npx vitest run src/sim/economy.test.ts`
Expected: FAIL (le asserzioni includono `sizeMultiplier` ma `economy.ts` non lo applica ancora).

- [ ] **Step 3: Applica il moltiplicatore in `economy.ts`**

Aggiungi l'import dopo gli import esistenti (sotto `import { greatCircleKm } from './geo';`):

```ts
import { sizeMultiplier } from './population';
```

Sostituisci `cityIncomePerDay` (righe ~26-30) con:

```ts
export function cityIncomePerDay(city: CityState): number {
  const e = CONFIG.economy;
  const gdp = city.resources.reduce((sum, r) => sum + e.resourceWeights[r.type] * r.amount, 0);
  return gdp * popFactor(city) * sizeMultiplier(city.population) * e.taxRatePerDay;
}
```

Sostituisci `cityProductionPerDay` (righe ~42-48) con:

```ts
export function cityProductionPerDay(city: CityState): Partial<Record<ResourceType, number>> {
  const out: Partial<Record<ResourceType, number>> = {};
  const sm = sizeMultiplier(city.population);
  for (const r of city.resources) {
    out[r.type] = r.amount * CONFIG.economy.conversionRate * popFactor(city) * sm;
  }
  return out;
}
```

Sostituisci `dailyProductionByType` (righe ~50-59) con:

```ts
export function dailyProductionByType(state: GameState): Record<ResourceType, number> {
  const total = emptyStockpile();
  for (const c of state.cities) {
    if (!isConnected(state, c) || underAbduction(state, c.id)) continue;
    const sm = sizeMultiplier(c.population);
    for (const r of c.resources) {
      total[r.type] += r.amount * CONFIG.economy.conversionRate * popFactor(c) * sm;
    }
  }
  return total;
}
```

- [ ] **Step 4: Esegui i test, devono passare**

Run: `npx vitest run src/sim/economy.test.ts`
Expected: PASS (7 test).

- [ ] **Step 5: Esegui l'intera suite sim**

Run: `npx vitest run`
Expected: PASS (tutti i test). Se qualche test in `tick.test.ts`/`save.test.ts` confronta valori economici assoluti, verifica che usi le funzioni di `economy.ts` (self-consistenti) e non numeri hardcoded; in tal caso aggiorna l'atteso ricalcolandolo con `sizeMultiplier`.

- [ ] **Step 6: Commit**

```bash
git add src/sim/economy.ts src/sim/economy.test.ts
git commit -m "feat: gettito e produzione scalano per fascia di popolazione"
```

---

### Task 3: Chiavi i18n `tier.*` (it + en)

**Files:**
- Modify: `src/i18n/it.ts` (dopo il blocco `res.*`)
- Modify: `src/i18n/en.ts` (stesso punto)
- Test: `src/i18n/i18n.test.ts` (nessuna modifica: verifica parità automaticamente)

**Interfaces:**
- Produces: chiavi `panel.tier`, `tier.cittadina`, `tier.citta`, `tier.metropoli`, `tier.megacitta`, `tier.metacitta`, `tier.megalopoli` in entrambi i dizionari.

- [ ] **Step 1: Aggiungi le chiavi in `it.ts`**

In `src/i18n/it.ts`, subito dopo `'res.tessuti': 'Tessuti',` (ultima riga del blocco risorse) aggiungi:

```ts

  // fasce di popolazione (chiave = PopulationTierKey in sim/population.ts)
  'panel.tier': 'Fascia:',
  'tier.cittadina': 'Cittadina',
  'tier.citta': 'Città',
  'tier.metropoli': 'Metropoli',
  'tier.megacitta': 'Megacittà',
  'tier.metacitta': 'Metacittà',
  'tier.megalopoli': 'Megalopoli',
```

- [ ] **Step 2: Aggiungi le stesse chiavi in `en.ts`**

In `src/i18n/en.ts`, nello stesso punto (dopo `'res.tessuti': ...`) aggiungi:

```ts

  // population size classes (key = PopulationTierKey in sim/population.ts)
  'panel.tier': 'Size class:',
  'tier.cittadina': 'Town',
  'tier.citta': 'City',
  'tier.metropoli': 'Metropolis',
  'tier.megacitta': 'Megacity',
  'tier.metacitta': 'Meta-city',
  'tier.megalopoli': 'Megalopolis',
```

- [ ] **Step 3: Esegui il test i18n, deve passare**

Run: `npx vitest run src/i18n/i18n.test.ts`
Expected: PASS — la parità chiavi it/en regge (nessuna chiave ha placeholder `{x}`, quindi anche il test placeholder passa).

- [ ] **Step 4: Commit**

```bash
git add src/i18n/it.ts src/i18n/en.ts
git commit -m "i18n: etichette delle fasce di popolazione (it+en)"
```

---

### Task 4: Badge fascia nel pannello Città

**Files:**
- Modify: `src/ui/format.ts` (nuovo helper `fmtMultiplier`)
- Modify: `src/ui/cityPanel.ts` (import + riga badge nell'header)

**Interfaces:**
- Consumes: `populationTier`, `sizeMultiplier` da `../sim/population`; `t` da `../i18n`; chiavi `panel.tier`/`tier.*` (Task 3).
- Produces: `fmtMultiplier(n: number): string` in `format.ts`.

- [ ] **Step 1: Aggiungi `fmtMultiplier` a `format.ts`**

In `src/ui/format.ts`, dopo `fmtInt` (riga ~6) aggiungi:

```ts
export function fmtMultiplier(n: number): string {
  return n.toLocaleString(getLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
```

(`getLocale` è già importato in cima al file.)

- [ ] **Step 2: Importa le funzioni in `cityPanel.ts`**

In `src/ui/cityPanel.ts`, aggiorna i due import:

```ts
import { populationTier, sizeMultiplier } from '../sim/population';
import { fmtInt, fmtMultiplier } from './format';
```

(Il secondo sostituisce l'attuale `import { fmtInt } from './format';`.)

- [ ] **Step 3: Aggiungi la riga fascia all'header**

In `createCityPanel` → `update`, sostituisci il blocco `const header = ...` (righe ~60-63) con:

```ts
      const tierKey = populationTier(city.population);
      const header = `
        <h2>${cityName(city.id, city.name)} <small>(${countryName(city.country)})</small></h2>
        <p>${t('panel.population')} <strong>${fmtInt(city.population)}</strong></p>
        <p>${t('panel.tier')} <strong>${t(`tier.${tierKey}`)}</strong> <small>(×${fmtMultiplier(sizeMultiplier(city.population))})</small></p>
      `;
```

L'header è usato sia in fase di fondazione sia a regime, quindi il badge compare in entrambi. Il pannello si ridisegna a ogni `update()`, perciò segue il cambio lingua senza hook aggiuntivi.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (Verifica che `t(\`tier.${tierKey}\`)` compili: `t` accetta chiavi via template literal come già fa per `res.${r.type}`.)

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build completata senza errori.

- [ ] **Step 6: Verifica manuale**

Run: `npm run dev`, apri http://localhost:5173/, inizia una nuova partita, seleziona una città grande (es. Tokyo) e una piccola (es. Reykjavik): l'header mostra "Fascia: Megalopoli (×1,00)" e "Fascia: Cittadina (×0,20)". Cambia lingua dall'ingranaggio: l'etichetta diventa "Size class: …".

- [ ] **Step 7: Commit**

```bash
git add src/ui/format.ts src/ui/cityPanel.ts
git commit -m "feat: badge fascia di popolazione nel pannello città"
```

---

## Fuori scope (da spec)

- **Badge fascia nel pannello Bilancio**: il pannello oggi mostra solo aggregati, non una lista per-città. Aggiungere righe per-città è una feature a sé (YAGNI) → rimandata; lo spec la marcava "opzionale".
- **Meccanica di crescita della popolazione**: spec separata. Le fasce dinamiche sono già pronte a reagirvi.
- **Ribilanciamento col playtest**: i valori in `CONFIG.economy.populationTiers` sono la leva di taratura.

## Self-Review

- **Copertura spec**: fasce/soglie/moltiplicatori → Task 1; gettito+produzione → Task 2; i18n tier.* → Task 3; badge UI → Task 4; nessuna migrazione salvataggi → garantito (fascia derivata da `population`, nessun campo nuovo persistito); test `population.test.ts` + aggiornamento `economy.test.ts` → Task 1/2. Pannello Bilancio esplicitamente fuori scope.
- **Placeholder**: nessuno; ogni step ha codice/comando completo.
- **Coerenza tipi**: `PopulationTierKey` derivato da `CONFIG.economy.populationTiers`; `populationTier`/`sizeMultiplier` usati con la stessa firma in economy.ts, cityPanel.ts e nei test; `fmtMultiplier` definito in Task 4 prima dell'uso.
