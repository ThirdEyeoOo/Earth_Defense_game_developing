// Catalogo dei "costruibili" COME DATI: veicoli (assemblati e dispiegati come unità) e
// strutture da città (piazzate sulla griglia esagonale degli hardpoint). Modulo della sim
// (niente i18n): i nomi/categorie sono CHIAVI tradotte dalla UI.
//
// La "classe" di un costruibile è il suo `placement`: la tavolozza della griglia città
// mostra solo `placement: 'city'` (non i veicoli né i moduli arma, che si montano sulle
// unità — vedi weapons.ts). La voce compare solo se la relativa funzione è stata sbloccata
// nell'albero della Ricerca (`researchWhat` interrogato con isUnlocked).

import { isUnlocked } from './researchTree';
import type { GameState } from './state';

export type BuildPlacement = 'city' | 'vehicle';

export interface Buildable {
  id: string; // 'f22' | 'tower' | 'lab'
  placement: BuildPlacement;
  researchWhat: string; // funzione sbloccata dal nodo Ricerca ('' = sempre disponibile)
  nameKey: string; // chiave i18n del nome
  catKey: string; // chiave i18n della categoria (sottotitolo card/tavolozza)
  accent: string; // colore d'accento UI (bordo icona, ghost di drag)
  glow: string; // 'r,g,b' per gli aloni
}

export const BUILDABLES: Buildable[] = [
  {
    id: 'f22',
    placement: 'vehicle',
    researchWhat: 'squadron',
    nameKey: 'buildable.f22.name',
    catKey: 'buildable.cat.combat',
    accent: '#7fd0ff',
    glow: '127,208,255',
  },
  {
    id: 'tower',
    placement: 'city',
    researchWhat: 'tower',
    nameKey: 'buildable.tower.name',
    catKey: 'buildable.cat.combat',
    accent: '#ff6a4d',
    glow: '255,84,54',
  },
  {
    id: 'lab',
    placement: 'city',
    researchWhat: 'lab',
    nameKey: 'buildable.lab.name',
    catKey: 'buildable.cat.economy',
    accent: '#6ee7a0',
    glow: '110,231,160',
  },
];

export const buildableById = new Map(BUILDABLES.map(b => [b.id, b] as const));

function available(state: GameState, b: Buildable): boolean {
  return b.researchWhat === '' || isUnlocked(state, b.researchWhat);
}

// veicoli costruibili ORA (ricercati): tavolozza della tab "Assemblaggio veicoli"
export function vehicleCatalog(state: GameState): Buildable[] {
  return BUILDABLES.filter(b => b.placement === 'vehicle' && available(state, b));
}

// strutture da città costruibili ORA (ricercate): tavolozza della griglia esagonale
export function cityStructureCatalog(state: GameState): Buildable[] {
  return BUILDABLES.filter(b => b.placement === 'city' && available(state, b));
}
