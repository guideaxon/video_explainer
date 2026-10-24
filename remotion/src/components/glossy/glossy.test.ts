import { describe, expect, it } from "vitest";
import { alpha, armPose, dropHeight, feetAt, mix, safeId, shade, squashAt, tint, TOY_GESTURES } from "./gloss";

describe("colour helpers", () => {
  it("mixes hex colours linearly and clamps t", () => {
    expect(mix("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mix("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#000", "#fff", 2)).toBe("#ffffff");
  });
  it("tints toward white and shades toward plum, never black", () => {
    expect(tint("#ff4766", 1)).toBe("#ffffff");
    expect(shade("#ff4766", 1)).toBe("#2a0c33");
    expect(alpha("#ff0000", 0.5)).toBe("rgba(255,0,0,0.5)");
  });
});

describe("safeId", () => {
  it("strips the colons React useId puts in ids, so url(#id) works", () => {
    expect(safeId(":r1:")).toBe("gr1");
    expect(safeId(":R2a:")).toMatch(/^[A-Za-z][A-Za-z0-9_-]*$/);
    expect(safeId(":r1:")).not.toBe(safeId(":r2:"));
  });
});

describe("squash and stretch", () => {
  it("is neutral before landing, squashes first, and settles", () => {
    expect(squashAt(-0.1)).toEqual({ sx: 1, sy: 1 });
    const hit = squashAt(0);
    expect(hit.sy).toBeLessThan(1);
    expect(hit.sx).toBeGreaterThan(1);
    const late = squashAt(2);
    expect(Math.abs(late.sy - 1)).toBeLessThan(0.001);
  });
  it("drops from h0 to the ground and stays there", () => {
    expect(dropHeight(0, 500)).toBe(500);
    expect(dropHeight(0.25, 500, 0.5)).toBeCloseTo(375);
    expect(dropHeight(0.6, 500, 0.5)).toBe(0);
  });
});

describe("toy poses", () => {
  it("rest is the same as no gesture progress, for every gesture", () => {
    for (const g of TOY_GESTURES) {
      const p = armPose(g, 0, 0);
      expect(p.l).toBeCloseTo(armPose("rest", 1, 0).l);
      expect(p.r).toBeCloseTo(armPose("rest", 1, 0).r);
    }
  });
  it("wave raises the right arm, cheer both and hops, point holds the arm out", () => {
    expect(armPose("wave", 1, 10).r).toBeGreaterThan(120);
    const cheer = armPose("cheer", 1, 8);
    expect(cheer.l).toBeGreaterThan(130);
    expect(cheer.r).toBeGreaterThan(130);
    expect(cheer.hop).toBeGreaterThan(50);
    expect(armPose("cheer", 1, 20).hop).toBe(0);
    expect(armPose("point", 1, 30).r).toBeCloseTo(92);
  });
  it("feet are both down with the widest stride at every multiple of PI", () => {
    for (let k = 0; k < 6; k++) {
      const f = feetAt(k * Math.PI);
      expect(f.ly).toBeCloseTo(0);
      expect(f.ry).toBeCloseTo(0);
      expect(Math.abs(f.lx)).toBeCloseTo(34);
    }
    const mid = feetAt(Math.PI / 2);
    expect(mid.ly + mid.ry).toBeGreaterThan(20);
  });
});
