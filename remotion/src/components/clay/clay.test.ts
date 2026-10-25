import { describe, expect, it } from "vitest";
import { blobPath, boil, capsulePts, closedSpline, countAt, ellipsePts, heldFrame, poseOf, poseStart, sausagePts, shade, slabPts } from "./geom";
import { GLYPHS, fitUnit, layoutLine } from "./letters";

describe("held-frame clock (on twos)", () => {
  it("makes 12 poses per second at 30 fps", () => {
    expect(poseOf(0)).toBe(0);
    expect(poseOf(29)).toBe(11);
    expect(poseOf(30)).toBe(12);
    expect(new Set(Array.from({ length: 30 }, (_, f) => poseOf(f))).size).toBe(12);
  });
  it("holds each pose for 2 or 3 real frames and never runs ahead", () => {
    const runs: number[] = [];
    let run = 1;
    for (let f = 1; f < 300; f++) {
      if (heldFrame(f) === heldFrame(f - 1)) run++;
      else {
        runs.push(run);
        run = 1;
      }
    }
    expect(Math.min(...runs)).toBe(2);
    expect(Math.max(...runs)).toBe(3);
    for (let f = 0; f < 100; f++) {
      expect(heldFrame(f)).toBeLessThanOrEqual(f);
      expect(poseOf(heldFrame(f))).toBe(poseOf(f));
      expect(heldFrame(f)).toBe(poseStart(poseOf(f)));
    }
  });
});

describe("boil and lumps", () => {
  it("is deterministic and 1 to 2 px per pose", () => {
    expect(boil(3, 5, 2)).toBe(boil(3, 5, 2));
    const all = Array.from({ length: 400 }, (_, i) => boil(1, i, 0, 1.5));
    expect(Math.max(...all.map(Math.abs))).toBeLessThanOrEqual(1.5);
    expect(Math.max(...all.map(Math.abs))).toBeGreaterThan(1);
    expect(new Set(all).size).toBeGreaterThan(300);
  });
  it("changes the outline per pose but not within one", () => {
    const pts = ellipsePts(0, 0, 50, 40);
    expect(blobPath(pts, 4, 3)).toBe(blobPath(pts, 4, 3));
    expect(blobPath(pts, 4, 3)).not.toBe(blobPath(pts, 4, 4));
    expect(blobPath(pts, 4, -1)).toBe(blobPath(pts, 4, -1));
  });
  it("builds closed paths for shapes", () => {
    for (const pts of [ellipsePts(0, 0, 10, 10), capsulePts(0, 0, 30, 0, 8), slabPts(0, 0, 40, 20, 6), sausagePts([[0, 0], [20, 10], [40, 0]], 6)]) {
      expect(closedSpline(pts)).toMatch(/^M.*Z$/);
      expect(closedSpline(pts)).not.toMatch(/NaN/);
    }
  });
});

describe("colour and counting", () => {
  it("shades towards warm white and brown", () => {
    expect(shade("#808080", 0)).toBe("#808080");
    expect(shade("#808080", 1)).toBe("#fff6e4");
    expect(shade("#808080", -1)).toBe("#2a160c");
  });
  it("counts up to exactly the value", () => {
    expect(countAt(0, 5, 30, 12.4, 1)).toBe(0);
    expect(countAt(100, 5, 30, 12.4, 1)).toBe(12.4);
  });
});

describe("clay letters", () => {
  it("has a glyph for every letter and digit", () => {
    for (const ch of "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%+-.,!?'") expect(GLYPHS[ch]).toBeTruthy();
  });
  it("lays out left to right and fits a width", () => {
    const { glyphs, width } = layoutLine("Hello, Tuck!");
    expect(glyphs.length).toBe(11);
    expect(glyphs.map((g) => g.x)).toEqual([...glyphs.map((g) => g.x)].sort((a, b) => a - b));
    expect(width).toBeGreaterThan(0);
    expect(fitUnit("A VERY LONG HEADLINE LINE", 118, 920) * layoutLine("A VERY LONG HEADLINE LINE").width).toBeLessThanOrEqual(920.001);
    expect(fitUnit("HI", 118, 920)).toBeCloseTo(118 / 6);
  });
});
