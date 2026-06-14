import type { MessageKey } from '../i18n/it';

// Voci dell'Enciclopedia come dati (pattern di tutorialSteps.ts): aggiungere una
// voce = una riga qui + le due chiavi i18n (titolo e corpo) in it.ts ed en.ts.
export interface EncyclopediaEntry {
  id: string;
  titleKey: MessageKey;
  bodyKey: MessageKey; // valore HTML leggero, iniettato via innerHTML
}

export const ENCYCLOPEDIA_ENTRIES: EncyclopediaEntry[] = [
  { id: 'humt', titleKey: 'enc.humt.title', bodyKey: 'enc.humt.body' },
];
