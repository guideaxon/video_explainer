import { describe, expect, it } from "vitest";
import { burstPath, countUp, dotsRamp, focusLines, h01, ik2, inkFrameWeights, inkFrame, cloudPath } from "./ink";
import { HERO_MOUTHS, gestureHands } from "./hero";
import { VISEMES } from "../rig";

describe("ink geometry is deterministic", () => {
  it("hash is stable and in range", () => {
    expect(h01(3, 4)).toBe(h01(3, 4));
    for (let i = 0; i < 200; i++) expect(h01(i, 7)).toBeGreaterThanOrEqual(0), expect(h01(i, 7)).toBeLessThan(1);
  });
  it("same inputs give the same paths, different seeds differ", () => {
    expect(burstPath(0, 0, 100, 14, 0.7, 1)).toBe(burstPath(0, 0, 100, 14, 0.7, 1));
    expect(burstPath(0, 0, 100, 14, 0.7, 1)).not.toBe(burstPath(0, 0, 100, 14, 0.7, 2));
    expect(inkFrame(500, 300, 10, 2)).toBe(inkFrame(500, 300, 10, 2));
    expect(cloudPath(0, 0, 100, 60, 11, 1)).toBe(cloudPath(0, 0, 100, 60, 11, 1));
    expect(focusLines(0, 0, 100, 500, 20, 1, 3)).toBe(focusLines(0, 0, 100, 500, 20, 1, 3));
  });
  it("burst has 2 points per spike", () => {
    expect((burstPath(0, 0, 100, 12).match(/[ML]/g) ?? []).length).toBe(24);
  });
  it("ink weight varies within 0.7..1.3 of the nominal weight", () => {
    const w = inkFrameWeights(1000, 1680, 10, 1);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(7 - 1e-9);
    expect(Math.max(...w)).toBeLessThanOrEqual(13 + 1e-9);
    expect(Math.max(...w) - Math.min(...w)).toBeGreaterThan(1);
  });
});

describe("halftone ramp", () => {
  it("dots grow toward the dark side and never overlap badly", () => {
    const d = dotsRamp(400, 400, 20, "up");
    const top = d.filter((c) => c.y < 100);
    const bottom = d.filter((c) => c.y > 300);
    expect(Math.max(...bottom.map((c) => c.r))).toBeGreaterThan(Math.max(0, ...top.map((c) => c.r)));
    expect(Math.max(...d.map((c) => c.r))).toBeLessThanOrEqual(20 * 0.62 + 0.1);
  });
});

describe("two-bone IK", () => {
  it("keeps both bones at their length when reachable", () => {
    const { joint, end } = ik2([0, 0], [150, 100], 100, 100, 1);
    expect(Math.hypot(joint[0], joint[1])).toBeCloseTo(100, 3);
    expect(Math.hypot(end[0] - joint[0], end[1] - joint[1])).toBeCloseTo(100, 1);
  });
  it("clamps an unreachable target", () => {
    const { end } = ik2([0, 0], [1000, 0], 100, 100);
    expect(end[0]).toBeLessThan(200);
  });
});

describe("hero rig tables", () => {
  it("has a mouth for every Rhubarb shape", () => {
    for (const v of VISEMES) expect(HERO_MOUTHS[v]).toBeDefined();
  });
  it("gestures move a hand", () => {
    expect(gestureHands("wave", 0).r).toBeDefined();
    expect(gestureHands("point", 0).r).toBeDefined();
    expect(gestureHands("fist", 0).r).toBeDefined();
    expect(gestureHands("think", 0).l).toBeDefined();
    expect(gestureHands("rest", 0)).toEqual({});
  });
  it("counts up", () => {
    expect(countUp(83, 0.5)).toBe("42");
    expect(countUp(83, 2)).toBe("83");
  });
});
