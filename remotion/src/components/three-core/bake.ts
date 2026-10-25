/**
 * Bake a simulation once, ahead of the render (docs/scene3d_design.md section 4), and check it (section 9).
 *
 * Remotion renders frames in parallel browser tabs; each tab reads the baked frame instead of re-simulating from
 * t = 0. The bake is the same World code the live page runs, stepped at the fixed rate and sampled at the video fps.
 * scripts/three_core_bake_sim.mjs runs bakeAll() twice, compares the outputs and refuses to write on any error.
 */

import { World, SimSpec, Issue, Pop, BODY_STRIDE, wallMargin } from "./sim";
import { stepsAt } from "./time";

export type BakedScene = {
  fps: number;
  frames: number;
  /** One flat array per frame, BODY_STRIDE values per body. */
  bodies: number[][];
  /** Every pop: id, t, x, y, z, vx, vy, vz, r, seed, droplets. */
  pops: number[][];
  peakDroplets: number;
};

export type BakeResult = { scenes: Record<string, BakedScene>; issues: (Issue & { scene: string })[] };

const r4 = (x: number) => Math.round(x * 1e4) / 1e4;

export const bakeScene = (spec: SimSpec, fps: number, seconds: number): { baked: BakedScene; issues: Issue[] } => {
  const world = new World(spec);
  const frames = Math.max(1, Math.ceil(seconds * fps));
  const bodies: number[][] = [];
  for (let f = 0; f < frames; f++) {
    const target = stepsAt(f / fps);
    while (world.stepIndex < target) world.advance();
    bodies.push(world.snapshot());
  }
  const pops = world.pops.map((p) => [p.id, r4(p.t), ...p.p.map(r4), ...p.v.map(r4), r4(p.r), p.seed, p.n]);
  const baked: BakedScene = { fps, frames, bodies, pops, peakDroplets: world.peakDroplets };
  return { baked, issues: [...world.issues, ...checkBaked(spec, baked, world.issues)] };
};

/**
 * Checks that need the whole baked output: finite values, bounds with margin, body cap per frame, and a pool
 * warning near the droplet cap. `prior` are the World's own issues, so a pool problem it already reported is not
 * reported twice.
 */
export const checkBaked = (spec: SimSpec, baked: BakedScene, prior: readonly Issue[] = []): Issue[] => {
  const out: Issue[] = [];
  const once = new Set<string>();
  const add = (i: Issue) => { const k = `${i.check}:${i.body}`; if (!once.has(k)) { once.add(k); out.push(i); } };
  baked.bodies.forEach((frame, f) => {
    const t = +(f / baked.fps).toFixed(4);
    let live = 0;
    for (let i = 0; i < frame.length; i += BODY_STRIDE) {
      const id = frame[i], r = frame[i + 4], pop = frame[i + 6];
      for (let k = 0; k < BODY_STRIDE; k++) if (!Number.isFinite(frame[i + k])) add({ check: "finite", severity: "error", body: id, t, value: NaN, limit: 0 });
      for (let a = 0; a < 3; a++) {
        const m = wallMargin(spec, a, r), p = frame[i + 1 + a];
        const lo = spec.bounds.min[a] + m - 1e-4, hi = spec.bounds.max[a] - m + 1e-4; // 1e-4: snapshot rounding
        if (p < lo || p > hi) add({ check: "bounds", severity: "error", body: id, t, value: p, limit: p < lo ? lo : hi });
      }
      if (pop < 0) live++;
    }
    if (live > spec.caps.bodies) add({ check: "body-cap", severity: "error", body: -1, t, value: live, limit: spec.caps.bodies });
  });
  if (baked.peakDroplets >= 0.9 * spec.caps.droplets && ![...prior, ...out].some((i) => i.check === "pool"))
    add({ check: "pool", severity: "warn", body: -1, t: 0, value: baked.peakDroplets, limit: 0.9 * spec.caps.droplets });
  return out;
};

/** Bake every scene. `seconds[id]` overrides a spec's duration (the finalize step passes storyboard durations). */
export const bakeAll = (specs: Record<string, SimSpec>, fps: number, seconds: Record<string, number> = {}): BakeResult => {
  const scenes: Record<string, BakedScene> = {};
  const issues: BakeResult["issues"] = [];
  for (const id of Object.keys(specs).sort()) {
    const { baked, issues: found } = bakeScene(specs[id], fps, seconds[id] ?? specs[id].duration);
    scenes[id] = baked;
    for (const i of found) issues.push({ ...i, scene: id });
  }
  return { scenes, issues };
};

/** The pops of a baked scene as objects (for droplets). */
export const bakedPops = (baked: BakedScene): Pop[] =>
  baked.pops.map((p) => ({ id: p[0], t: p[1], p: [p[2], p[3], p[4]], v: [p[5], p[6], p[7]], r: p[8], seed: p[9], n: p[10] }));

/** Message form required by the design: BAKE FAILED: <check> body=<id> frame=<n> value=<v> limit=<l>. */
export const formatIssue = (i: Issue & { scene: string }, fps: number): string =>
  `${i.severity === "error" ? "BAKE FAILED" : "BAKE WARNING"}: ${i.check} scene=${i.scene} body=${i.body} frame=${Math.round(i.t * fps)} value=${i.value} limit=${i.limit}`;
