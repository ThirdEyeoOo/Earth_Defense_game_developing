// Fisica orbitale condivisa sim↔render. Modulo PURO: nessun import esterno
// (niente Three.js, niente i18n), ritorni plain {x,y,z}. È l'unica fonte di
// verità della traiettoria dei nemici — la sim deriva durate/soglie (in tick
// interi, deterministici), il render disegna la posizione continua.
//
// Modello ibrido (l'UFO ha i motori):
//  - avvicinamento: crociera flip-and-burn (spinta costante, accelera fino a
//    metà tragitto poi decelera) lungo spawnDir, dallo spazio profondo alla quota
//    d'orbita;
//  - orbita: rotazione attorno all'asse del piano (spawnDir×cityDir) per N giri
//    più l'arco residuo, terminando esattamente sopra la città;
//  - discesa: caduta radiale sotto gravità 1/r² (accelera) fino alla superficie;
//  - rapimento: hover propulso fermo in superficie;
//  - fuga: salita radiale propulsa, decelerata (specchio della discesa).
import type { UfoPhase } from './state';

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface OrbitalParams {
  spawnDir: Vec3; // direzione di arrivo dallo spazio profondo (unitaria)
  cityDir: Vec3; // direzione della città bersaglio (unitaria)
  startDistance: number; // quota di comparsa (raggi dal centro)
  orbitRadius: number; // quota dell'orbita di parcheggio (raggi)
  surfaceRadius: number; // quota di hover in superficie (raggi)
  orbits: number; // numero di giri completi prima della discesa
  mu: number; // parametro gravitazionale G·M (raggi³/tick²)
  aThrust: number; // accelerazione di spinta F/m (raggi/tick²)
  captureSweep: number; // angolo (rad) della virata di cattura: l'avvicinamento arriva TANGENTE all'orbita, con velocità che combacia (continuità C1). Precalcolato (vedi computeCaptureSweep).
}

// --- algebra vettoriale minima ---
function scale(v: Vec3, k: number): Vec3 {
  return { x: v.x * k, y: v.y * k, z: v.z * k };
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}
function len(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}
function normalize(v: Vec3): Vec3 {
  const l = len(v);
  return l < 1e-12 ? { x: 0, y: 0, z: 0 } : scale(v, 1 / l);
}
function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// rotazione di v attorno ad axis (unitario) di angle (Rodrigues)
function rotateAroundAxis(v: Vec3, axis: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const k = dot(axis, v) * (1 - c);
  const cr = cross(axis, v);
  return {
    x: v.x * c + cr.x * s + axis.x * k,
    y: v.y * c + cr.y * s + axis.y * k,
    z: v.z * c + cr.z * s + axis.z * k,
  };
}

// asse del piano orbitale, con fallback se spawn e città sono (anti)allineati
function orbitalAxis(spawnDir: Vec3, cityDir: Vec3): Vec3 {
  let axis = cross(spawnDir, cityDir);
  if (len(axis) < 1e-6) {
    const helper: Vec3 =
      Math.abs(spawnDir.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    axis = cross(spawnDir, helper);
  }
  return normalize(axis);
}

// angolo con segno da `from` a `to` attorno ad `axis` (nel piano ⊥ axis)
function angleAround(from: Vec3, to: Vec3, axis: Vec3): number {
  const fp = normalize(sub(from, scale(axis, dot(from, axis))));
  const tp = normalize(sub(to, scale(axis, dot(to, axis))));
  const angle = Math.acos(clamp(dot(fp, tp), -1, 1));
  return dot(cross(fp, tp), axis) < 0 ? -angle : angle;
}

// --- tempi fisici (in tick, raw float) ---

// crociera flip-and-burn: accelera a `aThrust` fino a metà, poi decelera.
// distanza = aThrust·(T/2)²  ⇒  T = 2·√(distanza / aThrust)
export function cruiseTime(distance: number, aThrust: number): number {
  return 2 * Math.sqrt(distance / aThrust);
}

// caduta radiale da fermo da `from` a `to` (to<from) sotto gravità 1/r².
// Forma chiusa dell'ellisse degenere:
//   t = √(from³/2μ) · ( arccos√(to/from) + √( (to/from)(1−to/from) ) )
export function freefallTime(from: number, to: number, mu: number): number {
  const ratio = clamp(to / from, 0, 1);
  return (
    Math.sqrt((from * from * from) / (2 * mu)) *
    (Math.acos(Math.sqrt(ratio)) + Math.sqrt(ratio * (1 - ratio)))
  );
}

// periodo orbitale (terza legge di Keplero): T = 2π·√(a³/μ)
export function orbitalPeriodTime(orbitRadius: number, mu: number): number {
  return 2 * Math.PI * Math.sqrt((orbitRadius * orbitRadius * orbitRadius) / mu);
}

// --- durate di fase in tick interi (deterministiche) ---
export function cruiseTicks(distance: number, aThrust: number): number {
  return Math.max(1, Math.ceil(cruiseTime(distance, aThrust)));
}
export function orbitalPeriodTicks(orbitRadius: number, mu: number): number {
  return Math.max(1, Math.ceil(orbitalPeriodTime(orbitRadius, mu)));
}
export function freefallTicks(from: number, to: number, mu: number): number {
  return Math.max(1, Math.ceil(freefallTime(from, to, mu)));
}

// angolo totale spazzato dall'orbita: N giri interi + arco residuo verso la città
function orbitTotalAngle(spawnDir: Vec3, cityDir: Vec3, orbits: number): number {
  const axis = orbitalAxis(spawnDir, cityDir);
  return orbits * 2 * Math.PI + angleAround(spawnDir, cityDir, axis);
}

// durata dell'intera fase orbitale: periodo × (giri interi + arco residuo verso la città)
export function orbitPhaseTicks(p: OrbitalParams): number {
  const total = orbitTotalAngle(normalize(p.spawnDir), normalize(p.cityDir), p.orbits);
  return Math.max(1, Math.ceil(orbitalPeriodTime(p.orbitRadius, p.mu) * (total / (2 * Math.PI))));
}

// Angolo della virata di cattura: scelto perché la velocità angolare a FINE
// avvicinamento eguagli quella orbitale → l'UFO entra in orbita TANGENTE e senza
// scatti (continuità di velocità). Dipende dalla durata di crociera (in tick).
const CAPTURE_FRACTION = 0.08; // ultima frazione dell'avvicinamento dedicata alla virata
export function computeCaptureSweep(p: OrbitalParams, cruiseTicks: number): number {
  const total = orbitTotalAngle(normalize(p.spawnDir), normalize(p.cityDir), p.orbits);
  const omega = total / orbitPhaseTicks(p); // velocità angolare orbitale (rad/tick)
  return (omega * cruiseTicks * CAPTURE_FRACTION) / 2;
}

// --- profili di quota per fase (progress ∈ [0,1]) ---

// flip-and-burn: frazione di distanza percorsa nel tempo (accel/decel simmetrico)
function flipBurnFraction(progress: number): number {
  const p = clamp(progress, 0, 1);
  return p < 0.5 ? 2 * p * p : 1 - 2 * (1 - p) * (1 - p);
}

// angolo durante l'avvicinamento: dritto in arrivo (−sweep) fino all'ultima
// CAPTURE_FRACTION, poi vira fino a 0 con velocità angolare crescente (rampa τ²)
// che a fine fase eguaglia quella orbitale → handoff tangente e fluido
function approachAngle(progress: number, sweep: number): number {
  const start = 1 - CAPTURE_FRACTION;
  if (progress <= start) return -sweep;
  const tau = (progress - start) / CAPTURE_FRACTION;
  return -sweep * (1 - tau * tau);
}

// inverso di flipBurnFraction: progresso temporale a cui si è percorsa la frazione f
function flipBurnProgress(fraction: number): number {
  const f = clamp(fraction, 0, 1);
  return f < 0.5 ? Math.sqrt(f / 2) : 1 - Math.sqrt((1 - f) / 2);
}

// Tick (entro la crociera) in cui la distanza residua dalla Terra scende sotto
// `lunarDistance` (entrambe FISICHE, in raggi). Serve al tasto ">>>": a 1000x si
// torna a 1x quando il primo UFO incrocia la distanza lunare. Intero deterministico.
export function lunarCrossTick(
  physicalDistance: number,
  lunarDistance: number,
  cruiseTotalTicks: number,
): number {
  if (lunarDistance >= physicalDistance) return 0;
  const traveled = (physicalDistance - lunarDistance) / physicalDistance;
  const p = flipBurnProgress(traveled);
  return Math.min(cruiseTotalTicks, Math.round(p * cruiseTotalTicks));
}

// inverte freefallTime: raggio raggiunto dopo un tempo `t` di caduta da `from`
function radiusAtFallTime(from: number, to: number, mu: number, t: number): number {
  let lo = to; // raggio minore (più tempo trascorso)
  let hi = from; // raggio maggiore (t=0)
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (freefallTime(from, mid, mu) < t) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

export function altitudeAt(phase: UfoPhase, progress: number, p: OrbitalParams): number {
  switch (phase) {
    case 'approaching':
      return p.startDistance + (p.orbitRadius - p.startDistance) * flipBurnFraction(progress);
    case 'orbiting':
      return p.orbitRadius;
    case 'descending': {
      const total = freefallTime(p.orbitRadius, p.surfaceRadius, p.mu);
      return radiusAtFallTime(p.orbitRadius, p.surfaceRadius, p.mu, clamp(progress, 0, 1) * total);
    }
    case 'abducting':
      return p.surfaceRadius;
    case 'escaping': {
      // specchio della discesa: salita decelerata
      const total = freefallTime(p.orbitRadius, p.surfaceRadius, p.mu);
      return radiusAtFallTime(
        p.orbitRadius,
        p.surfaceRadius,
        p.mu,
        (1 - clamp(progress, 0, 1)) * total,
      );
    }
  }
}

export function positionAt(phase: UfoPhase, progress: number, p: OrbitalParams): Vec3 {
  const spawnDir = normalize(p.spawnDir);
  const cityDir = normalize(p.cityDir);

  if (phase === 'approaching') {
    // spirale di cattura: scende di quota (flip-burn) e vira per arrivare tangente
    const axis = orbitalAxis(spawnDir, cityDir);
    const ang = approachAngle(clamp(progress, 0, 1), p.captureSweep);
    return scale(rotateAroundAxis(spawnDir, axis, ang), altitudeAt('approaching', progress, p));
  }

  if (phase === 'orbiting') {
    const axis = orbitalAxis(spawnDir, cityDir);
    const totalAngle = orbitTotalAngle(spawnDir, cityDir, p.orbits);
    return scale(rotateAroundAxis(spawnDir, axis, totalAngle * clamp(progress, 0, 1)), p.orbitRadius);
  }

  // descending / abducting / escaping: radiale lungo la verticale della città
  return scale(cityDir, altitudeAt(phase, progress, p));
}
