import { describe, expect, it } from "vitest";
import { bounceAt, drawingAt, dustAt, flickerAt, grainPixels, heldFrame, hosePath, irisRadius, piePath, scratchesAt, squash, weaveAt } from "./film";

describe("held-frame clock", () => {
  it("steps about 12 times a second at 30 fps and never runs ahead", () => {
    expect(drawingAt(30)).toBe(12);
    expect(Array.from({ length: 30 }, (_, f) => drawingAt(f)).filter((d, i, a) => i && d !== a[i - 1]).length).toBe(11);
    for (let f = 0; f < 200; f++) {
      expect(heldFrame(f)).toBeLessThanOrEqual(f);
      expect(f - heldFrame(f)).toBeLessThan(3);
    }
    expect(heldFrame(0)).toBe(0);
  });
});

describe("film damage", () => {
  it("is deterministic and bounded", () => {
    for (let d = 0; d < 300; d++) {
      expect(weaveAt(d, 1)).toEqual(weaveAt(d, 1));
      const w = weaveAt(d, 1);
      expect(Math.abs(w.x)).toBeLessThanOrEqual(5);
      expect(Math.abs(w.y)).toBeLessThanOrEqual(7);
      const f = flickerAt(d, 1);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(0.12);
      expect(dustAt(d, 1).length).toBeLessThanOrEqual(3);
      expect(scratchesAt(d, 1)).toEqual(scratchesAt(d, 1));
    }
  });
  it("has some scratches and some clean drawings", () => {
    const n = Array.from({ length: 300 }, (_, d) => scratchesAt(d, 0).length);
    expect(n.some((x) => x > 0)).toBe(true);
    expect(n.some((x) => x === 0)).toBe(true);
  });
  it("grain tile is seeded", () => {
    expect(grainPixels(16, 3)).toEqual(grainPixels(16, 3));
    expect(grainPixels(16, 3)).not.toEqual(grainPixels(16, 4));
  });
});

describe("rubber hose", () => {
  it("bounce stays in 0..1 and squash conserves roughly the area", () => {
    for (let f = 0; f < 90; f++) {
      const b = bounceAt(f);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
      const s = squash(b);
      expect(Math.abs(s.sx * s.sy - 1)).toBeLessThan(0.05);
    }
  });
  it("a limb bows when its ends come closer and is straight when stretched", () => {
    const straight = hosePath({ x: 0, y: 0 }, { x: 200, y: 0 }, 200);
    const slack = hosePath({ x: 0, y: 0 }, { x: 100, y: 0 }, 200);
    expect(straight.d).toBe("M0,0 C66.7,0 133.3,0 200,0");
    expect(slack.mid.y).not.toBe(0);
    const flipped = hosePath({ x: 0, y: 0 }, { x: 100, y: 0 }, 200, -1);
    expect(flipped.mid.y).toBe(-slack.mid.y);
  });
  it("pie eye is a closed path with a wedge removed", () => {
    expect(piePath(0, 0, 20, 30)).toMatch(/^M0,0 L.* A20,30 0 1 1 .* Z$/);
  });
});

describe("iris", () => {
  const o = { full: 1000, open: 18, close: 20, tail: 6, closeAt: 100 };
  it("opens from black, and closes to black before the last frames", () => {
    expect(irisRadius(0, { ...o, mode: "in" })).toBe(0);
    expect(irisRadius(18, { ...o, mode: "in" })).toBe(1000);
    expect(irisRadius(60, { ...o, mode: "out" })).toBe(1000);
    expect(irisRadius(94, { ...o, mode: "out" })).toBe(0);
    expect(irisRadius(99, { ...o, mode: "both" })).toBe(0);
  });
});
