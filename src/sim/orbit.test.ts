import { describe, expect, it } from 'vitest';
import {
  altitudeAt,
  computeCaptureSweep,
  cruiseTicks,
  freefallTicks,
  lunarCrossTick,
  orbitPhaseTicks,
  orbitalPeriodTicks,
  positionAt,
  type OrbitalParams,
  type Vec3,
} from './orbit';

function norm(v: Vec3): Vec3 {
  const l = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / l, y: v.y / l, z: v.z / l };
}

const params: OrbitalParams = {
  spawnDir: norm({ x: 1, y: 0.3, z: -0.2 }),
  cityDir: norm({ x: 0.2, y: 1, z: 0.1 }),
  startDistance: 8,
  orbitRadius: 1.6,
  surfaceRadius: 1.02,
  orbits: 3,
  mu: 1,
  aThrust: 0.05,
  captureSweep: 0, // ricalcolata nei test che ne hanno bisogno
};

function expectVecClose(a: Vec3, b: Vec3, digits = 6): void {
  expect(a.x).toBeCloseTo(b.x, digits);
  expect(a.y).toBeCloseTo(b.y, digits);
  expect(a.z).toBeCloseTo(b.z, digits);
}

describe('cruiseTicks (flip-and-burn)', () => {
  it('è un intero positivo', () => {
    const t = cruiseTicks(100, 0.05);
    expect(t).toBeGreaterThan(0);
    expect(Number.isInteger(t)).toBe(true);
  });

  it('scala come √distanza: 2× distanza ⇒ ~1,41× tempo', () => {
    const t1 = cruiseTicks(10000, 0.05);
    const t2 = cruiseTicks(20000, 0.05);
    expect(t2 / t1).toBeCloseTo(Math.SQRT2, 1);
  });
});

describe('orbitalPeriodTicks (Keplero)', () => {
  it('cresce con la quota d’orbita', () => {
    expect(orbitalPeriodTicks(8, 1)).toBeGreaterThan(orbitalPeriodTicks(2, 1));
  });

  it('rispetta T ∝ a^1.5 (quota 4× ⇒ periodo 8×)', () => {
    const ratio = orbitalPeriodTicks(8, 1) / orbitalPeriodTicks(2, 1);
    expect(ratio).toBeCloseTo(8, 0);
  });
});

describe('freefallTicks (caduta sotto gravità)', () => {
  it('è finito e positivo', () => {
    const t = freefallTicks(1.6, 1.02, 1);
    expect(t).toBeGreaterThan(0);
    expect(Number.isFinite(t)).toBe(true);
  });

  it('cresce con la distanza di caduta', () => {
    const corto = freefallTicks(1.6, 1.4, 1);
    const lungo = freefallTicks(1.6, 1.02, 1);
    expect(lungo).toBeGreaterThan(corto);
  });
});

describe('positionAt — continuità ai bordi di fase', () => {
  it('avvicinamento(1) = orbita(0) (punto di inserimento)', () => {
    expectVecClose(positionAt('approaching', 1, params), positionAt('orbiting', 0, params));
  });

  it('orbita(1) = discesa(0) (sopra la città)', () => {
    expectVecClose(positionAt('orbiting', 1, params), positionAt('descending', 0, params));
  });

  it('discesa(1) = rapimento (in superficie)', () => {
    expectVecClose(positionAt('descending', 1, params), positionAt('abducting', 0.5, params));
  });

  it('rapimento = fuga(0) (in superficie)', () => {
    expectVecClose(positionAt('abducting', 0.5, params), positionAt('escaping', 0, params));
  });

  it('fuga(1) = orbita(1) (di nuovo sopra la città)', () => {
    expectVecClose(positionAt('escaping', 1, params), positionAt('orbiting', 1, params));
  });
});

describe('altitudeAt', () => {
  it('estremi coerenti per ogni fase', () => {
    expect(altitudeAt('approaching', 0, params)).toBeCloseTo(8, 6);
    expect(altitudeAt('approaching', 1, params)).toBeCloseTo(1.6, 6);
    expect(altitudeAt('orbiting', 0.5, params)).toBeCloseTo(1.6, 6);
    expect(altitudeAt('descending', 0, params)).toBeCloseTo(1.6, 6);
    expect(altitudeAt('descending', 1, params)).toBeCloseTo(1.02, 6);
    expect(altitudeAt('abducting', 0.7, params)).toBeCloseTo(1.02, 6);
    expect(altitudeAt('escaping', 0, params)).toBeCloseTo(1.02, 6);
    expect(altitudeAt('escaping', 1, params)).toBeCloseTo(1.6, 6);
  });

  it('la discesa cala in modo monotono', () => {
    expect(altitudeAt('descending', 0.25, params)).toBeGreaterThan(
      altitudeAt('descending', 0.75, params),
    );
  });

  it('l’avvicinamento cala in modo monotono', () => {
    expect(altitudeAt('approaching', 0.25, params)).toBeGreaterThan(
      altitudeAt('approaching', 0.75, params),
    );
  });

  it('l’avvicinamento ACCELERA entrando (più quota persa nel tratto vicino alla Terra)', () => {
    // distanza radiale coperta in un intervallo tardivo > in uno iniziale di pari ampiezza
    const early = altitudeAt('approaching', 0.1, params) - altitudeAt('approaching', 0.3, params);
    const late = altitudeAt('approaching', 0.6, params) - altitudeAt('approaching', 0.8, params);
    expect(late).toBeGreaterThan(early);
  });

  it('la fuga ACCELERA salendo (più quota guadagnata verso la fine)', () => {
    // parte da fermo in superficie e accelera: guadagno di quota crescente nel tempo
    const early = altitudeAt('escaping', 0.3, params) - altitudeAt('escaping', 0.1, params);
    const late = altitudeAt('escaping', 0.8, params) - altitudeAt('escaping', 0.6, params);
    expect(late).toBeGreaterThan(early);
  });
});

describe('lunarCrossTick (tasto >>>)', () => {
  it('è un intero nel range [0, cruiseTotal]', () => {
    const t = lunarCrossTick(23482, 60, 56);
    expect(Number.isInteger(t)).toBe(true);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(56);
  });

  it('per una soglia lunare lontana dalla partenza, l’attraversamento è quasi a fine crociera', () => {
    // lunare (60) ≪ partenza (23482): si attraversa nell’ultimissimo tratto (decel)
    expect(lunarCrossTick(23482, 60, 56)).toBeGreaterThan(50);
  });

  it('se la soglia è oltre la partenza, l’attraversamento è al tick 0', () => {
    expect(lunarCrossTick(40, 60, 56)).toBe(0);
  });

  it('soglia più vicina ⇒ attraversamento più tardi (monotono)', () => {
    expect(lunarCrossTick(1000, 100, 60)).toBeLessThan(lunarCrossTick(1000, 50, 60));
  });
});

describe('continuità di velocità avvicinamento→orbita (niente scatto)', () => {
  it('il vettore velocità a fine avvicinamento ≈ quello a inizio orbita', () => {
    const cruise = 56;
    const p = { ...params, captureSweep: computeCaptureSweep(params, cruise) };
    const ot = orbitPhaseTicks(p); // durata reale della fase d'orbita
    const h = 0.001;
    const aEnd = positionAt('approaching', 1, p);
    const aPrev = positionAt('approaching', 1 - h / cruise, p);
    const oStart = positionAt('orbiting', 0, p);
    const oNext = positionAt('orbiting', h / ot, p);
    const va = { x: (aEnd.x - aPrev.x) / h, y: (aEnd.y - aPrev.y) / h, z: (aEnd.z - aPrev.z) / h };
    const vo = {
      x: (oNext.x - oStart.x) / h,
      y: (oNext.y - oStart.y) / h,
      z: (oNext.z - oStart.z) / h,
    };
    // stesso passo angolare per tick ⇒ velocità tangenziale coincidente
    expect(va.x).toBeCloseTo(vo.x, 1);
    expect(va.y).toBeCloseTo(vo.y, 1);
    expect(va.z).toBeCloseTo(vo.z, 1);
    // e dev'essere non nulla (non si ferma)
    expect(Math.hypot(va.x, va.y, va.z)).toBeGreaterThan(0.1);
  });
});

describe('continuità di velocità orbita→discesa e discesa→hover', () => {
  it('a inizio discesa la velocità ≈ quella di fine orbita (niente scatto)', () => {
    const p = { ...params, captureSweep: computeCaptureSweep(params, 56) };
    const Porb = orbitPhaseTicks(p);
    const Tf = freefallTicks(p.orbitRadius, p.surfaceRadius, p.mu);
    const h = 0.001;
    const oEnd = positionAt('orbiting', 1, p);
    const oPrev = positionAt('orbiting', 1 - h / Porb, p);
    const dStart = positionAt('descending', 0, p);
    const dNext = positionAt('descending', h / Tf, p);
    // velocità per-tick (passo h/ticks, diviso h) su entrambi i lati del bordo
    const vo = { x: (oEnd.x - oPrev.x) / h, y: (oEnd.y - oPrev.y) / h, z: (oEnd.z - oPrev.z) / h };
    const vd = { x: (dNext.x - dStart.x) / h, y: (dNext.y - dStart.y) / h, z: (dNext.z - dStart.z) / h };
    expect(vd.x).toBeCloseTo(vo.x, 1);
    expect(vd.y).toBeCloseTo(vo.y, 1);
    expect(vd.z).toBeCloseTo(vo.z, 1);
    expect(Math.hypot(vo.x, vo.y, vo.z)).toBeGreaterThan(0.1); // non si ferma all'ingresso
  });

  it('a fine discesa la velocità ≈ 0 (atterraggio dolce sull’hover)', () => {
    const Tf = freefallTicks(params.orbitRadius, params.surfaceRadius, params.mu);
    const h = 0.001;
    const end = positionAt('descending', 1, params);
    const prev = positionAt('descending', 1 - h / Tf, params);
    const v = Math.hypot((end.x - prev.x) / h, (end.y - prev.y) / h, (end.z - prev.z) / h);
    expect(v).toBeLessThan(0.2);
  });

  it('a inizio fuga la velocità ≈ 0 (parte da fermo) e a fine fuga è > 0 (accelera via)', () => {
    const Tf = freefallTicks(params.orbitRadius, params.surfaceRadius, params.mu);
    const h = 0.001;
    const start = positionAt('escaping', 0, params);
    const next = positionAt('escaping', h / Tf, params);
    const vStart = Math.hypot(
      (next.x - start.x) / h,
      (next.y - start.y) / h,
      (next.z - start.z) / h,
    );
    const end = positionAt('escaping', 1, params);
    const prev = positionAt('escaping', 1 - h / Tf, params);
    const vEnd = Math.hypot((end.x - prev.x) / h, (end.y - prev.y) / h, (end.z - prev.z) / h);
    expect(vStart).toBeLessThan(0.2); // parte da fermo
    expect(vEnd).toBeGreaterThan(vStart); // accelera salendo
  });
});

describe('determinismo', () => {
  it('stessi parametri ⇒ stessa posizione', () => {
    expectVecClose(positionAt('orbiting', 0.37, params), positionAt('orbiting', 0.37, params), 12);
  });
});
