import turretRaw from '../../Assets/Alieni/Armamenti/plasma-turret.svg?raw';
import minigunRaw from '../../Assets/Umani/Armamenti/minigun-rotante.svg?raw';
import type { WeaponModuleId } from '../sim/weapons';

// Registro RENDER dei moduli arma: mappa l'id (dati, src/sim/weapons.ts) all'asset SVG
// e alle sue animazioni di fuoco. Qui vive tutto il "come si disegna"; le stat di gioco
// (range/rate/danno) staranno in sim/weapons.ts. Aggiungere un'arma = una voce qui + l'id.

// Rapporto di scala UNICO modulo↔UFO, usato sia in finestra di scontro sia sul globo:
// larghezza modulo = TURRET_TO_UFO_WIDTH × larghezza UFO; l'altezza segue l'aspetto
// dell'asset. Tarato sulla taglia approvata (14×24 px su UFO 64×92 px).
export const TURRET_TO_UFO_WIDTH = 0.22;

export interface WeaponModuleArt {
  raw: string; // SVG dell'asset (?raw), iniettato in shadow root / annidato nell'UFO
  viewW: number; // viewBox dell'asset
  viewH: number;
  // Keyframe del fuoco: scoping `.weapon-module.on #…` (NON `.on` nudo) perché sul globo
  // la torretta è annidata dentro l'SVG dell'UFO che usa già `.on` per il raggio.
  fireStyleLoop: string; // ciclo continuo finché `.on` (globo, ingaggiato)
  fireStyleOneShot: string; // un colpo per attivazione di `.on` (finestra di scontro)
}

// keyframe condivise (lo stato a riposo è baked negli attributi dell'asset): differiscono
// solo per la durata/iterazione delle regole `.on`.
const PT_KEYFRAMES = `
@keyframes pt-charge{0%{transform:scale(.7);opacity:.6}55%{transform:scale(1.3);opacity:1}62%{transform:scale(.55);opacity:.95}100%{transform:scale(.7);opacity:.6}}
@keyframes pt-status{0%{opacity:1}100%{opacity:.3}}
@keyframes pt-mglow{0%,40%{opacity:.2}58%{opacity:1}80%{opacity:.3}100%{opacity:.2}}
@keyframes pt-flash{0%,48%{opacity:0;transform:scale(.4)}60%{opacity:1;transform:scale(1.2)}74%{opacity:0;transform:scale(1.45)}100%{opacity:0}}
@keyframes pt-recoil{0%,46%{transform:translateY(0)}60%{transform:translateY(8px)}100%{transform:translateY(0)}}
@keyframes pt-coil{0%{opacity:.2}50%{opacity:1}100%{opacity:.2}}
`;

const PT_FIRE_ONESHOT = `
.weapon-module.on #charge-core{transform-origin:120px 150px;animation:pt-charge .6s ease-in-out}
.weapon-module.on #status-light{animation:pt-status .25s steps(2) 2}
.weapon-module.on #muzzle-glow{transform-origin:120px 330px;animation:pt-mglow .6s ease-in-out}
.weapon-module.on #muzzle-flash{transform-origin:120px 332px;animation:pt-flash .6s ease-out}
.weapon-module.on #recoil{animation:pt-recoil .6s cubic-bezier(.3,0,.2,1)}
.weapon-module.on .coil-orb{animation:pt-coil .6s linear}
${PT_KEYFRAMES}`;

const PT_FIRE_LOOP = `
.weapon-module.on #charge-core{transform-origin:120px 150px;animation:pt-charge 1.2s ease-in-out infinite}
.weapon-module.on #status-light{animation:pt-status .4s steps(2) infinite}
.weapon-module.on #muzzle-glow{transform-origin:120px 330px;animation:pt-mglow 1.2s ease-in-out infinite}
.weapon-module.on #muzzle-flash{transform-origin:120px 332px;animation:pt-flash 1.2s ease-out infinite}
.weapon-module.on #recoil{animation:pt-recoil 1.2s cubic-bezier(.3,0,.2,1) infinite}
.weapon-module.on .coil-orb{animation:pt-coil 1.2s linear infinite}
.weapon-module.on .coil-orb:nth-of-type(2){animation-delay:.13s}
.weapon-module.on .coil-orb:nth-of-type(3){animation-delay:.26s}
.weapon-module.on .coil-orb:nth-of-type(4){animation-delay:.39s}
${PT_KEYFRAMES}`;

// --- minigun rotante del caccia (Assets/Umani/Armamenti) ---
// La culatta #canne_rotanti gira velocissima e #vampa lampeggia sulla volata. Stato a
// riposo baked nell'asset (vampa opacity 0, rotore fermo); `.on` accende il fuoco.
const MG_KEYFRAMES = `
@keyframes mg-spin{to{transform:rotate(360deg)}}
@keyframes mg-flash{0%{opacity:1}55%{opacity:.2}100%{opacity:1}}
`;

const MG_FIRE_LOOP = `
.weapon-module.on #canne_rotanti{transform-origin:32px 37px;animation:mg-spin .1s linear infinite}
.weapon-module.on #vampa{animation:mg-flash .08s linear infinite}
${MG_KEYFRAMES}`;

const MG_FIRE_ONESHOT = `
.weapon-module.on #canne_rotanti{transform-origin:32px 37px;animation:mg-spin .1s linear 6}
.weapon-module.on #vampa{animation:mg-flash .08s linear 7}
${MG_KEYFRAMES}`;

// La torre difensiva ('defense-tower') NON è qui: non è montata su un hardpoint, ha un
// render proprio (render/cityStructures.ts). Quindi il registro è PARZIALE.
export const WEAPON_MODULES: Partial<Record<WeaponModuleId, WeaponModuleArt>> = {
  'plasma-turret': {
    raw: turretRaw,
    viewW: 240,
    viewH: 400,
    fireStyleLoop: PT_FIRE_LOOP,
    fireStyleOneShot: PT_FIRE_ONESHOT,
  },
  minigun: {
    raw: minigunRaw,
    viewW: 64,
    viewH: 116,
    fireStyleLoop: MG_FIRE_LOOP,
    fireStyleOneShot: MG_FIRE_ONESHOT,
  },
};
