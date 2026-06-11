import { en } from './en';
import { it, type MessageKey } from './it';

// Sistema i18n del gioco. Importabile da ui/ e render/; sim/ NON deve mai
// importarlo (la simulazione resta pura: i comandi restituiscono codici).
// Nessun accesso a DOM o localStorage a import time: usabile nei test node.

export type Lang = 'it' | 'en';
export type { MessageKey };

const DICTS: Record<Lang, Record<MessageKey, string>> = { it, en };

let current: Lang = 'it';
const listeners = new Set<() => void>();

export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const raw = DICTS[current][key] ?? it[key] ?? key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export function getLanguage(): Lang {
  return current;
}

export function setLanguage(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  for (const cb of listeners) cb();
}

export function onLanguageChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getLocale(): 'it-IT' | 'en-US' {
  return current === 'it' ? 'it-IT' : 'en-US';
}

export function detectLanguage(navLang: string): Lang {
  return navLang.toLowerCase().startsWith('it') ? 'it' : 'en';
}

// Chiavi dinamiche da dati di gioco: cast con fallback al dato sim, così un
// id non presente nel dizionario non rompe mai la UI.
export function cityName(id: string, fallback: string): string {
  return (DICTS[current] as Record<string, string>)[`city.${id}`] ?? fallback;
}

export function countryName(itName: string): string {
  return (DICTS[current] as Record<string, string>)[`country.${itName}`] ?? itName;
}

export function regionName(region: string): string {
  return (DICTS[current] as Record<string, string>)[`region.${region}`] ?? region;
}
