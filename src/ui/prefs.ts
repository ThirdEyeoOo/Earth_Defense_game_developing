import type { Lang } from '../i18n';

// Preferenze utente, separate dal salvataggio di gioco: sopravvivono alla
// cancellazione della partita e non passano dalle migrazioni dei salvataggi.
export const PREFS_KEY = 'earth-defense-prefs';

export interface Prefs {
  language?: Lang;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export function loadPrefs(storage: StorageLike = localStorage): Prefs {
  try {
    const raw = storage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    const prefs = parsed as Record<string, unknown>;
    return prefs.language === 'it' || prefs.language === 'en'
      ? { language: prefs.language }
      : {};
  } catch {
    return {};
  }
}

export function savePrefs(prefs: Prefs, storage: StorageLike = localStorage): void {
  try {
    storage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // storage pieno o non disponibile: la preferenza vale solo per la sessione
  }
}
