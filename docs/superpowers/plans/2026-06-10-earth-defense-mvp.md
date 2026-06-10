# Earth Defense MVP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** MVP giocabile di Earth Defense: globo 3D con 50 città reali, tempo a velocità variabile, UFO rapitori, squadroni di caccia rischierabili, economia a tasse, salvataggi, vittoria/sconfitta.

**Architecture:** Tre strati: simulazione deterministica a tick (TypeScript puro, `src/sim/`, zero import esterni), render Three.js (`src/render/`, sola lettura dello stato), schermate DOM (`src/ui/`, inviano comandi). `main.ts` esegue il loop e collega gli strati.

**Tech Stack:** TypeScript, Vite, Three.js, Vitest. Spec di riferimento: `docs/superpowers/specs/2026-06-10-earth-defense-design.md`.

---

## Mappa dei file

| File | Responsabilità |
|---|---|
| `src/sim/config.ts` | Tutti i numeri di bilanciamento e le schede statistiche |
| `src/sim/rng.ts` | RNG deterministico con seed nello stato |
| `src/sim/geo.ts` | lat/lon → vettore 3D, distanza ortodromica |
| `src/sim/calendar.ts` | tick → giorno/data |
| `src/sim/state.ts` | Tipi dello stato + `createNewGame()` |
| `src/sim/economy.ts` | Reddito giornaliero da tasse |
| `src/sim/squadrons.ts` | Costi, trasferimenti |
| `src/sim/ufos.ts` | Ciclo di vita UFO, rapimenti, rimozione |
| `src/sim/combat.ts` | Risoluzione combattimento per città |
| `src/sim/waves.ts` | Direttore delle ondate |
| `src/sim/commands.ts` | Comandi validati dalla UI |
| `src/sim/tick.ts` | Orchestratore del tick + esito |
| `src/sim/save.ts` | Serializzazione versionata |
| `src/data/cities.json` | Le 50 città |
| `src/render/scene.ts` | Renderer, camera, luci, controls |
| `src/render/globe.ts` | Sfera Terra, atmosfera, stelle |
| `src/render/cities.ts` | Marker città + picking |
| `src/render/units.ts` | Mesh UFO e squadroni, posizioni |
| `src/render/effects.ts` | Traccianti ed esplosioni (cosmetici) |
| `src/ui/format.ts` | Formattazione numeri/date it-IT |
| `src/ui/hud.ts` | Barra superiore |
| `src/ui/cityPanel.ts` | Pannello città |
| `src/ui/radar.ts` | Pannello radar |
| `src/ui/endScreen.ts` | Schermata di fine |
| `src/ui/style.css` | Stili |
| `src/main.ts` | Loop, wiring, autosave, start screen |

Ordine del tick (fissato, documentato in `tick.ts`): `tick++` → trasferimenti squadroni → spawn ondate → combattimento → progressione UFO → (a fine giornata) economia → check esito.

---

### Task 1: Scaffold del progetto

**Files:**
- Create: `package.json`, `tsconfig.json`, `index.html`, `.gitignore`, `src/main.ts` (stub), `src/ui/style.css` (stub)

- [ ] **Step 1: Crea `package.json`**

```json
{
  "name": "earth-defense",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "three": "^0.165.0"
  },
  "devDependencies": {
    "@types/three": "^0.165.0",
    "typescript": "^5.4.0",
    "vite": "^5.2.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: Crea `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Crea `.gitignore`**

```
node_modules/
dist/
```

- [ ] **Step 4: Crea `index.html`**

```html
<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Earth Defense</title>
  <link rel="stylesheet" href="/src/ui/style.css" />
</head>
<body>
  <div id="scene-container"></div>
  <header id="hud"></header>
  <div id="banner" class="hidden"></div>
  <aside id="city-panel" class="hidden"></aside>
  <aside id="radar-panel" class="hidden"></aside>
  <div id="end-screen" class="hidden"></div>
  <div id="start-screen"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 5: Crea gli stub `src/main.ts` e `src/ui/style.css`**

`src/main.ts`:
```ts
console.log('Earth Defense');
```

`src/ui/style.css`:
```css
body { margin: 0; background: #05080f; color: #cfe3ff; font-family: system-ui, sans-serif; }
.hidden { display: none !important; }
```

- [ ] **Step 6: Installa e verifica**

Run: `npm install` poi `npm run dev` (apri l'URL, console mostra "Earth Defense", poi ferma il server) e `npm test`
Expected: install senza errori; pagina vuota scura con log in console; vitest segnala "no test files found" (exit 1 è accettabile a questo punto).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json index.html .gitignore src
git commit -m "chore: scaffold Vite + TypeScript + Three.js + Vitest"
```

---

### Task 2: Config e RNG deterministico

**Files:**
- Create: `src/sim/config.ts`, `src/sim/rng.ts`
- Test: `src/sim/rng.test.ts`

- [ ] **Step 1: Crea `src/sim/config.ts`** (nessun test: soli dati)

```ts
export const CONFIG = {
  ticksPerDay: 20,
  startDateIso: '2026-01-01',
  startingCredits: 1000,
  taxPerMillionPerDay: 1,
  squadron: {
    attack: 6,
    shotsPerTick: 1,
    hp: 100,
    armor: 2,
    speedKmPerDay: 24000,
    baseCost: 500,
    costGrowth: 0.5,
  },
  ufoAbductor: {
    attack: 4,
    shotsPerTick: 1,
    hp: 60,
    armor: 1,
    speedKmPerDay: 8000,
    descentKm: 2000,
    abductionPerDay: 10,
    abductionDays: 1,
  },
  waves: {
    firstWaveDayMin: 10,
    firstWaveDayMax: 15,
    intervalBaseDays: 14,
    intervalShrinkPerWave: 1,
    intervalMinDays: 5,
    ufosBase: 1,
    ufosPerWave: 1,
    victoryWaves: 10,
  },
  saveVersion: 1,
} as const;
```

- [ ] **Step 2: Scrivi il test che fallisce** — `src/sim/rng.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { pickWeighted, rngNext, stateRand } from './rng';

describe('rng', () => {
  it('è deterministico: stesso seed, stessa sequenza', () => {
    const a1 = rngNext(42);
    const a2 = rngNext(42);
    expect(a1).toEqual(a2);
    expect(a1.value).toBeGreaterThanOrEqual(0);
    expect(a1.value).toBeLessThan(1);
    expect(a1.seed).not.toBe(42);
  });

  it('stateRand avanza il seed nello stato', () => {
    const s = { seed: 7 };
    const v1 = stateRand(s);
    const v2 = stateRand(s);
    expect(v1).not.toBe(v2);
  });

  it('pickWeighted sceglie sempre tra gli elementi e rispetta pesi estremi', () => {
    const s = { seed: 1 };
    const items = [{ w: 0 }, { w: 100 }];
    for (let i = 0; i < 20; i++) {
      expect(pickWeighted(s, items, x => x.w)).toBe(items[1]);
    }
  });
});
```

- [ ] **Step 3: Esegui il test e verifica che fallisca**

Run: `npx vitest run src/sim/rng.test.ts`
Expected: FAIL — "Cannot find module './rng'"

- [ ] **Step 4: Implementa `src/sim/rng.ts`** (mulberry32)

```ts
export function rngNext(seed: number): { value: number; seed: number } {
  const t = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return { value: ((r ^ (r >>> 14)) >>> 0) / 4294967296, seed: t };
}

export function stateRand(state: { seed: number }): number {
  const r = rngNext(state.seed);
  state.seed = r.seed;
  return r.value;
}

export function pickWeighted<T>(
  state: { seed: number },
  items: T[],
  weight: (item: T) => number,
): T {
  const total = items.reduce((sum, it) => sum + weight(it), 0);
  let roll = stateRand(state) * total;
  for (const it of items) {
    roll -= weight(it);
    if (roll <= 0 && weight(it) > 0) return it;
  }
  return items[items.length - 1];
}
```

- [ ] **Step 5: Esegui il test e verifica che passi**

Run: `npx vitest run src/sim/rng.test.ts`
Expected: PASS (3 test)

- [ ] **Step 6: Commit**

```bash
git add src/sim/config.ts src/sim/rng.ts src/sim/rng.test.ts
git commit -m "feat(sim): config di bilanciamento e RNG deterministico"
```

---

### Task 3: Geografia e calendario

**Files:**
- Create: `src/sim/geo.ts`, `src/sim/calendar.ts`
- Test: `src/sim/geo.test.ts`, `src/sim/calendar.test.ts`

- [ ] **Step 1: Scrivi i test che falliscono**

`src/sim/geo.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { greatCircleKm, latLonToVec3 } from './geo';

describe('geo', () => {
  it('latLonToVec3: polo nord a (0, r, 0), equatore/Greenwich a (r, 0, 0)', () => {
    const np = latLonToVec3(90, 0, 1);
    expect(np.x).toBeCloseTo(0);
    expect(np.y).toBeCloseTo(1);
    expect(np.z).toBeCloseTo(0);
    const eq = latLonToVec3(0, 0, 1);
    expect(eq.x).toBeCloseTo(1);
    expect(eq.y).toBeCloseTo(0);
    expect(eq.z).toBeCloseTo(0);
  });

  it('greatCircleKm: Londra-New York ≈ 5570 km', () => {
    const d = greatCircleKm(51.51, -0.13, 40.71, -74.01);
    expect(d).toBeGreaterThan(5400);
    expect(d).toBeLessThan(5750);
  });

  it('greatCircleKm: distanza da sé stessi = 0', () => {
    expect(greatCircleKm(45, 9, 45, 9)).toBeCloseTo(0);
  });
});
```

`src/sim/calendar.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { dateOfTick, dayOfTick } from './calendar';

describe('calendar', () => {
  it('20 tick = 1 giorno', () => {
    expect(dayOfTick(0)).toBe(0);
    expect(dayOfTick(19)).toBe(0);
    expect(dayOfTick(20)).toBe(1);
  });

  it('parte dal 1 gennaio 2026', () => {
    expect(dateOfTick(0).toISOString().slice(0, 10)).toBe('2026-01-01');
    expect(dateOfTick(20 * 31).toISOString().slice(0, 10)).toBe('2026-02-01');
  });
});
```

- [ ] **Step 2: Esegui e verifica che falliscano**

Run: `npx vitest run src/sim/geo.test.ts src/sim/calendar.test.ts`
Expected: FAIL — moduli inesistenti

- [ ] **Step 3: Implementa**

`src/sim/geo.ts`:
```ts
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const EARTH_RADIUS_KM = 6371;

export function latLonToVec3(latDeg: number, lonDeg: number, radius: number): Vec3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  return {
    x: radius * Math.cos(lat) * Math.cos(lon),
    y: radius * Math.sin(lat),
    z: -radius * Math.cos(lat) * Math.sin(lon),
  };
}

export function greatCircleKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}
```

`src/sim/calendar.ts`:
```ts
import { CONFIG } from './config';

export function dayOfTick(tick: number): number {
  return Math.floor(tick / CONFIG.ticksPerDay);
}

export function dateOfTick(tick: number): Date {
  const d = new Date(CONFIG.startDateIso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + dayOfTick(tick));
  return d;
}
```

- [ ] **Step 4: Esegui e verifica che passino**

Run: `npx vitest run src/sim/geo.test.ts src/sim/calendar.test.ts`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add src/sim/geo.ts src/sim/geo.test.ts src/sim/calendar.ts src/sim/calendar.test.ts
git commit -m "feat(sim): geografia sferica e calendario a tick"
```

---

### Task 4: Le 50 città e lo stato di gioco

**Files:**
- Create: `src/data/cities.json`, `src/sim/state.ts`
- Test: `src/sim/state.test.ts`

- [ ] **Step 1: Crea `src/data/cities.json`** — 50 città reali, popolazione metropolitana approssimata (~2026), regioni per il direttore delle ondate, copertura uniforme del globo

```json
[
  { "id": "tokyo", "name": "Tokyo", "country": "Giappone", "region": "asia", "lat": 35.68, "lon": 139.69, "population": 37000000 },
  { "id": "delhi", "name": "Delhi", "country": "India", "region": "asia", "lat": 28.61, "lon": 77.21, "population": 34700000 },
  { "id": "shanghai", "name": "Shanghai", "country": "Cina", "region": "asia", "lat": 31.23, "lon": 121.47, "population": 30500000 },
  { "id": "dhaka", "name": "Dhaka", "country": "Bangladesh", "region": "asia", "lat": 23.81, "lon": 90.41, "population": 24700000 },
  { "id": "mumbai", "name": "Mumbai", "country": "India", "region": "asia", "lat": 19.08, "lon": 72.88, "population": 22100000 },
  { "id": "beijing", "name": "Pechino", "country": "Cina", "region": "asia", "lat": 39.9, "lon": 116.4, "population": 22600000 },
  { "id": "osaka", "name": "Osaka", "country": "Giappone", "region": "asia", "lat": 34.69, "lon": 135.5, "population": 18900000 },
  { "id": "karachi", "name": "Karachi", "country": "Pakistan", "region": "asia", "lat": 24.86, "lon": 67.01, "population": 18000000 },
  { "id": "manila", "name": "Manila", "country": "Filippine", "region": "asia", "lat": 14.6, "lon": 120.98, "population": 15200000 },
  { "id": "seoul", "name": "Seul", "country": "Corea del Sud", "region": "asia", "lat": 37.57, "lon": 126.98, "population": 10000000 },
  { "id": "jakarta", "name": "Giacarta", "country": "Indonesia", "region": "asia", "lat": -6.21, "lon": 106.85, "population": 11400000 },
  { "id": "bangkok", "name": "Bangkok", "country": "Thailandia", "region": "asia", "lat": 13.76, "lon": 100.5, "population": 11200000 },
  { "id": "singapore", "name": "Singapore", "country": "Singapore", "region": "asia", "lat": 1.35, "lon": 103.82, "population": 6000000 },
  { "id": "hochiminh", "name": "Ho Chi Minh", "country": "Vietnam", "region": "asia", "lat": 10.82, "lon": 106.63, "population": 9800000 },
  { "id": "istanbul", "name": "Istanbul", "country": "Turchia", "region": "middle-east", "lat": 41.01, "lon": 28.98, "population": 16000000 },
  { "id": "tehran", "name": "Teheran", "country": "Iran", "region": "middle-east", "lat": 35.69, "lon": 51.39, "population": 9600000 },
  { "id": "baghdad", "name": "Baghdad", "country": "Iraq", "region": "middle-east", "lat": 33.31, "lon": 44.36, "population": 7900000 },
  { "id": "riyadh", "name": "Riyad", "country": "Arabia Saudita", "region": "middle-east", "lat": 24.71, "lon": 46.68, "population": 7700000 },
  { "id": "moscow", "name": "Mosca", "country": "Russia", "region": "europe", "lat": 55.76, "lon": 37.62, "population": 12700000 },
  { "id": "london", "name": "Londra", "country": "Regno Unito", "region": "europe", "lat": 51.51, "lon": -0.13, "population": 9700000 },
  { "id": "paris", "name": "Parigi", "country": "Francia", "region": "europe", "lat": 48.86, "lon": 2.35, "population": 11300000 },
  { "id": "berlin", "name": "Berlino", "country": "Germania", "region": "europe", "lat": 52.52, "lon": 13.41, "population": 3800000 },
  { "id": "madrid", "name": "Madrid", "country": "Spagna", "region": "europe", "lat": 40.42, "lon": -3.7, "population": 6900000 },
  { "id": "rome", "name": "Roma", "country": "Italia", "region": "europe", "lat": 41.89, "lon": 12.48, "population": 4300000 },
  { "id": "reykjavik", "name": "Reykjavik", "country": "Islanda", "region": "europe", "lat": 64.15, "lon": -21.94, "population": 140000 },
  { "id": "cairo", "name": "Il Cairo", "country": "Egitto", "region": "africa", "lat": 30.04, "lon": 31.24, "population": 22600000 },
  { "id": "lagos", "name": "Lagos", "country": "Nigeria", "region": "africa", "lat": 6.52, "lon": 3.38, "population": 16500000 },
  { "id": "kinshasa", "name": "Kinshasa", "country": "RD Congo", "region": "africa", "lat": -4.44, "lon": 15.27, "population": 17000000 },
  { "id": "nairobi", "name": "Nairobi", "country": "Kenya", "region": "africa", "lat": -1.29, "lon": 36.82, "population": 5300000 },
  { "id": "johannesburg", "name": "Johannesburg", "country": "Sudafrica", "region": "africa", "lat": -26.2, "lon": 28.05, "population": 6400000 },
  { "id": "casablanca", "name": "Casablanca", "country": "Marocco", "region": "africa", "lat": 33.57, "lon": -7.59, "population": 3900000 },
  { "id": "antananarivo", "name": "Antananarivo", "country": "Madagascar", "region": "africa", "lat": -18.88, "lon": 47.51, "population": 1600000 },
  { "id": "newyork", "name": "New York", "country": "USA", "region": "north-america", "lat": 40.71, "lon": -74.01, "population": 19000000 },
  { "id": "losangeles", "name": "Los Angeles", "country": "USA", "region": "north-america", "lat": 34.05, "lon": -118.24, "population": 12500000 },
  { "id": "mexicocity", "name": "Città del Messico", "country": "Messico", "region": "north-america", "lat": 19.43, "lon": -99.13, "population": 22500000 },
  { "id": "chicago", "name": "Chicago", "country": "USA", "region": "north-america", "lat": 41.88, "lon": -87.63, "population": 8900000 },
  { "id": "toronto", "name": "Toronto", "country": "Canada", "region": "north-america", "lat": 43.65, "lon": -79.38, "population": 6600000 },
  { "id": "vancouver", "name": "Vancouver", "country": "Canada", "region": "north-america", "lat": 49.28, "lon": -123.12, "population": 2700000 },
  { "id": "anchorage", "name": "Anchorage", "country": "USA", "region": "north-america", "lat": 61.22, "lon": -149.9, "population": 290000 },
  { "id": "saopaulo", "name": "San Paolo", "country": "Brasile", "region": "south-america", "lat": -23.55, "lon": -46.63, "population": 22800000 },
  { "id": "buenosaires", "name": "Buenos Aires", "country": "Argentina", "region": "south-america", "lat": -34.6, "lon": -58.38, "population": 15500000 },
  { "id": "lima", "name": "Lima", "country": "Perù", "region": "south-america", "lat": -12.05, "lon": -77.04, "population": 11200000 },
  { "id": "bogota", "name": "Bogotà", "country": "Colombia", "region": "south-america", "lat": 4.71, "lon": -74.07, "population": 11500000 },
  { "id": "santiago", "name": "Santiago", "country": "Cile", "region": "south-america", "lat": -33.45, "lon": -70.67, "population": 7000000 },
  { "id": "sydney", "name": "Sydney", "country": "Australia", "region": "oceania", "lat": -33.87, "lon": 151.21, "population": 5400000 },
  { "id": "melbourne", "name": "Melbourne", "country": "Australia", "region": "oceania", "lat": -37.81, "lon": 144.96, "population": 5200000 },
  { "id": "perth", "name": "Perth", "country": "Australia", "region": "oceania", "lat": -31.95, "lon": 115.86, "population": 2200000 },
  { "id": "auckland", "name": "Auckland", "country": "Nuova Zelanda", "region": "oceania", "lat": -36.85, "lon": 174.76, "population": 1700000 },
  { "id": "honolulu", "name": "Honolulu", "country": "USA", "region": "oceania", "lat": 21.31, "lon": -157.86, "population": 1000000 },
  { "id": "suva", "name": "Suva", "country": "Figi", "region": "oceania", "lat": -18.14, "lon": 178.44, "population": 100000 }
]
```

- [ ] **Step 2: Scrivi il test che fallisce** — `src/sim/state.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame, worldPopulation } from './state';

describe('state', () => {
  it('createNewGame carica 50 città vive con popolazione iniziale', () => {
    const s = createNewGame(123);
    expect(s.cities).toHaveLength(50);
    expect(s.cities.every(c => c.alive && c.population === c.initialPopulation)).toBe(true);
    expect(s.credits).toBe(CONFIG.startingCredits);
    expect(s.outcome).toBe('playing');
    expect(s.tick).toBe(0);
  });

  it('la prima ondata arriva tra il giorno 10 e il 15, con regione valida', () => {
    for (const seed of [1, 2, 3, 99]) {
      const s = createNewGame(seed);
      const day = s.nextWave.arrivalTick / CONFIG.ticksPerDay;
      expect(day).toBeGreaterThanOrEqual(CONFIG.waves.firstWaveDayMin);
      expect(day).toBeLessThanOrEqual(CONFIG.waves.firstWaveDayMax);
      expect(s.cities.some(c => c.region === s.nextWave.region)).toBe(true);
      expect(s.nextWave.ufoCount).toBe(CONFIG.waves.ufosBase);
    }
  });

  it('è deterministico: stesso seed, stesso stato', () => {
    expect(createNewGame(7)).toEqual(createNewGame(7));
  });

  it('worldPopulation somma le città', () => {
    const s = createNewGame(1);
    expect(worldPopulation(s)).toBeGreaterThan(400_000_000);
  });
});
```

- [ ] **Step 3: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/state.test.ts`
Expected: FAIL — modulo `./state` inesistente

- [ ] **Step 4: Implementa `src/sim/state.ts`**

```ts
import citiesData from '../data/cities.json';
import { CONFIG } from './config';
import { stateRand } from './rng';

export interface CityState {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  population: number;
  initialPopulation: number;
  alive: boolean;
}

export interface TransferState {
  fromCityId: string;
  toCityId: string;
  ticksRemaining: number;
  totalTicks: number;
}

export interface SquadronState {
  id: number;
  hp: number;
  cityId: string; // città di stanza; durante un trasferimento è la destinazione
  transfer: TransferState | null; // non-null = in volo, non combatte
}

export type UfoPhase = 'descending' | 'abducting' | 'escaping';

export interface UfoState {
  id: number;
  hp: number;
  targetCityId: string;
  phase: UfoPhase;
  ticksRemaining: number; // tick alla fine della fase corrente
  abducted: number; // contatore di bordo, accumula 0.5/tick in abducting
}

export interface WaveState {
  waveNumber: number;
  arrivalTick: number;
  ufoCount: number;
  region: string;
}

export interface GameStats {
  ufosShotDown: number;
  populationLost: number;
}

export type Outcome = 'playing' | 'victory' | 'defeat';

export interface GameState {
  version: number;
  seed: number;
  tick: number;
  speed: 0 | 1 | 2 | 4;
  credits: number;
  cities: CityState[];
  squadrons: SquadronState[];
  ufos: UfoState[];
  nextSquadronId: number;
  nextUfoId: number;
  nextWave: WaveState;
  wavesSpawned: number;
  stats: GameStats;
  outcome: Outcome;
}

interface CityRow {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  population: number;
}

export function worldPopulation(state: GameState): number {
  return state.cities.reduce((sum, c) => sum + c.population, 0);
}

export function createNewGame(seed: number): GameState {
  const cities: CityState[] = (citiesData as CityRow[]).map(c => ({
    ...c,
    initialPopulation: c.population,
    alive: true,
  }));
  const state: GameState = {
    version: CONFIG.saveVersion,
    seed,
    tick: 0,
    speed: 1,
    credits: CONFIG.startingCredits,
    cities,
    squadrons: [],
    ufos: [],
    nextSquadronId: 1,
    nextUfoId: 1,
    nextWave: { waveNumber: 1, arrivalTick: 0, ufoCount: CONFIG.waves.ufosBase, region: '' },
    wavesSpawned: 0,
    stats: { ufosShotDown: 0, populationLost: 0 },
    outcome: 'playing',
  };
  const w = CONFIG.waves;
  const day =
    w.firstWaveDayMin + Math.floor(stateRand(state) * (w.firstWaveDayMax - w.firstWaveDayMin + 1));
  const regions = [...new Set(cities.map(c => c.region))].sort();
  state.nextWave.arrivalTick = day * CONFIG.ticksPerDay;
  state.nextWave.region = regions[Math.floor(stateRand(state) * regions.length)];
  return state;
}
```

- [ ] **Step 5: Esegui e verifica che passi**

Run: `npx vitest run src/sim/state.test.ts`
Expected: PASS (4 test)

- [ ] **Step 6: Commit**

```bash
git add src/data/cities.json src/sim/state.ts src/sim/state.test.ts
git commit -m "feat(sim): 50 città reali e stato di gioco"
```

---

### Task 5: Economia

**Files:**
- Create: `src/sim/economy.ts`
- Test: `src/sim/economy.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce** — `src/sim/economy.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { applyDailyEconomy, dailyIncome } from './economy';
import { createNewGame, worldPopulation } from './state';

describe('economy', () => {
  it('reddito = popolazione viva in milioni × aliquota, arrotondato', () => {
    const s = createNewGame(1);
    expect(dailyIncome(s)).toBe(Math.round(worldPopulation(s) / 1_000_000));
  });

  it('le città distrutte non pagano tasse', () => {
    const s = createNewGame(1);
    const before = dailyIncome(s);
    const tokyo = s.cities.find(c => c.id === 'tokyo')!;
    tokyo.alive = false;
    expect(dailyIncome(s)).toBe(before - Math.round(tokyo.population / 1_000_000));
  });

  it('applyDailyEconomy accredita il reddito', () => {
    const s = createNewGame(1);
    const credits = s.credits;
    applyDailyEconomy(s);
    expect(s.credits).toBe(credits + dailyIncome(s));
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/economy.test.ts`
Expected: FAIL — modulo `./economy` inesistente

- [ ] **Step 3: Implementa `src/sim/economy.ts`**

```ts
import { CONFIG } from './config';
import type { GameState } from './state';

export function dailyIncome(state: GameState): number {
  const alivePop = state.cities
    .filter(c => c.alive)
    .reduce((sum, c) => sum + c.population, 0);
  return Math.round((alivePop / 1_000_000) * CONFIG.taxPerMillionPerDay);
}

export function applyDailyEconomy(state: GameState): void {
  state.credits += dailyIncome(state);
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npx vitest run src/sim/economy.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/sim/economy.ts src/sim/economy.test.ts
git commit -m "feat(sim): economia a tasse proporzionali alla popolazione"
```

---

### Task 6: Squadroni — costi e trasferimenti

**Files:**
- Create: `src/sim/squadrons.ts`
- Test: `src/sim/squadrons.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce** — `src/sim/squadrons.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { progressTransfers, squadronCost, transferTicks } from './squadrons';
import { createNewGame } from './state';

function addSquadron(s: ReturnType<typeof createNewGame>, cityId: string) {
  s.squadrons.push({ id: s.nextSquadronId++, hp: CONFIG.squadron.hp, cityId, transfer: null });
}

describe('squadrons', () => {
  it('il costo cresce con gli squadroni già presenti nella città', () => {
    const s = createNewGame(1);
    expect(squadronCost(s, 'rome')).toBe(500);
    addSquadron(s, 'rome');
    expect(squadronCost(s, 'rome')).toBe(750);
    addSquadron(s, 'rome');
    expect(squadronCost(s, 'rome')).toBe(1000);
    expect(squadronCost(s, 'tokyo')).toBe(500); // altra città non influenzata
  });

  it('transferTicks: distanza/velocità in tick, minimo 1', () => {
    // 12000 km a 24000 km/giorno = 0.5 giorni = 10 tick
    expect(transferTicks(12000)).toBe(10);
    expect(transferTicks(1)).toBe(1);
  });

  it('progressTransfers decrementa e completa il trasferimento', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    const sq = s.squadrons[0];
    sq.cityId = 'tokyo';
    sq.transfer = { fromCityId: 'rome', toCityId: 'tokyo', ticksRemaining: 2, totalTicks: 2 };
    progressTransfers(s);
    expect(sq.transfer?.ticksRemaining).toBe(1);
    progressTransfers(s);
    expect(sq.transfer).toBeNull();
    expect(sq.cityId).toBe('tokyo');
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/squadrons.test.ts`
Expected: FAIL — modulo `./squadrons` inesistente

- [ ] **Step 3: Implementa `src/sim/squadrons.ts`**

```ts
import { CONFIG } from './config';
import type { GameState } from './state';

export function squadronsInCity(state: GameState, cityId: string): number {
  // conta anche quelli in arrivo (cityId = destinazione)
  return state.squadrons.filter(s => s.cityId === cityId).length;
}

export function squadronCost(state: GameState, cityId: string): number {
  const sq = CONFIG.squadron;
  return Math.round(sq.baseCost * (1 + sq.costGrowth * squadronsInCity(state, cityId)));
}

export function transferTicks(distanceKm: number): number {
  return Math.max(
    1,
    Math.ceil((distanceKm / CONFIG.squadron.speedKmPerDay) * CONFIG.ticksPerDay),
  );
}

export function progressTransfers(state: GameState): void {
  for (const s of state.squadrons) {
    if (!s.transfer) continue;
    s.transfer.ticksRemaining--;
    if (s.transfer.ticksRemaining <= 0) s.transfer = null;
  }
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npx vitest run src/sim/squadrons.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/sim/squadrons.ts src/sim/squadrons.test.ts
git commit -m "feat(sim): squadroni con costi crescenti e trasferimenti a tempo"
```

---

### Task 7: UFO rapitore — ciclo di vita e regola dei rapiti

**Files:**
- Create: `src/sim/ufos.ts`
- Test: `src/sim/ufos.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce** — `src/sim/ufos.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { progressUfos, removeUfo, spawnUfo, travelTicks } from './ufos';

describe('ufos', () => {
  // 2000 km a 8000 km/giorno = 0.25 giorni = 5 tick
  it('travelTicks dalla scheda statistiche', () => {
    expect(travelTicks()).toBe(5);
  });

  it('ciclo completo: discesa → rapimento (10 in 1 giorno) → fuga → -10 popolazione', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const popBefore = rome.population;
    const total = travelTicks() + CONFIG.ticksPerDay + travelTicks();
    for (let i = 0; i < total; i++) progressUfos(s);
    expect(s.ufos).toHaveLength(0);
    expect(rome.population).toBe(popBefore - 10);
    expect(s.stats.populationLost).toBe(10);
    expect(s.stats.ufosShotDown).toBe(0);
  });

  it('abbattuto prima di atterrare = zero perdite', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    progressUfos(s); // ancora in discesa
    removeUfo(s, s.ufos[0].id, 'shotDown');
    expect(s.cities.find(c => c.id === 'rome')!.population)
      .toBe(s.cities.find(c => c.id === 'rome')!.initialPopulation);
    expect(s.stats.ufosShotDown).toBe(1);
    expect(s.stats.populationLost).toBe(0);
  });

  it('abbattuto a metà rapimento = persi solo i rapiti fino a quel momento (floor)', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    const popBefore = rome.population;
    // 5 tick di discesa + 7 tick di rapimento → abducted = 3.5
    for (let i = 0; i < travelTicks() + 7; i++) progressUfos(s);
    expect(s.ufos[0].phase).toBe('abducting');
    removeUfo(s, s.ufos[0].id, 'shotDown');
    expect(rome.population).toBe(popBefore - 3);
    expect(s.stats.populationLost).toBe(3);
  });

  it('se la città bersaglio è distrutta, l\'UFO passa in fuga', () => {
    const s = createNewGame(1);
    spawnUfo(s, 'rome');
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.alive = false;
    progressUfos(s);
    expect(s.ufos[0].phase).toBe('escaping');
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/ufos.test.ts`
Expected: FAIL — modulo `./ufos` inesistente

- [ ] **Step 3: Implementa `src/sim/ufos.ts`**

```ts
import { CONFIG } from './config';
import type { GameState } from './state';

export function travelTicks(): number {
  const u = CONFIG.ufoAbductor;
  return Math.ceil((u.descentKm / u.speedKmPerDay) * CONFIG.ticksPerDay);
}

export function spawnUfo(state: GameState, targetCityId: string): void {
  state.ufos.push({
    id: state.nextUfoId++,
    hp: CONFIG.ufoAbductor.hp,
    targetCityId,
    phase: 'descending',
    ticksRemaining: travelTicks(),
    abducted: 0,
  });
}

export function progressUfos(state: GameState): void {
  const u = CONFIG.ufoAbductor;
  const abductionTicks = u.abductionDays * CONFIG.ticksPerDay;
  const perTick = u.abductionPerDay / CONFIG.ticksPerDay;
  for (const ufo of [...state.ufos]) {
    const city = state.cities.find(c => c.id === ufo.targetCityId)!;
    if (!city.alive && ufo.phase !== 'escaping') {
      ufo.phase = 'escaping';
      ufo.ticksRemaining = travelTicks();
      continue;
    }
    ufo.ticksRemaining--;
    if (ufo.phase === 'abducting') ufo.abducted += perTick;
    if (ufo.ticksRemaining > 0) continue;
    if (ufo.phase === 'descending') {
      ufo.phase = 'abducting';
      ufo.ticksRemaining = abductionTicks;
    } else if (ufo.phase === 'abducting') {
      ufo.phase = 'escaping';
      ufo.ticksRemaining = travelTicks();
    } else {
      removeUfo(state, ufo.id, 'escaped');
    }
  }
}

// La popolazione rapita si perde quando l'UFO esce di scena, in ogni caso:
// fuga riuscita o abbattimento (i rapiti a bordo muoiono nello schianto).
export function removeUfo(state: GameState, ufoId: number, cause: 'shotDown' | 'escaped'): void {
  const ufo = state.ufos.find(x => x.id === ufoId);
  if (!ufo) return;
  const city = state.cities.find(c => c.id === ufo.targetCityId)!;
  const loss = Math.min(Math.floor(ufo.abducted), city.population);
  city.population -= loss;
  state.stats.populationLost += loss;
  if (city.population <= 0) {
    city.population = 0;
    city.alive = false;
  }
  if (cause === 'shotDown') state.stats.ufosShotDown++;
  state.ufos = state.ufos.filter(x => x.id !== ufoId);
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npx vitest run src/sim/ufos.test.ts`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add src/sim/ufos.ts src/sim/ufos.test.ts
git commit -m "feat(sim): UFO rapitore con ciclo discesa/rapimento/fuga"
```

---

### Task 8: Combattimento

**Files:**
- Create: `src/sim/combat.ts`
- Test: `src/sim/combat.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce** — `src/sim/combat.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { effectiveDamage, resolveCombat } from './combat';
import { createNewGame } from './state';
import { spawnUfo } from './ufos';

function addSquadron(s: ReturnType<typeof createNewGame>, cityId: string) {
  s.squadrons.push({ id: s.nextSquadronId++, hp: CONFIG.squadron.hp, cityId, transfer: null });
}

describe('combat', () => {
  it('danno = colpi × max(1, attacco − corazza)', () => {
    expect(effectiveDamage(6, 1, 1)).toBe(5);
    expect(effectiveDamage(2, 1, 10)).toBe(1); // minimo 1
    expect(effectiveDamage(6, 2, 1)).toBe(10);
  });

  it('squadrone e UFO si scambiano colpi; l\'UFO viene abbattuto', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnUfo(s, 'rome');
    // UFO 60 hp, danno squadrone 5/tick → 12 tick per abbatterlo
    for (let i = 0; i < 12; i++) resolveCombat(s);
    expect(s.ufos).toHaveLength(0);
    expect(s.stats.ufosShotDown).toBe(1);
    // lo squadrone ha subito 12 × max(1, 4-2) = 24 danni
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp - 24);
  });

  it('uno squadrone in trasferimento non combatte', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    s.squadrons[0].transfer = { fromCityId: 'paris', toCityId: 'rome', ticksRemaining: 5, totalTicks: 5 };
    spawnUfo(s, 'rome');
    resolveCombat(s);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp);
  });

  it('priorità bersagli: prima chi sta rapendo, poi chi scende, poi chi fugge', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    spawnUfo(s, 'rome'); // id 1: descending
    spawnUfo(s, 'rome'); // id 2: abducting
    s.ufos[1].phase = 'abducting';
    resolveCombat(s);
    expect(s.ufos[1].hp).toBeLessThan(CONFIG.ufoAbductor.hp);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp);
  });

  it('più squadroni concentrano il fuoco; lo squadrone con id più basso incassa', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome'); // id 1
    addSquadron(s, 'rome'); // id 2
    spawnUfo(s, 'rome');
    resolveCombat(s);
    expect(s.ufos[0].hp).toBe(CONFIG.ufoAbductor.hp - 10); // 2 × 5
    expect(s.squadrons[0].hp).toBe(CONFIG.squadron.hp - 2); // id 1 incassa
    expect(s.squadrons[1].hp).toBe(CONFIG.squadron.hp);
  });

  it('uno squadrone a 0 hp viene distrutto', () => {
    const s = createNewGame(1);
    addSquadron(s, 'rome');
    s.squadrons[0].hp = 2;
    spawnUfo(s, 'rome');
    resolveCombat(s);
    expect(s.squadrons).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/combat.test.ts`
Expected: FAIL — modulo `./combat` inesistente

- [ ] **Step 3: Implementa `src/sim/combat.ts`**

```ts
import { CONFIG } from './config';
import type { GameState, UfoPhase } from './state';
import { removeUfo } from './ufos';

const PHASE_RANK: Record<UfoPhase, number> = { abducting: 0, descending: 1, escaping: 2 };

export function effectiveDamage(attack: number, shots: number, armor: number): number {
  return shots * Math.max(1, attack - armor);
}

export function resolveCombat(state: GameState): void {
  const sq = CONFIG.squadron;
  const uf = CONFIG.ufoAbductor;
  for (const city of state.cities) {
    if (!city.alive) continue;
    const defenders = state.squadrons.filter(s => s.cityId === city.id && s.transfer === null);
    if (defenders.length === 0) continue;
    const engaged = state.ufos.filter(u => u.targetCityId === city.id);
    if (engaged.length === 0) continue;
    const target = [...engaged].sort(
      (a, b) =>
        PHASE_RANK[a.phase] - PHASE_RANK[b.phase] ||
        a.ticksRemaining - b.ticksRemaining ||
        a.id - b.id,
    )[0];
    const victim = [...defenders].sort((a, b) => a.id - b.id)[0];
    // danni simultanei: si calcolano entrambi, poi si applicano
    const damageToUfo = defenders.length * effectiveDamage(sq.attack, sq.shotsPerTick, uf.armor);
    const damageToSquadron = engaged.length * effectiveDamage(uf.attack, uf.shotsPerTick, sq.armor);
    target.hp -= damageToUfo;
    victim.hp -= damageToSquadron;
    if (victim.hp <= 0) state.squadrons = state.squadrons.filter(s => s.id !== victim.id);
    if (target.hp <= 0) removeUfo(state, target.id, 'shotDown');
  }
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npx vitest run src/sim/combat.test.ts`
Expected: PASS (6 test)

- [ ] **Step 5: Commit**

```bash
git add src/sim/combat.ts src/sim/combat.test.ts
git commit -m "feat(sim): combattimento per città con priorità bersagli"
```

---

### Task 9: Direttore delle ondate

**Files:**
- Create: `src/sim/waves.ts`
- Test: `src/sim/waves.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce** — `src/sim/waves.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { processWaves, scheduleNextWave } from './waves';

describe('waves', () => {
  it('non spawna prima del tick di arrivo', () => {
    const s = createNewGame(1);
    processWaves(s);
    expect(s.ufos).toHaveLength(0);
    expect(s.wavesSpawned).toBe(0);
  });

  it('al tick di arrivo spawna gli UFO nella regione e pianifica la successiva', () => {
    const s = createNewGame(1);
    const wave = s.nextWave;
    s.tick = wave.arrivalTick;
    processWaves(s);
    expect(s.ufos).toHaveLength(wave.ufoCount);
    expect(s.wavesSpawned).toBe(1);
    for (const u of s.ufos) {
      expect(s.cities.find(c => c.id === u.targetCityId)!.region).toBe(wave.region);
    }
    expect(s.nextWave.waveNumber).toBe(2);
    expect(s.nextWave.arrivalTick).toBeGreaterThan(s.tick);
    expect(s.nextWave.ufoCount).toBe(CONFIG.waves.ufosBase + CONFIG.waves.ufosPerWave);
  });

  it('l\'intervallo si accorcia col progredire ma non sotto il minimo', () => {
    const s = createNewGame(1);
    s.wavesSpawned = 100;
    s.tick = 5000;
    scheduleNextWave(s);
    const days = (s.nextWave.arrivalTick - s.tick) / CONFIG.ticksPerDay;
    expect(days).toBeGreaterThanOrEqual(CONFIG.waves.intervalMinDays);
    expect(days).toBeLessThanOrEqual(CONFIG.waves.intervalMinDays + 2); // jitter max 2 giorni
  });

  it('è deterministico a parità di seed', () => {
    const a = createNewGame(5);
    const b = createNewGame(5);
    a.tick = a.nextWave.arrivalTick;
    b.tick = b.nextWave.arrivalTick;
    processWaves(a);
    processWaves(b);
    expect(a.ufos).toEqual(b.ufos);
    expect(a.nextWave).toEqual(b.nextWave);
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/waves.test.ts`
Expected: FAIL — modulo `./waves` inesistente

- [ ] **Step 3: Implementa `src/sim/waves.ts`**

```ts
import { CONFIG } from './config';
import { pickWeighted, stateRand } from './rng';
import type { GameState } from './state';
import { spawnUfo } from './ufos';

export function scheduleNextWave(state: GameState): void {
  const w = CONFIG.waves;
  const waveNumber = state.wavesSpawned + 1;
  const intervalDays = Math.max(
    w.intervalMinDays,
    w.intervalBaseDays - w.intervalShrinkPerWave * state.wavesSpawned,
  );
  const jitter = Math.floor(stateRand(state) * 3); // 0..2 giorni
  const regions = [...new Set(state.cities.filter(c => c.alive).map(c => c.region))].sort();
  const region = regions[Math.floor(stateRand(state) * regions.length)];
  state.nextWave = {
    waveNumber,
    arrivalTick: state.tick + (intervalDays + jitter) * CONFIG.ticksPerDay,
    ufoCount: w.ufosBase + w.ufosPerWave * (waveNumber - 1),
    region,
  };
}

export function processWaves(state: GameState): void {
  if (state.tick < state.nextWave.arrivalTick) return;
  const inRegion = state.cities.filter(c => c.alive && c.region === state.nextWave.region);
  const pool = inRegion.length > 0 ? inRegion : state.cities.filter(c => c.alive);
  for (let i = 0; i < state.nextWave.ufoCount; i++) {
    const city = pickWeighted(state, pool, c => c.population);
    spawnUfo(state, city.id);
  }
  state.wavesSpawned++;
  scheduleNextWave(state);
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npx vitest run src/sim/waves.test.ts`
Expected: PASS (4 test)

- [ ] **Step 5: Commit**

```bash
git add src/sim/waves.ts src/sim/waves.test.ts
git commit -m "feat(sim): direttore delle ondate con escalation e regioni"
```

---

### Task 10: Il tick orchestratore

**Files:**
- Create: `src/sim/tick.ts`
- Test: `src/sim/tick.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce** — `src/sim/tick.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { createNewGame } from './state';
import { tick } from './tick';

describe('tick', () => {
  it('l\'economia si applica una volta al giorno', () => {
    const s = createNewGame(1);
    const credits = s.credits;
    for (let i = 0; i < CONFIG.ticksPerDay - 1; i++) tick(s);
    expect(s.credits).toBe(credits);
    tick(s); // tick 20 → fine giornata
    expect(s.credits).toBeGreaterThan(credits);
  });

  it('determinismo: stesso seed e stessi comandi → stato identico', () => {
    const a = createNewGame(42);
    const b = createNewGame(42);
    for (let i = 0; i < 15 * CONFIG.ticksPerDay; i++) {
      tick(a);
      tick(b);
    }
    expect(a).toEqual(b);
  });

  it('sconfitta a popolazione mondiale zero', () => {
    const s = createNewGame(1);
    for (const c of s.cities) {
      c.population = 0;
      c.alive = false;
    }
    tick(s);
    expect(s.outcome).toBe('defeat');
  });

  it('vittoria dopo le ondate richieste, a cielo sgombro', () => {
    const s = createNewGame(1);
    s.wavesSpawned = CONFIG.waves.victoryWaves;
    s.nextWave.arrivalTick = 999999;
    tick(s);
    expect(s.outcome).toBe('victory');
  });

  it('a esito deciso il tick non avanza più', () => {
    const s = createNewGame(1);
    s.outcome = 'victory';
    const t = s.tick;
    tick(s);
    expect(s.tick).toBe(t);
  });

  it('una partita giocata a lungo senza difese spawna ondate e perde popolazione', () => {
    const s = createNewGame(3);
    for (let i = 0; i < 40 * CONFIG.ticksPerDay; i++) tick(s);
    expect(s.wavesSpawned).toBeGreaterThanOrEqual(2);
    expect(s.stats.populationLost).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/tick.test.ts`
Expected: FAIL — modulo `./tick` inesistente

- [ ] **Step 3: Implementa `src/sim/tick.ts`**

```ts
import { CONFIG } from './config';
import { resolveCombat } from './combat';
import { applyDailyEconomy } from './economy';
import { progressTransfers } from './squadrons';
import type { GameState } from './state';
import { worldPopulation } from './state';
import { progressUfos } from './ufos';
import { processWaves } from './waves';

function checkOutcome(state: GameState): void {
  if (worldPopulation(state) <= 0) {
    state.outcome = 'defeat';
    return;
  }
  if (state.wavesSpawned >= CONFIG.waves.victoryWaves && state.ufos.length === 0) {
    state.outcome = 'victory';
  }
}

// Ordine fisso del tick: trasferimenti → ondate → combattimento →
// progressione UFO → economia (a fine giornata) → esito.
export function tick(state: GameState): void {
  if (state.outcome !== 'playing') return;
  state.tick++;
  progressTransfers(state);
  processWaves(state);
  resolveCombat(state);
  progressUfos(state);
  if (state.tick % CONFIG.ticksPerDay === 0) applyDailyEconomy(state);
  checkOutcome(state);
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npx vitest run src/sim/tick.test.ts`
Expected: PASS (6 test)

- [ ] **Step 5: Esegui l'intera suite**

Run: `npm test`
Expected: PASS, nessun test rotto altrove

- [ ] **Step 6: Commit**

```bash
git add src/sim/tick.ts src/sim/tick.test.ts
git commit -m "feat(sim): tick orchestratore con esito e ordine fisso"
```

---

### Task 11: Comandi validati

**Files:**
- Create: `src/sim/commands.ts`
- Test: `src/sim/commands.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce** — `src/sim/commands.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { cmdBuildSquadron, cmdRelocateSquadron, cmdSetSpeed } from './commands';
import { createNewGame } from './state';

describe('commands', () => {
  it('cmdBuildSquadron: costruisce scalando i crediti', () => {
    const s = createNewGame(1);
    s.credits = 600;
    const r = cmdBuildSquadron(s, 'rome');
    expect(r.ok).toBe(true);
    expect(s.credits).toBe(100);
    expect(s.squadrons).toHaveLength(1);
    expect(s.squadrons[0].cityId).toBe('rome');
  });

  it('cmdBuildSquadron: rifiuta crediti insufficienti e città non valide', () => {
    const s = createNewGame(1);
    s.credits = 100;
    expect(cmdBuildSquadron(s, 'rome').ok).toBe(false);
    s.credits = 9999;
    expect(cmdBuildSquadron(s, 'atlantide').ok).toBe(false);
    const rome = s.cities.find(c => c.id === 'rome')!;
    rome.alive = false;
    expect(cmdBuildSquadron(s, 'rome').ok).toBe(false);
    expect(s.squadrons).toHaveLength(0);
  });

  it('cmdRelocateSquadron: avvia il trasferimento con durata da distanza', () => {
    const s = createNewGame(1);
    s.credits = 9999;
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    const r = cmdRelocateSquadron(s, sq.id, 'tokyo');
    expect(r.ok).toBe(true);
    expect(sq.cityId).toBe('tokyo');
    expect(sq.transfer).not.toBeNull();
    expect(sq.transfer!.fromCityId).toBe('rome');
    expect(sq.transfer!.ticksRemaining).toBeGreaterThan(1); // Roma-Tokyo è lontana
  });

  it('cmdRelocateSquadron: rifiuta se già in volo, destinazione uguale o non valida', () => {
    const s = createNewGame(1);
    s.credits = 9999;
    cmdBuildSquadron(s, 'rome');
    const sq = s.squadrons[0];
    expect(cmdRelocateSquadron(s, sq.id, 'rome').ok).toBe(false);
    expect(cmdRelocateSquadron(s, 999, 'tokyo').ok).toBe(false);
    cmdRelocateSquadron(s, sq.id, 'tokyo');
    expect(cmdRelocateSquadron(s, sq.id, 'paris').ok).toBe(false); // già in volo
  });

  it('cmdSetSpeed cambia la velocità', () => {
    const s = createNewGame(1);
    expect(cmdSetSpeed(s, 4).ok).toBe(true);
    expect(s.speed).toBe(4);
    cmdSetSpeed(s, 0);
    expect(s.speed).toBe(0);
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/commands.test.ts`
Expected: FAIL — modulo `./commands` inesistente

- [ ] **Step 3: Implementa `src/sim/commands.ts`**

```ts
import { CONFIG } from './config';
import { greatCircleKm } from './geo';
import { squadronCost, transferTicks } from './squadrons';
import type { GameState } from './state';

export type CommandResult = { ok: true } | { ok: false; reason: string };

export function cmdBuildSquadron(state: GameState, cityId: string): CommandResult {
  const city = state.cities.find(c => c.id === cityId);
  if (!city || !city.alive) return { ok: false, reason: 'Città non disponibile' };
  const cost = squadronCost(state, cityId);
  if (state.credits < cost) {
    return { ok: false, reason: `Crediti insufficienti (servono ${cost})` };
  }
  state.credits -= cost;
  state.squadrons.push({
    id: state.nextSquadronId++,
    hp: CONFIG.squadron.hp,
    cityId,
    transfer: null,
  });
  return { ok: true };
}

export function cmdRelocateSquadron(
  state: GameState,
  squadronId: number,
  toCityId: string,
): CommandResult {
  const sq = state.squadrons.find(s => s.id === squadronId);
  if (!sq) return { ok: false, reason: 'Squadrone inesistente' };
  if (sq.transfer) return { ok: false, reason: 'Squadrone già in trasferimento' };
  const from = state.cities.find(c => c.id === sq.cityId)!;
  const to = state.cities.find(c => c.id === toCityId);
  if (!to || !to.alive) return { ok: false, reason: 'Destinazione non disponibile' };
  if (to.id === from.id) return { ok: false, reason: 'Lo squadrone è già qui' };
  const ticks = transferTicks(greatCircleKm(from.lat, from.lon, to.lat, to.lon));
  sq.transfer = { fromCityId: from.id, toCityId: to.id, ticksRemaining: ticks, totalTicks: ticks };
  sq.cityId = to.id;
  return { ok: true };
}

export function cmdSetSpeed(state: GameState, speed: 0 | 1 | 2 | 4): CommandResult {
  state.speed = speed;
  return { ok: true };
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npx vitest run src/sim/commands.test.ts`
Expected: PASS (5 test)

- [ ] **Step 5: Commit**

```bash
git add src/sim/commands.ts src/sim/commands.test.ts
git commit -m "feat(sim): comandi validati per costruzione, rischieramento, velocità"
```

---

### Task 12: Salvataggi versionati

**Files:**
- Create: `src/sim/save.ts`
- Test: `src/sim/save.test.ts`

- [ ] **Step 1: Scrivi il test che fallisce** — `src/sim/save.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CONFIG } from './config';
import { deserialize, serialize } from './save';
import { createNewGame } from './state';
import { tick } from './tick';

describe('save', () => {
  it('roundtrip: salva → carica → la partita prosegue identica', () => {
    const s = createNewGame(11);
    for (let i = 0; i < 250; i++) tick(s);
    const loaded = deserialize(serialize(s))!;
    expect(loaded).toEqual(s);
    // entrambe proseguono identiche
    for (let i = 0; i < 100; i++) {
      tick(s);
      tick(loaded);
    }
    expect(loaded).toEqual(s);
  });

  it('rifiuta JSON corrotto', () => {
    expect(deserialize('{non-json')).toBeNull();
    expect(deserialize('{"a":1}')).toBeNull();
  });

  it('rifiuta versioni future', () => {
    const s = createNewGame(1);
    const raw = JSON.parse(serialize(s));
    raw.version = CONFIG.saveVersion + 1;
    expect(deserialize(JSON.stringify(raw))).toBeNull();
  });
});
```

- [ ] **Step 2: Esegui e verifica che fallisca**

Run: `npx vitest run src/sim/save.test.ts`
Expected: FAIL — modulo `./save` inesistente

- [ ] **Step 3: Implementa `src/sim/save.ts`**

```ts
import { CONFIG } from './config';
import type { GameState } from './state';

export const SAVE_KEY = 'earth-defense-save';

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

// versione → funzione che migra a versione+1; si riempirà quando lo schema evolve
const MIGRATIONS: Record<number, Migration> = {};

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState | null {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof raw?.version !== 'number' || raw.version > CONFIG.saveVersion) return null;
  while ((raw.version as number) < CONFIG.saveVersion) {
    const migrate = MIGRATIONS[raw.version as number];
    if (!migrate) return null;
    raw = migrate(raw);
  }
  return raw as unknown as GameState;
}
```

- [ ] **Step 4: Esegui e verifica che passi**

Run: `npx vitest run src/sim/save.test.ts`
Expected: PASS (3 test)

- [ ] **Step 5: Commit**

```bash
git add src/sim/save.ts src/sim/save.test.ts
git commit -m "feat(sim): serializzazione versionata dei salvataggi"
```

---

### Task 13: Scena Three.js e globo

**Files:**
- Create: `src/render/scene.ts`, `src/render/globe.ts`, `public/textures/earth_atmos_2048.jpg` (asset scaricato)

- [ ] **Step 1: Scarica la texture della Terra**

Run (PowerShell):
```powershell
New-Item -ItemType Directory -Force public\textures
curl.exe -L -o public\textures\earth_atmos_2048.jpg https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg
```
Expected: file ~400KB. Se il download fallisce, prosegui comunque: `globe.ts` ha il fallback a sfera blu senza texture.

- [ ] **Step 2: Implementa `src/render/scene.ts`**

```ts
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export interface SceneCtx {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
}

export function createScene(container: HTMLElement): SceneCtx {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.01,
    100,
  );
  camera.position.set(0, 1.2, 3.2);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.7));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(5, 2, 4);
  scene.add(sun);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.4;
  controls.maxDistance = 8;
  controls.enablePan = false;

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { scene, camera, renderer, controls };
}
```

- [ ] **Step 3: Implementa `src/render/globe.ts`**

```ts
import * as THREE from 'three';

export const GLOBE_RADIUS = 1;

export function createGlobe(scene: THREE.Scene): void {
  const material = new THREE.MeshPhongMaterial({ color: 0x2266aa, shininess: 8 });
  new THREE.TextureLoader().load(
    '/textures/earth_atmos_2048.jpg',
    texture => {
      texture.colorSpace = THREE.SRGBColorSpace;
      material.map = texture;
      material.color.set(0xffffff);
      material.needsUpdate = true;
    },
    undefined,
    () => {
      // fallback: resta la sfera blu senza texture
    },
  );
  const globe = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64), material);
  scene.add(globe);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS * 1.03, 64, 64),
    new THREE.MeshBasicMaterial({
      color: 0x4db8ff,
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
    }),
  );
  scene.add(atmosphere);

  const starPositions = new Float32Array(800 * 3);
  for (let i = 0; i < starPositions.length; i++) {
    starPositions[i] = (Math.random() - 0.5) * 80;
  }
  const starsGeo = new THREE.BufferGeometry();
  starsGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06 })));
}
```

- [ ] **Step 4: Collega temporaneamente in `src/main.ts` per la verifica visiva**

Sostituisci il contenuto di `src/main.ts` con:
```ts
import { createGlobe } from './render/globe';
import { createScene } from './render/scene';

const ctx = createScene(document.getElementById('scene-container')!);
createGlobe(ctx.scene);

function frame() {
  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [ ] **Step 5: Verifica visiva**

Run: `npm run dev` e apri l'URL.
Expected: Terra con texture (o sfera blu se il download è fallito), alone azzurro, stelle; trascinando si orbita, con la rotella si zooma.

- [ ] **Step 6: Commit**

```bash
git add src/render/scene.ts src/render/globe.ts src/main.ts public/textures
git commit -m "feat(render): scena Three.js con globo, atmosfera e stelle"
```

---

### Task 14: Marker città, picking, unità ed effetti

**Files:**
- Create: `src/render/cities.ts`, `src/render/units.ts`, `src/render/effects.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implementa `src/render/cities.ts`**

```ts
import * as THREE from 'three';
import { latLonToVec3 } from '../sim/geo';
import type { CityState, GameState } from '../sim/state';
import { GLOBE_RADIUS } from './globe';

const COLOR_OK = 0x4db8ff;
const COLOR_ATTACK = 0xff5566;
const COLOR_SELECTED = 0xffe066;

export function cityPosition(city: CityState, altitude = 1.005): THREE.Vector3 {
  const v = latLonToVec3(city.lat, city.lon, GLOBE_RADIUS * altitude);
  return new THREE.Vector3(v.x, v.y, v.z);
}

export class CityLayer {
  private meshes = new Map<string, THREE.Mesh>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene, cities: CityState[]) {
    for (const city of cities) {
      const size = 0.006 + 0.012 * Math.cbrt(city.population / 37_000_000);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(size, 12, 12),
        new THREE.MeshBasicMaterial({ color: COLOR_OK }),
      );
      mesh.position.copy(cityPosition(city));
      mesh.userData.cityId = city.id;
      this.meshes.set(city.id, mesh);
      this.group.add(mesh);
    }
    scene.add(this.group);
  }

  update(state: GameState, selectedCityId: string | null): void {
    for (const city of state.cities) {
      const mesh = this.meshes.get(city.id);
      if (!mesh) continue;
      if (!city.alive) {
        this.group.remove(mesh);
        this.meshes.delete(city.id);
        continue;
      }
      const underAttack = state.ufos.some(u => u.targetCityId === city.id);
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.color.set(
        city.id === selectedCityId ? COLOR_SELECTED : underAttack ? COLOR_ATTACK : COLOR_OK,
      );
    }
  }

  cityIdAt(raycaster: THREE.Raycaster): string | null {
    const hits = raycaster.intersectObjects([...this.meshes.values()]);
    return hits.length > 0 ? (hits[0].object.userData.cityId as string) : null;
  }
}
```

- [ ] **Step 2: Implementa `src/render/units.ts`**

```ts
import * as THREE from 'three';
import type { GameState } from '../sim/state';
import { travelTicks } from '../sim/ufos';
import { cityPosition } from './cities';

const UFO_COLOR = 0xff5566;
const SQUADRON_COLOR = 0xffb347;
const TRAVEL_ALTITUDE = 1.8; // quota di spawn/fuga UFO, in raggi
const TRANSFER_ALTITUDE = 1.15; // quota di crociera squadroni

export class UnitLayer {
  private ufoMeshes = new Map<number, THREE.Mesh>();
  private squadronMeshes = new Map<number, THREE.Mesh>();
  readonly group = new THREE.Group();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  ufoPosition(ufoId: number): THREE.Vector3 | null {
    return this.ufoMeshes.get(ufoId)?.position.clone() ?? null;
  }

  update(state: GameState): void {
    this.sync(
      this.ufoMeshes,
      state.ufos.map(u => u.id),
      () =>
        new THREE.Mesh(
          new THREE.ConeGeometry(0.02, 0.045, 8),
          new THREE.MeshBasicMaterial({ color: UFO_COLOR }),
        ),
    );
    this.sync(
      this.squadronMeshes,
      state.squadrons.map(s => s.id),
      () =>
        new THREE.Mesh(
          new THREE.OctahedronGeometry(0.018),
          new THREE.MeshBasicMaterial({ color: SQUADRON_COLOR }),
        ),
    );

    for (const ufo of state.ufos) {
      const city = state.cities.find(c => c.id === ufo.targetCityId)!;
      const surface = cityPosition(city, 1.02);
      const sky = surface.clone().normalize().multiplyScalar(TRAVEL_ALTITUDE);
      let target: THREE.Vector3;
      if (ufo.phase === 'descending') {
        const frac = ufo.ticksRemaining / travelTicks(); // 1 → lontano, 0 → atterrato
        target = surface.clone().lerp(sky, frac);
      } else if (ufo.phase === 'abducting') {
        target = surface;
      } else {
        const total = travelTicks();
        const frac = 1 - ufo.ticksRemaining / total; // 0 → a terra, 1 → fuggito
        target = surface.clone().lerp(sky, frac);
      }
      this.ufoMeshes.get(ufo.id)!.position.lerp(target, 0.15);
    }

    for (const sq of state.squadrons) {
      const mesh = this.squadronMeshes.get(sq.id)!;
      let target: THREE.Vector3;
      if (sq.transfer) {
        const from = state.cities.find(c => c.id === sq.transfer!.fromCityId)!;
        const to = state.cities.find(c => c.id === sq.transfer!.toCityId)!;
        const frac = 1 - sq.transfer.ticksRemaining / sq.transfer.totalTicks;
        const a = cityPosition(from, 1).normalize();
        const b = cityPosition(to, 1).normalize();
        const angle = a.angleTo(b);
        const axis = new THREE.Vector3().crossVectors(a, b).normalize();
        target = a
          .clone()
          .applyAxisAngle(axis, angle * frac)
          .multiplyScalar(TRANSFER_ALTITUDE);
      } else {
        const city = state.cities.find(c => c.id === sq.cityId)!;
        target = cityPosition(city, 1.04);
      }
      mesh.position.lerp(target, 0.15);
    }
  }

  private sync(
    meshes: Map<number, THREE.Mesh>,
    ids: number[],
    create: () => THREE.Mesh,
  ): void {
    const wanted = new Set(ids);
    for (const [id, mesh] of meshes) {
      if (!wanted.has(id)) {
        this.group.remove(mesh);
        meshes.delete(id);
      }
    }
    for (const id of ids) {
      if (!meshes.has(id)) {
        const mesh = create();
        meshes.set(id, mesh);
        this.group.add(mesh);
      }
    }
  }
}
```

- [ ] **Step 3: Implementa `src/render/effects.ts`**

```ts
import * as THREE from 'three';
import type { GameState } from '../sim/state';
import { cityPosition } from './cities';
import type { UnitLayer } from './units';

interface Explosion {
  mesh: THREE.Mesh;
  ttl: number;
}

export class EffectsLayer {
  readonly group = new THREE.Group();
  private tracer: THREE.LineSegments;
  private explosions: Explosion[] = [];
  private prevUfoIds = new Set<number>();
  private prevUfoPositions = new Map<number, THREE.Vector3>();

  constructor(scene: THREE.Scene) {
    this.tracer = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.9 }),
    );
    this.group.add(this.tracer);
    scene.add(this.group);
  }

  update(state: GameState, units: UnitLayer): void {
    // traccianti: da ogni città difesa verso gli UFO ingaggiati
    const points: number[] = [];
    if (Math.floor(performance.now() / 120) % 2 === 0) {
      for (const city of state.cities) {
        if (!city.alive) continue;
        const defended = state.squadrons.some(s => s.cityId === city.id && s.transfer === null);
        if (!defended) continue;
        for (const ufo of state.ufos) {
          if (ufo.targetCityId !== city.id) continue;
          const from = cityPosition(city, 1.03);
          const to = units.ufoPosition(ufo.id);
          if (!to) continue;
          points.push(from.x, from.y, from.z, to.x, to.y, to.z);
        }
      }
    }
    this.tracer.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(points, 3),
    );

    // esplosioni: UFO spariti rispetto al frame precedente
    const currentIds = new Set(state.ufos.map(u => u.id));
    for (const id of this.prevUfoIds) {
      if (!currentIds.has(id)) {
        const pos = this.prevUfoPositions.get(id);
        if (pos) this.spawnExplosion(pos);
      }
    }
    this.prevUfoIds = currentIds;
    for (const ufo of state.ufos) {
      const p = units.ufoPosition(ufo.id);
      if (p) this.prevUfoPositions.set(ufo.id, p);
    }

    for (const e of [...this.explosions]) {
      e.ttl--;
      e.mesh.scale.multiplyScalar(1.08);
      (e.mesh.material as THREE.MeshBasicMaterial).opacity *= 0.9;
      if (e.ttl <= 0) {
        this.group.remove(e.mesh);
        this.explosions = this.explosions.filter(x => x !== e);
      }
    }
  }

  private spawnExplosion(position: THREE.Vector3): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffaa33, transparent: true, opacity: 0.9 }),
    );
    mesh.position.copy(position);
    this.explosions.push({ mesh, ttl: 30 });
    this.group.add(mesh);
  }
}
```

- [ ] **Step 4: Aggiorna `src/main.ts` per la verifica visiva con stato reale**

Sostituisci il contenuto con:
```ts
import { cmdBuildSquadron } from './sim/commands';
import { createNewGame } from './sim/state';
import { tick } from './sim/tick';
import { spawnUfo } from './sim/ufos';
import { CityLayer } from './render/cities';
import { EffectsLayer } from './render/effects';
import { createGlobe } from './render/globe';
import { createScene } from './render/scene';
import { UnitLayer } from './render/units';

const state = createNewGame(Date.now() % 100000);
// scenario di prova: difesa e attacco su Roma
state.credits = 9999;
cmdBuildSquadron(state, 'rome');
spawnUfo(state, 'rome');

const ctx = createScene(document.getElementById('scene-container')!);
createGlobe(ctx.scene);
const cityLayer = new CityLayer(ctx.scene, state.cities);
const unitLayer = new UnitLayer(ctx.scene);
const effects = new EffectsLayer(ctx.scene);

let last = performance.now();
let acc = 0;
function frame(now: number) {
  acc += now - last;
  last = now;
  while (acc >= 500) {
    // tick accelerato per la prova visiva
    acc -= 500;
    tick(state);
  }
  cityLayer.update(state, null);
  unitLayer.update(state);
  effects.update(state, unitLayer);
  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```

- [ ] **Step 5: Verifica visiva**

Run: `npm run dev`
Expected: 50 marker città sul globo; su Roma un UFO scende (cono rosso), uno squadrone arancione lo ingaggia con traccianti gialli intermittenti; all'abbattimento un'esplosione arancione che svanisce. Roma è rossa finché sotto attacco.

- [ ] **Step 6: Commit**

```bash
git add src/render/cities.ts src/render/units.ts src/render/effects.ts src/main.ts
git commit -m "feat(render): marker città, unità UFO/squadroni, traccianti ed esplosioni"
```

---

### Task 15: Schermate UI

**Files:**
- Create: `src/ui/format.ts`, `src/ui/hud.ts`, `src/ui/cityPanel.ts`, `src/ui/radar.ts`, `src/ui/endScreen.ts`
- Modify: `src/ui/style.css`

- [ ] **Step 1: Implementa `src/ui/format.ts`**

```ts
import { dateOfTick } from '../sim/calendar';

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('it-IT');
}

export function fmtDate(tick: number): string {
  return dateOfTick(tick).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
```

- [ ] **Step 2: Implementa `src/ui/hud.ts`**

```ts
import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';
import { worldPopulation } from '../sim/state';
import { fmtDate, fmtInt } from './format';

const SPEEDS: Array<0 | 1 | 2 | 4> = [0, 1, 2, 4];

export function createHud(
  root: HTMLElement,
  onSetSpeed: (speed: 0 | 1 | 2 | 4) => void,
  onToggleRadar: () => void,
  onSave: () => void,
): { update(state: GameState): void } {
  root.innerHTML = `
    <span id="hud-date"></span>
    <span id="hud-credits"></span>
    <span id="hud-pop"></span>
    <span id="hud-wave"></span>
    <span id="hud-speeds"></span>
    <button id="hud-radar">Radar</button>
    <button id="hud-save">Salva</button>
  `;
  const speedsEl = root.querySelector('#hud-speeds')!;
  for (const sp of SPEEDS) {
    const btn = document.createElement('button');
    btn.textContent = sp === 0 ? '❚❚' : `${sp}x`;
    btn.dataset.speed = String(sp);
    btn.addEventListener('click', () => onSetSpeed(sp));
    speedsEl.appendChild(btn);
  }
  root.querySelector('#hud-radar')!.addEventListener('click', onToggleRadar);
  root.querySelector('#hud-save')!.addEventListener('click', onSave);

  return {
    update(state: GameState) {
      root.querySelector('#hud-date')!.textContent = fmtDate(state.tick);
      root.querySelector('#hud-credits')!.textContent = `₡ ${fmtInt(state.credits)}`;
      root.querySelector('#hud-pop')!.textContent = `Pop. ${fmtInt(worldPopulation(state))}`;
      const days = Math.max(0, dayOfTick(state.nextWave.arrivalTick) - dayOfTick(state.tick));
      root.querySelector('#hud-wave')!.textContent =
        state.ufos.length > 0 ? '⚠ ATTACCO IN CORSO' : `Prossima ondata: ${days}g`;
      for (const btn of speedsEl.querySelectorAll('button')) {
        btn.classList.toggle('active', Number(btn.dataset.speed) === state.speed);
      }
    },
  };
}
```

- [ ] **Step 3: Implementa `src/ui/cityPanel.ts`**

```ts
import { squadronCost } from '../sim/squadrons';
import type { GameState } from '../sim/state';
import { fmtInt } from './format';

export interface CityPanelCallbacks {
  onBuild(cityId: string): void;
  onStartTransfer(squadronId: number): void;
}

export function createCityPanel(
  root: HTMLElement,
  cb: CityPanelCallbacks,
): { update(state: GameState, selectedCityId: string | null): void } {
  return {
    update(state: GameState, selectedCityId: string | null) {
      const city = state.cities.find(c => c.id === selectedCityId);
      if (!city) {
        root.classList.add('hidden');
        return;
      }
      root.classList.remove('hidden');
      const stationed = state.squadrons.filter(s => s.cityId === city.id && s.transfer === null);
      const inbound = state.squadrons.filter(s => s.cityId === city.id && s.transfer !== null);
      const cost = squadronCost(state, city.id);
      const ufosHere = state.ufos.filter(u => u.targetCityId === city.id).length;
      root.innerHTML = `
        <h2>${city.name} <small>(${city.country})</small></h2>
        <p>Popolazione: <strong>${fmtInt(city.population)}</strong></p>
        ${city.alive ? '' : '<p class="danger">CITTÀ DISTRUTTA</p>'}
        ${ufosHere > 0 ? `<p class="danger">⚠ ${ufosHere} UFO in zona</p>` : ''}
        <h3>Squadroni (${stationed.length})</h3>
        <ul id="squadron-list"></ul>
        ${inbound.length > 0 ? `<p>${inbound.length} in arrivo</p>` : ''}
        <button id="build-btn" ${state.credits < cost || !city.alive ? 'disabled' : ''}>
          Costruisci squadrone (₡ ${fmtInt(cost)})
        </button>
        <p id="panel-error" class="danger"></p>
      `;
      const list = root.querySelector('#squadron-list')!;
      for (const sq of stationed) {
        const li = document.createElement('li');
        li.innerHTML = `Squadrone #${sq.id} — HP ${sq.hp} `;
        const btn = document.createElement('button');
        btn.textContent = 'Trasferisci';
        btn.addEventListener('click', () => cb.onStartTransfer(sq.id));
        li.appendChild(btn);
        list.appendChild(li);
      }
      root.querySelector('#build-btn')!.addEventListener('click', () => cb.onBuild(city.id));
    },
  };
}
```

- [ ] **Step 4: Implementa `src/ui/radar.ts`**

```ts
import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';

const REGION_NAMES: Record<string, string> = {
  asia: 'Asia',
  'middle-east': 'Medio Oriente',
  europe: 'Europa',
  africa: 'Africa',
  'north-america': 'Nord America',
  'south-america': 'Sud America',
  oceania: 'Oceania',
};

export function createRadar(root: HTMLElement): {
  toggle(): void;
  update(state: GameState): void;
} {
  return {
    toggle() {
      root.classList.toggle('hidden');
    },
    update(state: GameState) {
      if (root.classList.contains('hidden')) return;
      const days = Math.max(0, dayOfTick(state.nextWave.arrivalTick) - dayOfTick(state.tick));
      root.innerHTML = `
        <h2>Radar</h2>
        <p>Prossima ondata: <strong>ondata ${state.nextWave.waveNumber}</strong></p>
        <p>Arrivo previsto tra: <strong>${days} giorni</strong></p>
        <p>Forza stimata: <strong>${state.nextWave.ufoCount} UFO</strong></p>
        <p>Regione: <strong>${REGION_NAMES[state.nextWave.region] ?? state.nextWave.region}</strong></p>
        <p>UFO attualmente in zona: <strong>${state.ufos.length}</strong></p>
      `;
    },
  };
}
```

- [ ] **Step 5: Implementa `src/ui/endScreen.ts`**

```ts
import { dayOfTick } from '../sim/calendar';
import type { GameState } from '../sim/state';
import { worldPopulation } from '../sim/state';
import { fmtInt } from './format';

export function createEndScreen(
  root: HTMLElement,
  onNewGame: () => void,
): { update(state: GameState): void } {
  let shown = false;
  return {
    update(state: GameState) {
      if (state.outcome === 'playing') {
        shown = false;
        root.classList.add('hidden');
        return;
      }
      if (shown) return;
      shown = true;
      root.classList.remove('hidden');
      const victory = state.outcome === 'victory';
      root.innerHTML = `
        <div class="end-box">
          <h1>${victory ? 'LA TERRA È SALVA' : 'LA TERRA È CADUTA'}</h1>
          <p>Giorni sopravvissuti: <strong>${dayOfTick(state.tick)}</strong></p>
          <p>Popolazione salvata: <strong>${fmtInt(worldPopulation(state))}</strong></p>
          <p>Popolazione perduta: <strong>${fmtInt(state.stats.populationLost)}</strong></p>
          <p>UFO abbattuti: <strong>${state.stats.ufosShotDown}</strong></p>
          <button id="new-game-btn">Nuova partita</button>
        </div>
      `;
      root.querySelector('#new-game-btn')!.addEventListener('click', onNewGame);
    },
  };
}
```

- [ ] **Step 6: Sostituisci `src/ui/style.css`**

```css
body {
  margin: 0;
  background: #05080f;
  color: #cfe3ff;
  font-family: system-ui, sans-serif;
  overflow: hidden;
}
.hidden { display: none !important; }
#scene-container { position: fixed; inset: 0; }
#hud {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  display: flex;
  gap: 18px;
  align-items: center;
  padding: 8px 14px;
  background: rgba(8, 14, 26, 0.85);
  border-bottom: 1px solid #1d3450;
  font-size: 14px;
}
#hud button, #city-panel button, .end-box button, #start-screen button {
  background: #15263f;
  color: #cfe3ff;
  border: 1px solid #2c4a73;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
}
#hud button.active { background: #2c4a73; }
#hud button:disabled, #city-panel button:disabled { opacity: 0.4; cursor: default; }
#banner {
  position: fixed;
  top: 48px;
  left: 50%;
  transform: translateX(-50%);
  background: #b8860b;
  color: #fff;
  padding: 6px 16px;
  border-radius: 4px;
  z-index: 10;
}
#city-panel, #radar-panel {
  position: fixed;
  top: 56px;
  width: 280px;
  max-height: 70vh;
  overflow-y: auto;
  background: rgba(8, 14, 26, 0.92);
  border: 1px solid #1d3450;
  border-radius: 6px;
  padding: 12px 16px;
  font-size: 14px;
}
#city-panel { right: 12px; }
#radar-panel { left: 12px; }
#city-panel h2, #radar-panel h2 { margin-top: 0; font-size: 16px; }
#city-panel ul { padding-left: 16px; }
.danger { color: #ff5566; }
#end-screen, #start-screen {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(3, 6, 12, 0.85);
  z-index: 20;
}
.end-box, .start-box {
  text-align: center;
  background: #0b1424;
  border: 1px solid #2c4a73;
  border-radius: 8px;
  padding: 28px 48px;
}
.start-box button { margin: 6px; font-size: 16px; padding: 8px 22px; }
```

- [ ] **Step 7: Verifica che compili**

Run: `npx tsc --noEmit`
Expected: nessun errore (i moduli UI non sono ancora collegati a `main.ts`: succede nel Task 16).

- [ ] **Step 8: Commit**

```bash
git add src/ui
git commit -m "feat(ui): HUD, pannello città, radar e schermata di fine"
```

---

### Task 16: Wiring finale in `main.ts` — loop, picking, autosave, start screen

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Sostituisci `src/main.ts` con il wiring completo**

```ts
import * as THREE from 'three';
import { dayOfTick } from './sim/calendar';
import {
  cmdBuildSquadron,
  cmdRelocateSquadron,
  cmdSetSpeed,
  type CommandResult,
} from './sim/commands';
import { deserialize, SAVE_KEY, serialize } from './sim/save';
import { createNewGame, type GameState } from './sim/state';
import { tick } from './sim/tick';
import { CityLayer } from './render/cities';
import { EffectsLayer } from './render/effects';
import { createGlobe } from './render/globe';
import { createScene } from './render/scene';
import { UnitLayer } from './render/units';
import { createCityPanel } from './ui/cityPanel';
import { createEndScreen } from './ui/endScreen';
import { createHud } from './ui/hud';
import { createRadar } from './ui/radar';

// --- stato applicativo ---
let state: GameState;
let selectedCityId: string | null = null;
let transferringSquadronId: number | null = null;
let lastSavedDay = -1;
let lastPanelKey = '';

const banner = document.getElementById('banner')!;

function showCommandError(result: CommandResult): void {
  if (result.ok) return;
  banner.textContent = result.reason;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 2500);
}

// --- scena ---
const ctx = createScene(document.getElementById('scene-container')!);
createGlobe(ctx.scene);
let cityLayer: CityLayer;
const unitLayer = new UnitLayer(ctx.scene);
const effects = new EffectsLayer(ctx.scene);

// --- ui ---
const hud = createHud(
  document.getElementById('hud')!,
  speed => cmdSetSpeed(state, speed),
  () => radar.toggle(),
  () => {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, serialize(state));
    banner.textContent = 'Partita salvata';
    banner.classList.remove('hidden');
    setTimeout(() => banner.classList.add('hidden'), 1500);
  },
);
const radar = createRadar(document.getElementById('radar-panel')!);
const cityPanel = createCityPanel(document.getElementById('city-panel')!, {
  onBuild: cityId => showCommandError(cmdBuildSquadron(state, cityId)),
  onStartTransfer: squadronId => {
    transferringSquadronId = squadronId;
    banner.textContent = 'Seleziona la città di destinazione (Esc per annullare)';
    banner.classList.remove('hidden');
  },
});
const endScreen = createEndScreen(document.getElementById('end-screen')!, () => startNewGame());

// --- picking ---
const raycaster = new THREE.Raycaster();
ctx.renderer.domElement.addEventListener('click', event => {
  if (!cityLayer) return;
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1,
  );
  raycaster.setFromCamera(mouse, ctx.camera);
  const cityId = cityLayer.cityIdAt(raycaster);
  if (!cityId) return;
  if (transferringSquadronId !== null) {
    showCommandError(cmdRelocateSquadron(state, transferringSquadronId, cityId));
    transferringSquadronId = null;
    banner.classList.add('hidden');
  } else {
    selectedCityId = cityId;
  }
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    transferringSquadronId = null;
    selectedCityId = null;
    banner.classList.add('hidden');
  }
});

// --- avvio partita ---
function bootGame(gameState: GameState): void {
  state = gameState;
  selectedCityId = null;
  transferringSquadronId = null;
  lastSavedDay = dayOfTick(state.tick);
  if (cityLayer) ctx.scene.remove(cityLayer.group);
  cityLayer = new CityLayer(ctx.scene, state.cities);
  document.getElementById('start-screen')!.classList.add('hidden');
}

function startNewGame(): void {
  localStorage.removeItem(SAVE_KEY);
  bootGame(createNewGame(Date.now() % 2 ** 31));
}

function setupStartScreen(): void {
  const root = document.getElementById('start-screen')!;
  const savedJson = localStorage.getItem(SAVE_KEY);
  const saved = savedJson ? deserialize(savedJson) : null;
  root.innerHTML = `
    <div class="start-box">
      <h1>EARTH DEFENSE</h1>
      ${saved ? '<button id="continue-btn">Continua</button>' : ''}
      ${savedJson && !saved ? '<p class="danger">Salvataggio non valido o incompatibile</p>' : ''}
      <button id="newgame-btn">Nuova partita</button>
    </div>
  `;
  root.querySelector('#newgame-btn')!.addEventListener('click', startNewGame);
  if (saved) {
    root.querySelector('#continue-btn')!.addEventListener('click', () => bootGame(saved));
  }
}

function autosave(): void {
  const day = dayOfTick(state.tick);
  if (day === lastSavedDay) return;
  lastSavedDay = day;
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch {
    // storage pieno o non disponibile: il gioco continua senza salvare
  }
}

// --- loop principale ---
let last = performance.now();
let acc = 0;
function frame(now: number): void {
  const dt = Math.min(now - last, 1000); // clamp per tab in background
  last = now;
  if (state && state.outcome === 'playing' && state.speed > 0) {
    acc += dt;
    const msPerTick = 3000 / state.speed; // 1x: 1 giorno = 60s = 20 tick
    while (acc >= msPerTick) {
      acc -= msPerTick;
      tick(state);
    }
    autosave();
  }
  if (state) {
    // un errore cosmetico non deve fermare la simulazione né il loop
    try {
      if (selectedCityId && !state.cities.find(c => c.id === selectedCityId)?.alive) {
        selectedCityId = null;
      }
      cityLayer.update(state, selectedCityId);
      unitLayer.update(state);
      effects.update(state, unitLayer);
      hud.update(state);
      radar.update(state);
      // il pannello ha pulsanti: si ricostruisce solo quando i dati cambiano,
      // non a ogni frame, altrimenti i click cadrebbero su elementi distrutti
      const panelKey = `${selectedCityId}:${state.tick}:${state.credits}:${state.squadrons.length}`;
      if (panelKey !== lastPanelKey) {
        lastPanelKey = panelKey;
        cityPanel.update(state, selectedCityId);
      }
      endScreen.update(state);
    } catch (err) {
      console.error('Errore di presentazione:', err);
    }
  }
  ctx.controls.update();
  ctx.renderer.render(ctx.scene, ctx.camera);
  requestAnimationFrame(frame);
}

setupStartScreen();
requestAnimationFrame(frame);
```

- [ ] **Step 2: Verifica che compili e che i test passino**

Run: `npx tsc --noEmit` poi `npm test`
Expected: zero errori TypeScript; tutti i test della simulazione PASS

- [ ] **Step 3: Playtest manuale guidato**

Run: `npm run dev` e verifica questa checklist:
1. Start screen con "Nuova partita"; al click parte il globo con 50 città.
2. HUD mostra data (1 gennaio 2026), crediti (1.000), popolazione, countdown ondata (10–15g).
3. I pulsanti velocità funzionano: a 4x la data avanza visibilmente più in fretta; ❚❚ ferma il tempo (globo ancora navigabile).
4. Click su una città → pannello con popolazione e "Costruisci squadrone"; costruendo, i crediti scendono e appare l'icona arancione.
5. Costruire un secondo squadrone nella stessa città costa di più (750).
6. "Trasferisci" + click su un'altra città → lo squadrone vola lungo l'arco e arriva dopo un tempo proporzionale alla distanza.
7. All'arrivo dell'ondata: UFO rossi scendono sulle città della regione indicata dal radar, le città bersaglio diventano rosse.
8. Dove c'è uno squadrone: traccianti, esplosione, contatore UFO abbattuti che cresce (visibile a fine partita).
9. Dove non c'è difesa: l'UFO atterra, rapisce e riparte; la popolazione mondiale scende di 10.
10. Ricarica la pagina → "Continua" riprende la partita dal giorno corrente; il pulsante "Salva" mostra la conferma "Partita salvata".
11. Radar: pannello con ondata, giorni, forza stimata, regione.
12. Esc chiude pannello/annulla trasferimento.

- [ ] **Step 4: Commit finale**

```bash
git add src/main.ts
git commit -m "feat: wiring completo - loop, picking, autosave, start screen"
```

---

## Verifica finale del piano (dopo il Task 16)

- [ ] `npm test` → tutti PASS
- [ ] `npm run build` → build di produzione senza errori
- [ ] Playtest completo della checklist del Task 16
- [ ] Commit di eventuali fix con messaggi `fix: ...`
