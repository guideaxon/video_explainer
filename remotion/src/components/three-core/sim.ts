/**
 * three-core fixed-step simulation: spherical bodies (bubbles, balloons, floats) under gravity, buoyancy, quadratic
 * drag and a divergence-free breeze, kept apart by soft separation, inside a box. Bodies pop on a lifetime, on a ray
 * (a tap), on the box walls, or when the body cap retires the oldest. A pop emits droplets whose paths are closed-form,
 * so they cost nothing to store and are exact at any time.
 *
 * Pure TypeScript, no three.js and no DOM: the same code runs in the Node bake (scripts/three_core_bake_sim.mjs) and
 * in the live page. Determinism: fixed step (time.ts), seeded RNG, fixed iteration order, no wall clock.
 * Style-free: no colours or looks here (docs/scene3d_design.md section 3).
 */

import { STEP } from "./time";
import { mulberry32, hash01, lerpRange } from "./rng";

export type Vec3 = [number, number, number];
export type Range = [number, number];

export type SimEvent =
  /** One body at a point. */
  | { t: number; type: "spawn"; pos: Vec3; vel?: Vec3; radius?: number }
  /** A stream of bodies from `origin` along `dir` at `rate` per second until `until` (a blown stream). */
  | { t: number; type: "emit"; until: number; origin: Vec3; dir: Vec3; rate: number; speed: number; spread?: number }
  /** Pop the nearest body this ray hits (a tap). */
  | { t: number; type: "pop"; ray: { origin: Vec3; dir: Vec3 } }
  /** Pop the oldest live body. */
  | { t: number; type: "popOldest" }
  /** Stop every active stream (release of a held button). */
  | { t: number; type: "stopEmit" };

export type DropletSpec = { perPop: number; speed: number; life: Range; drag: number; gravity: number; size: number };

export type SimSpec = {
  seed: number;
  /** Seconds to bake when no storyboard duration is known yet. */
  duration: number;
  bounds: { min: Vec3; max: Vec3 };
  gravity: number;
  buoyancy: number;
  /** Quadratic drag coefficient (1/m): a = -drag * |v - wind| * (v - wind). */
  drag: number;
  breeze: { amp: number; scale: number; speed: number };
  radius: Range;
  lifetime: Range;
  /** A body younger than this must never be retired by the cap (checked). */
  minLifetime: number;
  caps: { bodies: number; droplets: number };
  droplets: DropletSpec;
  /** Speed limit (m/s); exceeding it is a bake error. */
  vmax: number;
  popOnBounds: boolean;
  /** Bodies present at t = 0, placed by the seed. */
  initial?: number;
  events: SimEvent[];
};

export type Body = {
  id: number; p: Vec3; v: Vec3; r: number; born: number; life: number; seed: number;
  /** Time the pop started, or -1. */
  popAt: number;
  /** Retired by the cap: fades without droplets. */
  retired: boolean;
};

export type Pop = { id: number; t: number; p: Vec3; v: Vec3; r: number; seed: number; n: number };

export type Severity = "error" | "warn";
export type Issue = { check: string; severity: Severity; body: number; t: number; value: number; limit: number };

/** Seconds a tear (or a retirement fade) takes before the body is removed. */
export const POP_TIME = 0.12;
/** Values per body in a snapshot: id, x, y, z, r, age, pop, seed. pop: -1 none, 0..1 tear, 1..2 fade (retired). */
export const BODY_STRIDE = 8;

type Stream = { until: number; origin: Vec3; dir: Vec3; rate: number; speed: number; spread: number; acc: number };

const len = (x: number, y: number, z: number) => Math.sqrt(x * x + y * y + z * z);
const norm = (v: Vec3): Vec3 => { const l = len(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Wall margin per axis: the larger of 2 % of the box size and the body radius. Bodies stay inside [min+m, max-m]. */
export const wallMargin = (spec: SimSpec, axis: number, r: number): number =>
  Math.max(0.02 * (spec.bounds.max[axis] - spec.bounds.min[axis]), r);

/** Ray-sphere hit distance (dir normalised), or -1. */
export const raySphere = (o: Vec3, d: Vec3, c: Vec3, r: number): number => {
  const ox = o[0] - c[0], oy = o[1] - c[1], oz = o[2] - c[2];
  const b = ox * d[0] + oy * d[1] + oz * d[2];
  const q = ox * ox + oy * oy + oz * oz - r * r;
  const h = b * b - q;
  if (h < 0) return -1;
  const s = Math.sqrt(h);
  const t = -b - s >= 0 ? -b - s : -b + s;
  return t >= 0 ? t : -1;
};

export class World {
  readonly spec: SimSpec;
  t = 0;
  stepIndex = 0;
  bodies: Body[] = [];
  pops: Pop[] = [];
  issues: Issue[] = [];
  /** Highest number of live droplets seen (for the pool check). */
  peakDroplets = 0;
  private rng: () => number;
  private nextId = 0;
  private events: SimEvent[];
  private ev = 0;
  private streams: Stream[] = [];
  private phase: number[];
  private flagged = new Set<string>();

  constructor(spec: SimSpec) {
    this.spec = spec;
    this.rng = mulberry32(spec.seed);
    this.phase = Array.from({ length: 6 }, () => this.rng() * Math.PI * 2);
    this.events = spec.events.map((e, i) => ({ e, i })).sort((a, b) => a.e.t - b.e.t || a.i - b.i).map((x) => x.e);
    for (let i = 0; i < (spec.initial ?? 0); i++) this.placeInitial();
  }

  /**
   * Live mode: forget pops that ended more than `keep` seconds ago (their droplets and any ripples are gone), so a
   * session that runs for hours does not slow down. A bake never calls this: it stores every pop in sim.json.
   */
  forgetPops(keep: number): void {
    const cutoff = this.t - keep;
    if (this.pops.length && this.pops[0].t < cutoff) this.pops = this.pops.filter((p) => p.t >= cutoff);
  }

  /** Live mode: add an event at the current time; it is processed on the next step, exactly as in a bake. */
  addEvent(e: SimEvent): void {
    let i = this.events.length;
    while (i > this.ev && this.events[i - 1].t > e.t) i--;
    this.events.splice(Math.max(i, this.ev), 0, e);
  }

  /** The breeze velocity at p and time t: the curl of a sum of sines, so it swirls without sources or sinks. */
  wind(p: Vec3, t: number): Vec3 {
    const { amp, scale, speed } = this.spec.breeze;
    if (amp === 0) return [0, 0, 0];
    const ph = this.phase, w = speed * t;
    let x = 0, y = 0, z = 0;
    for (let o = 0; o < 2; o++) {
      const k = scale * (o === 0 ? 1 : 2.3), a = amp * (o === 0 ? 1 : 0.35), q = o * 3;
      x -= a * Math.cos(k * p[2] + w + ph[q]);
      y -= a * Math.cos(k * p[0] + 0.8 * w + ph[q + 1]);
      z -= a * Math.cos(k * p[1] + 1.1 * w + ph[q + 2]);
    }
    return [x, 0.35 * y, z];
  }

  /** Live droplets at time t (closed form: a droplet is alive while its age is below its life). */
  liveDroplets(t: number): number {
    let n = 0;
    for (const pop of this.pops) {
      const age = t - pop.t;
      if (age < 0 || age > this.spec.droplets.life[1]) continue;
      for (let i = 0; i < pop.n; i++) if (age < dropletLife(pop, i, this.spec.droplets)) n++;
    }
    return n;
  }

  private issue(check: string, severity: Severity, body: number, value: number, limit: number, once = true): void {
    const key = `${check}:${body}`;
    if (once && this.flagged.has(key)) return;
    this.flagged.add(key);
    this.issues.push({ check, severity, body, t: +this.t.toFixed(4), value: +value.toFixed(4), limit: +limit.toFixed(4) });
    if (this.issues.length > 500) this.issues.shift(); // live mode can run for hours
  }

  private live(): Body[] {
    return this.bodies.filter((b) => b.popAt < 0);
  }

  private spawn(p: Vec3, v: Vec3, r?: number): void {
    const s = this.spec;
    const live = this.live();
    if (live.length >= s.caps.bodies) {
      const oldest = live.reduce((a, b) => (b.born < a.born ? b : a));
      if (this.t - oldest.born < s.minLifetime) this.issue("body-cap", "error", oldest.id, this.t - oldest.born, s.minLifetime, false);
      oldest.popAt = this.t;
      oldest.retired = true;
    }
    const radius = r ?? lerpRange(this.rng(), s.radius);
    for (const o of this.live()) {
      const d = len(p[0] - o.p[0], p[1] - o.p[1], p[2] - o.p[2]), sum = radius + o.r;
      if (d < 0.5 * sum) this.issue("spawn-overlap", "error", this.nextId, d, 0.5 * sum, false);
      else if (d < 0.9 * sum) this.issue("spawn-overlap", "warn", this.nextId, d, 0.9 * sum, false);
    }
    this.bodies.push({ id: this.nextId++, p: [...p], v: [...v], r: radius, born: this.t, life: lerpRange(this.rng(), s.lifetime), seed: Math.floor(this.rng() * 1e6), popAt: -1, retired: false });
  }

  private placeInitial(): void {
    const { min, max } = this.spec.bounds;
    const r = lerpRange(this.rng(), this.spec.radius);
    for (let tries = 0; tries < 40; tries++) {
      const p: Vec3 = [0, 1, 2].map((a) => { const m = wallMargin(this.spec, a, r) * 1.5; return min[a] + m + this.rng() * (max[a] - min[a] - 2 * m); }) as Vec3;
      if (this.live().every((o) => len(p[0] - o.p[0], p[1] - o.p[1], p[2] - o.p[2]) > 1.1 * (r + o.r))) {
        this.spawn(p, [0, 0, 0], r);
        const b = this.bodies[this.bodies.length - 1];
        b.born = -this.rng() * this.spec.minLifetime; // already floating: not newborn
        return;
      }
    }
  }

  private startPop(b: Body): void {
    if (b.popAt >= 0) return;
    b.popAt = this.t;
    const d = this.spec.droplets, live = this.liveDroplets(this.t);
    const n = Math.max(0, Math.min(d.perPop, this.spec.caps.droplets - live));
    if (n < d.perPop) this.issue("pool", "error", b.id, live + d.perPop, this.spec.caps.droplets, false);
    else if (live + n >= 0.9 * this.spec.caps.droplets) this.issue("pool", "warn", b.id, live + n, 0.9 * this.spec.caps.droplets);
    this.pops.push({ id: b.id, t: this.t, p: [...b.p], v: [...b.v], r: b.r, seed: b.seed, n });
  }

  /** Pop the nearest live body hit by a ray. Returns its id or -1. */
  pick(origin: Vec3, dir: Vec3): number {
    const d = norm(dir);
    let best = -1, bestT = Infinity;
    for (const b of this.live()) {
      const h = raySphere(origin, d, b.p, b.r);
      if (h >= 0 && h < bestT) { bestT = h; best = b.id; }
    }
    return best;
  }

  private apply(e: SimEvent): void {
    if (e.type === "spawn") this.spawn(e.pos, e.vel ?? [0, 0, 0], e.radius);
    else if (e.type === "emit") this.streams.push({ until: e.until, origin: e.origin, dir: norm(e.dir), rate: e.rate, speed: e.speed, spread: e.spread ?? 0.15, acc: 0 });
    else if (e.type === "stopEmit") this.streams = [];
    else if (e.type === "pop") { const id = this.pick(e.ray.origin, e.ray.dir); const b = this.bodies.find((x) => x.id === id); if (b) this.startPop(b); }
    else if (e.type === "popOldest") { const live = this.live(); if (live.length) this.startPop(live.reduce((a, b) => (b.born < a.born ? b : a))); }
  }

  /** Advance one fixed step. */
  advance(): void {
    const s = this.spec, dt = STEP;
    while (this.ev < this.events.length && this.events[this.ev].t <= this.t + 1e-9) this.apply(this.events[this.ev++]);

    // streams: spawn at the accumulated rate, each body leaving the origin along a jittered direction
    this.streams = this.streams.filter((st) => this.t < st.until);
    for (const st of this.streams) {
      st.acc = Math.min(2, st.acc + st.rate * dt);
      while (st.acc >= 1) {
        // a stream cannot blow through a body sitting at its nozzle: it waits until the nozzle is clear
        const rMax = this.spec.radius[1];
        if (this.live().some((o) => len(st.origin[0] - o.p[0], st.origin[1] - o.p[1], st.origin[2] - o.p[2]) < 0.9 * (rMax + o.r))) break;
        st.acc -= 1;
        const a = this.rng() * Math.PI * 2, c = st.spread * Math.sqrt(this.rng());
        const up: Vec3 = Math.abs(st.dir[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
        const u = norm([st.dir[1] * up[2] - st.dir[2] * up[1], st.dir[2] * up[0] - st.dir[0] * up[2], st.dir[0] * up[1] - st.dir[1] * up[0]]);
        const w: Vec3 = [st.dir[1] * u[2] - st.dir[2] * u[1], st.dir[2] * u[0] - st.dir[0] * u[2], st.dir[0] * u[1] - st.dir[1] * u[0]];
        const dir = norm([0, 1, 2].map((i) => st.dir[i] + c * (Math.cos(a) * u[i] + Math.sin(a) * w[i])) as Vec3);
        const sp = st.speed * (0.85 + 0.3 * this.rng());
        this.spawn([...st.origin], [dir[0] * sp, dir[1] * sp, dir[2] * sp]);
      }
    }

    // forces and semi-implicit Euler
    for (const b of this.bodies) {
      if (b.popAt >= 0) continue;
      const w = this.wind(b.p, this.t);
      const rx = b.v[0] - w[0], ry = b.v[1] - w[1], rz = b.v[2] - w[2], rl = len(rx, ry, rz);
      b.v[0] += (-s.drag * rl * rx) * dt;
      b.v[1] += (s.buoyancy - s.gravity - s.drag * rl * ry) * dt;
      b.v[2] += (-s.drag * rl * rz) * dt;
      b.p[0] += b.v[0] * dt; b.p[1] += b.v[1] * dt; b.p[2] += b.v[2] * dt;
    }

    // soft separation: overlapping live bodies are pushed apart and their closing speed removed
    const live = this.live();
    for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const dx = b.p[0] - a.p[0], dy = b.p[1] - a.p[1], dz = b.p[2] - a.p[2], d = len(dx, dy, dz), sum = a.r + b.r;
      if (d >= sum || d < 1e-9) continue;
      const nx = dx / d, ny = dy / d, nz = dz / d, push = (sum - d) / 2;
      a.p[0] -= nx * push; a.p[1] -= ny * push; a.p[2] -= nz * push;
      b.p[0] += nx * push; b.p[1] += ny * push; b.p[2] += nz * push;
      const closing = (b.v[0] - a.v[0]) * nx + (b.v[1] - a.v[1]) * ny + (b.v[2] - a.v[2]) * nz;
      if (closing < 0) { const h = closing / 2; a.v[0] += nx * h; a.v[1] += ny * h; a.v[2] += nz * h; b.v[0] -= nx * h; b.v[1] -= ny * h; b.v[2] -= nz * h; }
    }

    // walls, lifetime, limits
    for (const b of this.bodies) {
      if (b.popAt >= 0) continue;
      for (let a = 0; a < 3; a++) {
        const m = wallMargin(s, a, b.r), lo = s.bounds.min[a] + m, hi = s.bounds.max[a] - m;
        if (b.p[a] < lo || b.p[a] > hi) {
          b.p[a] = b.p[a] < lo ? lo : hi;
          if (s.popOnBounds) this.startPop(b);
          else b.v[a] *= -0.3;
        }
      }
      if (this.t - b.born >= b.life) this.startPop(b);
      const speed = len(b.v[0], b.v[1], b.v[2]);
      if (speed > s.vmax) this.issue("speed", "error", b.id, speed, s.vmax);
      if (![...b.p, ...b.v].every(Number.isFinite)) this.issue("finite", "error", b.id, NaN, 0);
    }

    this.bodies = this.bodies.filter((b) => b.popAt < 0 || this.t - b.popAt < POP_TIME);
    this.t = +(this.t + dt).toFixed(10);
    this.stepIndex++;
    this.peakDroplets = Math.max(this.peakDroplets, this.liveDroplets(this.t));
  }

  /** Flat snapshot of every body: BODY_STRIDE values each (see BODY_STRIDE). */
  snapshot(round = 4): number[] {
    const q = 10 ** round, f = (x: number) => Math.round(x * q) / q;
    const out: number[] = [];
    for (const b of this.bodies) {
      const pop = b.popAt < 0 ? -1 : Math.min(1, (this.t - b.popAt) / POP_TIME) + (b.retired ? 1 : 0);
      out.push(b.id, f(b.p[0]), f(b.p[1]), f(b.p[2]), f(b.r), f(this.t - b.born), f(pop), b.seed);
    }
    return out;
  }
}

/** Life of droplet i of a pop (seconds). */
export const dropletLife = (pop: Pop, i: number, d: DropletSpec): number => lerpRange(hash01(pop.seed, i * 4 + 3), d.life);

/**
 * Droplet positions at time t, closed form (linear drag k, gravity g): x(τ) = x0 + gτ/k + (v0 − g/k)(1 − e^(−kτ))/k.
 * Appends x, y, z, size for every live droplet to `out` and returns it.
 */
export const dropletsAt = (pops: readonly Pop[], t: number, d: DropletSpec, out: number[] = []): number[] => {
  const k = Math.max(d.drag, 1e-6), g = -d.gravity;
  for (const pop of pops) {
    const tau = t - pop.t;
    if (tau < 0 || tau > d.life[1]) continue;
    const e = (1 - Math.exp(-k * tau)) / k;
    for (let i = 0; i < pop.n; i++) {
      const life = dropletLife(pop, i, d);
      if (tau >= life) continue;
      const cz = 2 * hash01(pop.seed, i * 4) - 1, ph = 2 * Math.PI * hash01(pop.seed, i * 4 + 1), sz = Math.sqrt(1 - cz * cz);
      const dir: Vec3 = [sz * Math.cos(ph), cz, sz * Math.sin(ph)];
      const sp = d.speed * (0.4 + 0.6 * hash01(pop.seed, i * 4 + 2));
      const v0: Vec3 = [pop.v[0] + dir[0] * sp, pop.v[1] + dir[1] * sp, pop.v[2] + dir[2] * sp];
      out.push(
        pop.p[0] + dir[0] * pop.r + v0[0] * e,
        pop.p[1] + dir[1] * pop.r + (g / k) * tau + (v0[1] - g / k) * e,
        pop.p[2] + dir[2] * pop.r + v0[2] * e,
        d.size * Math.sqrt(1 - tau / life),
      );
    }
  }
  return out;
};
