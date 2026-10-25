import { describe, it, expect } from "vitest";
import { makeWaves, waveHeight, waveSlope, omegaFor, fallTime, ripplesAt, rippleHeight, G, RippleSpec } from "./waves";
import type { Pop, DropletSpec } from "./sim";

const spec = { seed: 5, count: 8, wavelength: [0.08, 0.7] as [number, number], steepness: [0.012, 0.035] as [number, number], directionSpread: 1.2, heading: 0.4 };
const ripple: RippleSpec = { amp: 0.01, speed: 0.35, width: 0.06, wavelength: 0.04, decay: 1.2, life: 3, max: 4 };
const drops: DropletSpec = { perPop: 14, speed: 0.9, life: [0.25, 0.6], drag: 4, gravity: 9.81, size: 0.012 };

describe("three-core waves", () => {
  it("follows the gravity-capillary dispersion relation", () => {
    const k = (2 * Math.PI) / 1.0; // 1 m wave: gravity dominates, w ~ sqrt(g k)
    expect(omegaFor(k)).toBeCloseTo(Math.sqrt(G * k), 2);
    const kc = (2 * Math.PI) / 0.01; // 1 cm ripple: capillary term matters
    expect(omegaFor(kc)).toBeGreaterThan(Math.sqrt(G * kc) * 1.5);
  });

  it("is seeded and keeps every wave far from breaking (a k << 1)", () => {
    expect(makeWaves(spec)).toEqual(makeWaves(spec));
    for (const w of makeWaves(spec)) expect(w.amp * w.k).toBeLessThanOrEqual(0.035 + 1e-9);
  });

  it("slope is the gradient of height (finite difference)", () => {
    const waves = makeWaves(spec), h = 1e-5, x = 0.3, z = -0.7, t = 1.25;
    const [gx, gz] = waveSlope(waves, x, z, t);
    expect(gx).toBeCloseTo((waveHeight(waves, x + h, z, t) - waveHeight(waves, x - h, z, t)) / (2 * h), 5);
    expect(gz).toBeCloseTo((waveHeight(waves, x, z + h, t) - waveHeight(waves, x, z - h, t)) / (2 * h), 5);
  });

  it("finds how long a falling droplet takes to reach the water", () => {
    // no drag limit: k tiny, falling 1 m from rest takes sqrt(2 h / g)
    expect(fallTime(1.35, 0, 0.35, 1e-6, 9.81)).toBeCloseTo(Math.sqrt(2 / 9.81), 3);
    expect(fallTime(0.2, 0, 0.35, 4, 9.81)).toBe(0);
  });

  it("rings the water where bubbles pop on it, and later where spray lands", () => {
    const onWater: Pop = { id: 1, t: 1, p: [0, 0.4, 0], v: [0, 0, 0], r: 0.1, seed: 3, n: 10 };
    const above: Pop = { id: 2, t: 1, p: [1, 1.5, 0], v: [0, 0, 0], r: 0.1, seed: 4, n: 10 };
    const now = ripplesAt([onWater, above], 1.05, 0.35, drops, ripple);
    expect(now.map((r) => r.t0)).toEqual([1]);
    const later = ripplesAt([onWater, above], 2, 0.35, drops, ripple);
    expect(later.length).toBe(2);
    expect(later[0].t0).toBeGreaterThan(1);
    expect(rippleHeight(later[1], ripple, 0, 0, 0.5)).toBe(0); // before it starts
  });
});
