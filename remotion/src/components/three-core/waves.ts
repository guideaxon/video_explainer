/**
 * Water surface physics for three-core: a seeded sum of travelling waves plus ripple rings, as pure functions of
 * (x, z, t). The bundle's shaders evaluate the same formulas on the GPU (scene3d/water.ts); these JS versions serve
 * tests, picking and anything the CPU needs. Style-free: no colours here.
 *
 * Waves: h = sum a_i sin(k_i (d_i . x) - w_i t + phi_i), with the gravity-capillary dispersion relation
 *   w^2 = g k + (sigma / rho) k^3,  g = 9.81 m/s^2, sigma / rho = 7.4e-5 m^3/s^2 (clean water).
 * Amplitude from steepness: a = steepness / k (keeps every wave far below breaking, a k << 1).
 *
 * Ripples: a ring wave packet leaving an impact point at group speed c, decaying in time:
 *   h = A e^(-beta tau) exp(-((r - c tau) / w)^2) sin(k (r - c tau)),  tau = t - t0.
 */

import { mulberry32, lerpRange } from "./rng";
import { Pop, Range, DropletSpec } from "./sim";

export const G = 9.81;
export const SURFACE_TENSION_OVER_RHO = 7.4e-5;

export type Wave = { dx: number; dz: number; k: number; amp: number; omega: number; phase: number };
export type WaveSpec = { seed: number; count: number; wavelength: Range; steepness: Range; directionSpread: number; heading: number };
export type Ripple = { x: number; z: number; t0: number; amp: number };
export type RippleSpec = { amp: number; speed: number; width: number; wavelength: number; decay: number; life: number; max: number };

export const omegaFor = (k: number): number => Math.sqrt(G * k + SURFACE_TENSION_OVER_RHO * k * k * k);

/** A seeded wave set: wavelengths spread log-evenly over the range, headings around `heading` (radians). */
export const makeWaves = (s: WaveSpec): Wave[] => {
  const rnd = mulberry32(s.seed);
  const [l0, l1] = s.wavelength;
  return Array.from({ length: s.count }, (_, i) => {
    const lambda = l1 * (l0 / l1) ** (s.count === 1 ? 0 : i / (s.count - 1));
    const k = (2 * Math.PI) / lambda;
    const dir = s.heading + (rnd() * 2 - 1) * s.directionSpread;
    return { dx: Math.cos(dir), dz: Math.sin(dir), k, amp: lerpRange(rnd(), s.steepness) / k, omega: omegaFor(k), phase: rnd() * Math.PI * 2 };
  });
};

/** Height of the wave field (metres above rest). */
export const waveHeight = (waves: readonly Wave[], x: number, z: number, t: number): number => {
  let h = 0;
  for (const w of waves) h += w.amp * Math.sin(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
  return h;
};

/** Gradient (dh/dx, dh/dz) of the wave field: the surface normal is normalize(-gx, 1, -gz). */
export const waveSlope = (waves: readonly Wave[], x: number, z: number, t: number): [number, number] => {
  let gx = 0, gz = 0;
  for (const w of waves) {
    const c = w.amp * w.k * Math.cos(w.k * (w.dx * x + w.dz * z) - w.omega * t + w.phase);
    gx += c * w.dx; gz += c * w.dz;
  }
  return [gx, gz];
};

/** Height of one ripple ring at (x, z), time t. */
export const rippleHeight = (r: Ripple, s: RippleSpec, x: number, z: number, t: number): number => {
  const tau = t - r.t0;
  if (tau < 0 || tau > s.life) return 0;
  const d = Math.hypot(x - r.x, z - r.z) - s.speed * tau;
  return r.amp * Math.exp(-s.decay * tau) * Math.exp(-((d / s.width) ** 2)) * Math.sin(((2 * Math.PI) / s.wavelength) * d);
};

/** Time for a body falling from height y0 with vertical speed vy (linear drag k, gravity g) to reach `level`, or -1. */
export const fallTime = (y0: number, vy: number, level: number, k: number, g: number): number => {
  if (y0 <= level) return 0;
  const kk = Math.max(k, 1e-6), gg = -g;
  const y = (tau: number) => y0 + (gg / kk) * tau + (vy - gg / kk) * (1 - Math.exp(-kk * tau)) / kk;
  let lo = 0, hi = 4;
  if (y(hi) > level) return -1;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (y(m) > level) lo = m; else hi = m; }
  return hi;
};

/**
 * Ripples caused by pops at time t: a bubble that pops on the water rings at once; one that pops above it rings where
 * its spray lands. Newest first, at most `s.max`, only those still alive.
 */
export const ripplesAt = (pops: readonly Pop[], t: number, level: number, d: DropletSpec, s: RippleSpec): Ripple[] => {
  const out: Ripple[] = [];
  for (let i = pops.length - 1; i >= 0 && out.length < s.max; i--) {
    const p = pops[i];
    const fall = p.p[1] - p.r <= level + 0.02 ? 0 : fallTime(p.p[1], p.v[1], level, d.drag, d.gravity);
    if (fall < 0) continue;
    const t0 = p.t + fall;
    if (t < t0 || t - t0 > s.life) continue;
    out.push({ x: p.p[0] + p.v[0] * fall * 0.5, z: p.p[2] + p.v[2] * fall * 0.5, t0, amp: s.amp * (fall === 0 ? 1 : 0.6) * Math.min(1, p.r / 0.12) });
  }
  return out;
};
