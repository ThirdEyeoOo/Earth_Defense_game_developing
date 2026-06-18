// Fisica orbitale condivisa sim↔render. Modulo PURO: nessun import esterno
// (niente Three.js, niente i18n), ritorni plain {x,y,z}. È l'unica fonte di
// verità della traiettoria dei nemici — la sim deriva durate/soglie (in tick
// interi, deterministici), il render disegna la posizione continua.
//
// Modello (l'UFO ha i motori), a VELOCITÀ CONTINUA (C1) a ogni bordo di fase:
//  - avvicinamento: arriva GIÀ in moto (profilo radiale ease-out, niente partenza
//    da fermo), frena radialmente e vira nell'ultimo tratto per inserirsi TANGENTE
//    all'orbita con la stessa velocità angolare (nessuno scatto);
//  - orbita: rotazione attorno all'asse del piano (spawnDir×cityDir); spazza T−Δ
//    (Δ = arco che completerà la discesa), così l'orbita "lascia" l'ultimo tratto
//    alla spirale di discesa;
//  - discesa: SPIRALE che decelera (deorbit) — parte a velocità orbitale, perde
//    quota e velocità tangenziale e atterra ESATTAMENTE sopra la città a velocità ~0;
//  - rapimento: hover propulso fermo in superficie;
//  - fuga: specchio della discesa (spirale che risale accelerando).
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
  captureSweep: number; // angolo (rad) della virata di cattura: l'avvicinamento arriva TANGENTE all'orbita, con velocità angolare che combacia (continuità C1). Precalcolato (vedi computeCaptureSweep).
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
// smoothstep 0→1 con derivata nulla agli estremi (per quota/spirale C1)
function smoothstep01(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
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

// durata della crociera d'avvicinamento (heuristica): T = 2·√(distanza / aThrust)
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

// Angolo geometrico totale dell'orbita: N giri interi + arco residuo che porta da
// spawnDir a cityDir. È l'angolo che, ruotando spawnDir, "atterra" su cityDir.
function geometricOrbitAngle(spawnDir: Vec3, cityDir: Vec3, orbits: number): number {
  const axis = orbitalAxis(spawnDir, cityDir);
  return orbits * 2 * Math.PI + angleAround(spawnDir, cityDir, axis);
}

// durata dell'intera fase orbitale: periodo × (giri interi + arco residuo verso la città)
export function orbitPhaseTicks(p: OrbitalParams): number {
  const total = geometricOrbitAngle(normalize(p.spawnDir), normalize(p.cityDir), p.orbits);
  return Math.max(1, Math.ceil(orbitalPeriodTime(p.orbitRadius, p.mu) * (total / (2 * Math.PI))));
}

// Arco Δ spazzato dalla SPIRALE di discesa. Scelto perché la spirale parta esattamente
// alla velocità angolare reale dell'orbita (continuità C1 orbita→discesa) e l'orbita
// finisca Δ prima della città, così la discesa completa l'ultimo arco e atterra su cityDir.
// Dalla condizione 2Δ/Tf = (T−Δ)/Porb ⇒ Δ = T·Tf / (2·Porb + Tf).
function descentSweep(p: OrbitalParams): number {
  const T = geometricOrbitAngle(normalize(p.spawnDir), normalize(p.cityDir), p.orbits);
  const Porb = orbitPhaseTicks(p);
  const Tf = freefallTicks(p.orbitRadius, p.surfaceRadius, p.mu);
  return (T * Tf) / (2 * Porb + Tf);
}

// arco effettivamente spazzato dall'orbita = T − Δ (l'ultimo Δ lo fa la discesa)
function orbitSweptAngle(p: OrbitalParams): number {
  return geometricOrbitAngle(normalize(p.spawnDir), normalize(p.cityDir), p.orbits) - descentSweep(p);
}

// velocità angolare REALE dell'orbita (rad/tick): (T−Δ)/Porb
function orbitAngularSpeed(p: OrbitalParams): number {
  return orbitSweptAngle(p) / orbitPhaseTicks(p);
}

// Angolo della virata di cattura: scelto perché la velocità angolare a FINE
// avvicinamento eguagli quella ORBITALE REALE (ω = (T−Δ)/Porb) → l'UFO entra in
// orbita tangente e senza scatti. Dipende dalla durata di crociera (in tick).
const CAPTURE_FRACTION = 0.08; // ultima frazione dell'avvicinamento dedicata alla virata
export function computeCaptureSweep(p: OrbitalParams, cruiseTicks: number): number {
  return (orbitAngularSpeed(p) * cruiseTicks * CAPTURE_FRACTION) / 2;
}

// --- profili di quota per fase (progress ∈ [0,1]) ---

// avvicinamento: frazione di distanza percorsa nel tempo. Ease-out (s'(0)=2 → parte
// in MOTO, non da fermo; s'(1)=0 → velocità radiale nulla all'orbita = tangente).
function approachRadialFraction(progress: number): number {
  const p = clamp(progress, 0, 1);
  return p * (2 - p);
}

// inverso di approachRadialFraction: progresso a cui si è percorsa la frazione f
function approachRadialProgress(fraction: number): number {
  const f = clamp(fraction, 0, 1);
  return 1 - Math.sqrt(1 - f);
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
  const p = approachRadialProgress(traveled);
  return Math.min(cruiseTotalTicks, Math.round(p * cruiseTotalTicks));
}

export function altitudeAt(phase: UfoPhase, progress: number, p: OrbitalParams): number {
  switch (phase) {
    case 'approaching':
      return p.startDistance + (p.orbitRadius - p.startDistance) * approachRadialFraction(progress);
    case 'orbiting':
      return p.orbitRadius;
    case 'descending':
      // spirale di discesa: quota smoothstep orbita→superficie (radiale nullo agli estremi)
      return p.orbitRadius + (p.surfaceRadius - p.orbitRadius) * smoothstep01(progress);
    case 'abducting':
      return p.surfaceRadius;
    case 'escaping':
      // specchio della discesa: risalita superficie→orbita
      return p.orbitRadius + (p.surfaceRadius - p.orbitRadius) * smoothstep01(1 - progress);
  }
}

export function positionAt(phase: UfoPhase, progress: number, p: OrbitalParams): Vec3 {
  const spawnDir = normalize(p.spawnDir);
  const cityDir = normalize(p.cityDir);

  if (phase === 'approaching') {
    // spirale di cattura: scende di quota (ease-out) e vira per arrivare tangente
    const axis = orbitalAxis(spawnDir, cityDir);
    const ang = approachAngle(clamp(progress, 0, 1), p.captureSweep);
    return scale(rotateAroundAxis(spawnDir, axis, ang), altitudeAt('approaching', progress, p));
  }

  if (phase === 'orbiting') {
    const axis = orbitalAxis(spawnDir, cityDir);
    const swept = orbitSweptAngle(p); // T − Δ (l'ultimo Δ lo completa la discesa)
    return scale(rotateAroundAxis(spawnDir, axis, swept * clamp(progress, 0, 1)), p.orbitRadius);
  }

  if (phase === 'descending' || phase === 'escaping') {
    // spirale nel piano orbitale: angolo da (T−Δ) verso T, quota smoothstep.
    // g(τ)=2τ−τ²: g'(0)=2 → rate iniziale = ω (C1 con orbita), g'(1)=0 → rate finale 0.
    const axis = orbitalAxis(spawnDir, cityDir);
    const swept = orbitSweptAngle(p);
    const delta = descentSweep(p);
    const tau = phase === 'descending' ? clamp(progress, 0, 1) : 1 - clamp(progress, 0, 1);
    const ang = swept + delta * (2 * tau - tau * tau);
    return scale(rotateAroundAxis(spawnDir, axis, ang), altitudeAt(phase, progress, p));
  }

  // abducting: hover radiale ESATTO sulla verticale della città
  return scale(cityDir, altitudeAt(phase, progress, p));
}
