// Moduli arma montati sugli hardpoint (data-driven). Per ora esiste solo l'id:
// è il contratto fra dati (quale arma monta un nemico) e render (quale asset/animazione
// disegnare — vedi src/render/weaponModules.ts). Modulo PURO: nessun import.
//
export type WeaponModuleId = 'plasma-turret' | 'minigun';

// Statistiche di gioco di un modulo arma. La cadenza è in MINUTI-GIOCO (il combattimento
// è in tempo reale nel loop di rendering, non più a tick): la sorgente spara quando sono
// trascorsi `cooldownGameMinutes` minuti-gioco. `damage` = danno per colpo (sottratta la
// corazza del bersaglio). `rangeKm` = gittata: l'arma spara solo se il bersaglio è entro
// questa distanza (km reali, vedi measure.ufoSquadronDistanceKm) — così il caccia non
// colpisce l'UFO finché è in orbita/discesa alta. FUTURO: accuratezza/dispersione.
export interface WeaponModule {
  cooldownGameMinutes: number;
  damage: number;
  rangeKm: number;
}

export const WEAPON_STATS: Record<WeaponModuleId, WeaponModule> = {
  'plasma-turret': { cooldownGameMinutes: 2, damage: 8, rangeKm: 50 },
  // minigun del caccia: raffica veloce e leggera (l'opposto del colpo lento/pesante
  // della torretta). 2 minigun/caccia × 4 colpi/min/modulo. Danno per colpo volutamente
  // basso, da tarare a playtest.
  minigun: { cooldownGameMinutes: 0.25, damage: 1, rangeKm: 50 },
};
