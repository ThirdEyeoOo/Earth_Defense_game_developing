import citiesData from '../data/cities.json';
import { CONFIG } from './config';
import { lunarCrossTick } from './orbit';
import type { CityResource } from './resources';
import { emptyStockpile } from './resources';
import type { GameState } from './state';
import { approachDuration, buildOrbit, descentDuration, orbitDuration } from './ufos';

export const SAVE_KEY = 'earth-defense-save';

type Migration = (raw: Record<string, unknown>) => Record<string, unknown>;

// versione → funzione che migra a versione+1
const MIGRATIONS: Record<number, Migration> = {
  // v1 → v2: gli UFO acquisiscono spawnDir (direzione di arrivo dallo spazio).
  // Per quelli già in volo ne sintetizziamo una deterministica dall'id.
  1: raw => {
    const ufos = Array.isArray(raw.ufos) ? (raw.ufos as Record<string, unknown>[]) : [];
    for (const ufo of ufos) {
      if (ufo.spawnDir) continue;
      const id = typeof ufo.id === 'number' ? ufo.id : 0;
      const z = (((id * 0.754) % 1) + 1) % 1 * 2 - 1;
      const theta = id * 2.39996; // angolo aureo: direzioni ben distribuite
      const r = Math.sqrt(Math.max(0, 1 - z * z));
      ufo.spawnDir = { x: r * Math.cos(theta), y: z, z: r * Math.sin(theta) };
    }
    return { ...raw, version: 2 };
  },
  // v2 → v3: nasce il registro eventi e il cumulativo dei rapimenti.
  2: raw => ({
    ...raw,
    events: [],
    nextEventId: 1,
    stats: { ...(raw.stats as Record<string, unknown>), abductedTotal: 0 },
    version: 3,
  }),
  // v3 → v4: rehaul economico HumT. credits→humt 1:1, risorse delle città dal
  // dataset, tutte le città vive collegate (ambasciata), QG assegnato a posteriori.
  3: raw => {
    const cities = Array.isArray(raw.cities) ? (raw.cities as Record<string, unknown>[]) : [];
    const resourcesById = new Map(
      (citiesData as { id: string; resources: CityResource[] }[]).map(c => [c.id, c.resources]),
    );
    for (const city of cities) {
      city.resources = (resourcesById.get(city.id as string) ?? []).map(r => ({ ...r }));
      city.embassy = city.alive === true;
    }
    // QG = città col maggior numero di squadroni; senza squadroni, la viva più popolosa
    const squadrons = Array.isArray(raw.squadrons)
      ? (raw.squadrons as { cityId?: unknown }[])
      : [];
    const counts = new Map<string, number>();
    for (const s of squadrons) {
      if (typeof s.cityId === 'string') counts.set(s.cityId, (counts.get(s.cityId) ?? 0) + 1);
    }
    let hqCityId: string | null = null;
    let bestCount = 0;
    for (const city of cities) {
      const n = counts.get(city.id as string) ?? 0;
      if (n > bestCount) {
        bestCount = n;
        hqCityId = city.id as string;
      }
    }
    if (hqCityId === null) {
      let bestPop = -1;
      for (const city of cities) {
        if (city.alive === true && typeof city.population === 'number' && city.population > bestPop) {
          bestPop = city.population;
          hqCityId = city.id as string;
        }
      }
    }
    const out: Record<string, unknown> = {
      ...raw,
      humt: typeof raw.credits === 'number' ? raw.credits : 0,
      resources: emptyStockpile(),
      hqCityId,
      version: 4,
    };
    delete out.credits;
    return out;
  },
  // v4 → v5: fisica orbitale. Gli UFO acquisiscono orbit/phaseTotalTicks/lunarCrossTick;
  // li ricostruiamo deterministicamente da spawnDir + città bersaglio (lat/lon dal dataset).
  4: raw => {
    const ufos = Array.isArray(raw.ufos) ? (raw.ufos as Record<string, unknown>[]) : [];
    const cityById = new Map(
      (citiesData as { id: string; lat: number; lon: number }[]).map(c => [c.id, c]),
    );
    const phys = CONFIG.physics;
    const u = CONFIG.ufoAbductor;
    const physicalStart = u.startDistanceAu * phys.auInRadii;
    const abductionTicks = u.abductionDays * CONFIG.ticksPerDay;
    for (const ufo of ufos) {
      if (ufo.orbit) continue;
      const sd = ufo.spawnDir as { x: number; y: number; z: number } | undefined;
      const spawnDir = sd ?? { x: 1, y: 0, z: 0 };
      const c = cityById.get(ufo.targetCityId as string);
      const orbit = buildOrbit(spawnDir, { lat: c?.lat ?? 0, lon: c?.lon ?? 0 });
      ufo.orbit = orbit;
      const phase = ufo.phase as string;
      const duration =
        phase === 'approaching'
          ? approachDuration()
          : phase === 'orbiting'
            ? orbitDuration(orbit)
            : phase === 'abducting'
              ? abductionTicks
              : descentDuration(orbit); // descending / escaping
      ufo.phaseTotalTicks = duration;
      // i salvataggi vecchi avevano durate diverse: ricomprimi ticksRemaining nel nuovo range
      const tr = typeof ufo.ticksRemaining === 'number' ? ufo.ticksRemaining : duration;
      ufo.ticksRemaining = Math.max(1, Math.min(tr, duration));
      ufo.lunarCrossTick = lunarCrossTick(physicalStart, phys.lunarDistance, approachDuration());
    }
    return { ...raw, version: 5 };
  },
};

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
  if (
    !Array.isArray(raw.cities) ||
    !Array.isArray(raw.squadrons) ||
    !Array.isArray(raw.ufos) ||
    typeof raw.tick !== 'number' ||
    typeof raw.humt !== 'number'
  ) {
    return null;
  }
  return raw as unknown as GameState;
}
