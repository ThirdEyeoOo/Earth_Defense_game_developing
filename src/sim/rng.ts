export function rngNext(seed: number): { value: number; seed: number } {
  const t = (seed + 0x6d2b79f5) | 0;
  let r = Math.imul(t ^ (t >>> 15), 1 | t);
  r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
  return { value: ((r ^ (r >>> 14)) >>> 0) / 4294967296, seed: t };
}

export function stateRand(state: { seed: number }): number {
  const r = rngNext(state.seed);
  state.seed = r.seed;
  return r.value;
}

export function pickWeighted<T>(
  state: { seed: number },
  items: T[],
  weight: (item: T) => number,
): T {
  const total = items.reduce((sum, it) => sum + weight(it), 0);
  let roll = stateRand(state) * total;
  for (const it of items) {
    roll -= weight(it);
    if (roll <= 0 && weight(it) > 0) return it;
  }
  return items[items.length - 1];
}
