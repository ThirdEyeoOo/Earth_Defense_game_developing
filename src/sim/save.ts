import { CONFIG } from './config';
import type { GameState } from './state';

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
    typeof raw.credits !== 'number'
  ) {
    return null;
  }
  return raw as unknown as GameState;
}
