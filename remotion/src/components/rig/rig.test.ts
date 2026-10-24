import { describe, expect, it } from "vitest";
import { blinkAt, gestureT, mouthAt, shapeFromOpen, visemeAt, walkAt, walkSteps, VISEME_OPEN } from "./index";

describe("blink", () => {
  const curve = (seed: number) => Array.from({ length: 30 * 60 }, (_, f) => blinkAt(f, 30, seed));
  it("is deterministic, in range, and blinks every few seconds", () => {
    const c = curve(0);
    expect(curve(0)).toEqual(c);
    expect(Math.min(...c)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...c)).toBeLessThanOrEqual(1);
    const starts = c.filter((v, i) => v > 0 && c[i - 1] === 0).length;
    expect(starts).toBeGreaterThanOrEqual(17); // one per 3.4 s slot over 60 s, plus some doubles
    expect(starts).toBeLessThanOrEqual(26);
    expect(c.filter((v) => v === 0).length / c.length).toBeGreaterThan(0.9); // eyes are mostly open
  });
  it("differs by seed so two characters do not blink together", () => {
    expect(curve(1)).not.toEqual(curve(2));
  });
  it("works at 12 and 24 fps", () => {
    for (const fps of [12, 24]) expect(Array.from({ length: fps * 20 }, (_, f) => blinkAt(f, fps)).some((v) => v > 0.5)).toBe(true);
  });
});

describe("mouth", () => {
  it("prefers visemes, falls back to openness, closes after the data", () => {
    expect(mouthAt({ visemes: "XDA" }, 1)).toBe(VISEME_OPEN.D);
    expect(mouthAt({ mouth: [0.2, 0.7] }, 1)).toBe(0.7);
    expect(mouthAt({ mouth: [0.2, 0.7] }, 5)).toBe(0);
    expect(mouthAt({}, 3)).toBe(0); // not talking without data unless asked
    expect(mouthAt({ talking: true }, 3)).toBeGreaterThanOrEqual(0);
    expect(mouthAt({ mouth: [1], talking: false }, 0)).toBe(0);
  });
  it("derives shapes from openness and ignores unknown letters", () => {
    expect(visemeAt({ mouth: [0, 0.2, 0.5, 0.9] }, 3)).toBe("D");
    expect(visemeAt({ visemes: "Q" }, 0)).toBe("X");
    expect(["X", "B", "C", "D"].map((_, i) => shapeFromOpen([0, 0.2, 0.5, 0.9][i]))).toEqual(["X", "B", "C", "D"]);
  });
});

describe("gesture and walk", () => {
  it("eases a gesture in", () => {
    expect(gestureT(0, 10)).toBe(0);
    expect(gestureT(17, 10)).toBeCloseTo(0.5, 1);
    expect(gestureT(40, 10)).toBe(1);
  });
  it("lands a foot at every multiple of PI and lists the same footsteps", () => {
    const walk = { from: 10, to: 100, cadence: 2 };
    const steps = walkSteps(walk, 30);
    expect(steps).toEqual([25, 40, 55, 70, 85]);
    for (const [i, f] of steps.entries()) expect(walkAt(walk, f, 30).phase).toBeCloseTo((i + 1) * Math.PI, 5);
    expect(walkAt(walk, 5, 30).active).toBe(false);
    expect(walkAt(walk, 200, 30).progress).toBe(1);
  });
  it("keeps the cadence in seconds at other frame rates", () => {
    expect(walkSteps({ from: 0, to: 48 }, 24)).toEqual([12, 24, 36]);
    expect(walkSteps({ from: 0, to: 24, cadence: 4 }, 12)).toEqual([3, 6, 9, 12, 15, 18, 21]);
  });
});
