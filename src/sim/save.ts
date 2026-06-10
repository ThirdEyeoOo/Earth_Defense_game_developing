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
