import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { World, SimSpec, dropletsAt, raySphere, BODY_STRIDE, POP_TIME } from "./sim";
import { bakeAll, bakeScene, bakedPops, formatIssue } from "./bake";
import { poseAt } from "./camera";
import { mulberry32 } from "./rng";
import { stepsAt, STEP_HZ } from "./time";

const base = (over: Partial<SimSpec> = {}): SimSpec => ({
  seed: 7,
  duration: 4,
  bounds: { min: [-2, 0, -2], max: [2, 3, 2] },
  gravity: 9.81,
  buoyancy: 9.75,
  drag: 2,
  breeze: { amp: 0.15, scale: 1.3, speed: 0.4 },
  radius: [0.08, 0.14],
  lifetime: [2.5, 4],
  minLifetime: 0.8,
  caps: { bodies: 24, droplets: 400 },
  droplets: { perPop: 10, speed: 0.8, life: [0.3, 0.6], drag: 3, gravity: 9.81, size: 0.01 },
  vmax: 4,
  popOnBounds: true,
  initial: 4,
  events: [{ t: 0.2, type: "emit", until: 2, origin: [-1.2, 0.8, 0], dir: [1, 0.5, 0], rate: 5, speed: 1.4, spread: 0.2 }],
  ...over,
});

const sha = (x: unknown) => createHash("sha1").update(JSON.stringify(x)).digest("hex");

describe("three-core sim", () => {
  it("bakes identically twice (bake stability)", () => {
    expect(sha(bakeAll({ a: base() }, 30))).toBe(sha(bakeAll({ a: base() }, 30)));
  });

  it("produces bodies and pops, and no errors for a sane spec", () => {
    const { baked, issues } = bakeScene(base(), 30, 4);
    expect(baked.frames).toBe(120);
    expect(baked.bodies[60].length / BODY_STRIDE).toBeGreaterThan(4);
    expect(baked.pops.length).toBeGreaterThan(0);
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors, JSON.stringify(errors)).toEqual([]);
  });

  it("maps 30 fps frames onto every second fixed step", () => {
    expect(STEP_HZ).toBe(60);
    expect(stepsAt(1 / 30)).toBe(2);
    expect(stepsAt(29 / 30)).toBe(58);
  });

  it("fails the speed check when vmax is too low", () => {
    const { issues } = bakeScene(base({ vmax: 0.2 }), 30, 2);
    expect(issues.some((i) => i.check === "speed" && i.severity === "error")).toBe(true);
  });

  it("fails spawn-overlap when a scripted spawn lands on another body", () => {
    const { issues } = bakeScene(base({ initial: 0, events: [{ t: 0, type: "spawn", pos: [0, 1, 0] }, { t: 0.1, type: "spawn", pos: [0, 1.01, 0] }] }), 30, 1);
    expect(issues.some((i) => i.check === "spawn-overlap" && i.severity === "error")).toBe(true);
  });

  it("lets a stream wait for a clear nozzle instead of stacking bodies", () => {
    const { issues } = bakeScene(base({ events: [{ t: 0, type: "emit", until: 1, origin: [0, 1, 0], dir: [0, 1, 0], rate: 60, speed: 0.1, spread: 0 }] }), 30, 1);
    expect(issues.filter((i) => i.check === "spawn-overlap" && i.severity === "error")).toEqual([]);
  });

  it("fails the pool check when droplets run out", () => {
    const { issues } = bakeScene(base({ caps: { bodies: 24, droplets: 15 }, lifetime: [0.3, 0.4], minLifetime: 0.1 }), 30, 3);
    expect(issues.some((i) => i.check === "pool" && i.severity === "error")).toBe(true);
  });

  it("reports a droplet shortage once, as an error, not also as a warning", () => {
    const { issues } = bakeScene(base({ caps: { bodies: 24, droplets: 15 }, lifetime: [0.3, 0.4], minLifetime: 0.1 }), 30, 3);
    expect(issues.filter((i) => i.check === "pool" && i.severity === "warn")).toEqual([]);
  });

  it("forgets old pops in live mode so long sessions stay fast, and keeps recent ones", () => {
    // every pop in this spec happens while the stream runs (until 2 s); lifetimes are under half a second
    const w = new World(base({ lifetime: [0.3, 0.5], minLifetime: 0.1 }));
    for (let i = 0; i < 60 * 2; i++) { w.advance(); w.forgetPops(1); }
    expect(w.pops.length).toBeGreaterThan(0); // recent pops kept
    expect(w.pops.every((p) => p.t >= w.t - 1)).toBe(true);
    for (let i = 0; i < 60 * 4; i++) { w.advance(); w.forgetPops(1); }
    expect(w.pops).toEqual([]); // nothing has popped for over a second: all forgotten
  });

  it("fails the body-cap check when the cap retires young bodies", () => {
    const { issues } = bakeScene(base({ caps: { bodies: 3, droplets: 400 }, initial: 0, events: [{ t: 0, type: "emit", until: 2, origin: [-1, 1, 0], dir: [1, 0.3, 0], rate: 12, speed: 2.5, spread: 0.2 }] }), 30, 2);
    expect(issues.some((i) => i.check === "body-cap" && i.severity === "error")).toBe(true);
  });

  it("keeps every body inside the walls by its margin", () => {
    const { issues } = bakeScene(base({ popOnBounds: false, lifetime: [30, 40] }), 30, 6);
    expect(issues.filter((i) => i.check === "bounds")).toEqual([]);
  });

  it("formats failures as the design requires", () => {
    const line = formatIssue({ check: "speed", severity: "error", body: 3, t: 1, value: 5, limit: 4, scene: "blow" }, 30);
    expect(line).toBe("BAKE FAILED: speed scene=blow body=3 frame=30 value=5 limit=4");
  });

  it("pops the body a ray hits, and removes it after the tear", () => {
    const w = new World(base({ initial: 0, events: [{ t: 0, type: "spawn", pos: [0, 1.5, 0], radius: 0.2 }] }));
    w.advance();
    w.addEvent({ t: w.t, type: "pop", ray: { origin: [0, 1.5, 5], dir: [0, 0, -1] } });
    w.advance();
    expect(w.pops.length).toBe(1);
    for (let i = 0; i < Math.ceil(POP_TIME * 60) + 1; i++) w.advance();
    expect(w.bodies.length).toBe(0);
  });

  it("computes droplets in closed form and lets them fall", () => {
    const { baked } = bakeScene(base(), 30, 4);
    const pops = bakedPops(baked);
    const p = pops[0];
    const d = base().droplets;
    const a = dropletsAt([p], p.t + 0.05, d), b = dropletsAt([p], p.t + 0.25, d);
    expect(a.length / 4).toBe(p.n);
    const meanY = (x: number[]) => x.filter((_, i) => i % 4 === 1).reduce((s, v) => s + v, 0) / (x.length / 4);
    expect(meanY(b)).toBeLessThan(meanY(a));
    expect(dropletsAt([p], p.t + 1, d).length).toBe(0);
  });

  it("ray-sphere hits the near side", () => {
    expect(raySphere([0, 0, 5], [0, 0, -1], [0, 0, 0], 1)).toBeCloseTo(4);
    expect(raySphere([0, 3, 5], [0, 0, -1], [0, 0, 0], 1)).toBe(-1);
  });

  it("is seeded", () => {
    const a = mulberry32(1), b = mulberry32(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("interpolates shots with easing and clamps progress", () => {
    const shot = { from: { pos: [0, 0, 0], target: [0, 0, -1], fov: 40 }, to: { pos: [2, 0, 0], target: [0, 0, -1], fov: 30 } } as const;
    expect(poseAt(shot as never, 0).pos[0]).toBe(0);
    expect(poseAt(shot as never, 0.5).pos[0]).toBeCloseTo(1);
    expect(poseAt(shot as never, 2).fov).toBe(30);
  });
});

const here = resolve(__dirname);
const filesIn = (dir: string): string[] =>
  !existsSync(dir) ? [] : readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? filesIn(join(dir, f)) : [join(dir, f)])).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));

describe("three-core rules", () => {
  // every bundle drawn with three.js follows the time contract (lowpoly adopted it in phase 5)
  const bundles = [here, resolve(here, "..", "scene3d"), resolve(here, "..", "..", "..", "..", "templates", "scene3d_video"),
    resolve(here, "..", "lowpoly"), resolve(here, "..", "..", "..", "..", "templates", "lowpoly_video")];

  it("never reads a wall clock or random numbers in scene or kit code (time contract)", () => {
    for (const dir of bundles) {
      for (const f of filesIn(dir)) {
        const src = readFileSync(f, "utf-8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
        expect(src, f).not.toMatch(/Date\.now|Math\.random|useFrame\b|new Clock\b|new Timer\b/);
        // live.ts may time its own frames for the quality governor; simulation time never comes from that clock
        if (!/live\.ts$/.test(f)) expect(src, f).not.toMatch(/performance\.now/);
      }
    }
  });

  it("holds no colours or look-defining shaders (style boundary)", () => {
    for (const f of filesIn(here)) {
      const src = readFileSync(f, "utf-8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{6}\b|rgba?\(|gl_FragColor|ShaderMaterial|new Color\(/);
    }
  });
});
