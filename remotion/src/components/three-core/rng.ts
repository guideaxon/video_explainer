/** Seeded randomness for three-core. Never use Math.random in scenes or kits: a frame must be reproducible. */

/** mulberry32: a small, fast 32-bit PRNG. Same seed, same sequence, in Node and every browser. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Deterministic hash of two integers to 0..1 (stateless, for per-index variation). */
export const hash01 = (a: number, b: number): number => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** Value in [lo, hi) from a 0..1 sample. */
export const lerpRange = (u: number, [lo, hi]: readonly [number, number]): number => lo + (hi - lo) * u;
