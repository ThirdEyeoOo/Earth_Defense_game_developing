// Moduli arma montati sugli hardpoint (data-driven). Per ora esiste solo l'id:
// è il contratto fra dati (quale arma monta un nemico) e render (quale asset/animazione
// disegnare — vedi src/render/weaponModules.ts). Modulo PURO: nessun import.
//
export type WeaponModuleId = 'plasma-turret';

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
};
