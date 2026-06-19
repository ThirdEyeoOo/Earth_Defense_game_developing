// Moduli arma montati sugli hardpoint (data-driven). Per ora esiste solo l'id:
// è il contratto fra dati (quale arma monta un nemico) e render (quale asset/animazione
// disegnare — vedi src/render/weaponModules.ts). Modulo PURO: nessun import.
//
export type WeaponModuleId = 'plasma-turret' | 'minigun';

// Statistiche di gioco di un modulo arma. La cadenza è in MINUTI-GIOCO (il combattimento
// è in tempo reale nel loop di rendering, non più a tick): la sorgente spara quando sono
// trascorsi `cooldownGameMinutes` minuti-gioco. `damage` = danno per colpo (sottratta la
// corazza del bersaglio). FUTURO: `range` (gating del fuoco per distanza), accuratezza.
export interface WeaponModule {
  cooldownGameMinutes: number;
  damage: number;
}

export const WEAPON_STATS: Record<WeaponModuleId, WeaponModule> = {
  'plasma-turret': { cooldownGameMinutes: 2, damage: 15 },
  // minigun del caccia: raffica veloce e leggera (l'opposto del colpo lento/pesante
  // della torretta). 2 minigun/caccia × 8 danni/0,25 min ≈ 64 danni/min → UFO 500 HP
  // abbattibile in ~8 min-gioco di ingaggio. Valori iniziali, da tarare a playtest.
  minigun: { cooldownGameMinutes: 0.25, damage: 8 },
};
