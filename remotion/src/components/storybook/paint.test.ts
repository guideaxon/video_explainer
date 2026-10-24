import { describe, expect, it } from "vitest";
import { cameraAt, edgeColor, feetAt, grainTile, groundAt, litColor, mixHex, MOVES, parseHex, shadowColor, stillToScreen, valueNoise, wobbleTile } from "./paint";

describe("camera", () => {
  it("starts and ends each move where MOVES says", () => {
    for (const move of Object.keys(MOVES) as (keyof typeof MOVES)[]) {
      expect(cameraAt(move, 0)).toEqual({ scale: MOVES[move].s[0], x: MOVES[move].x[0] });
      expect(cameraAt(move, 1)).toEqual({ scale: MOVES[move].s[1], x: MOVES[move].x[1] });
    }
  });
  it("maps still points like the CSS transform about the frame centre", () => {
    expect(stillToScreen([640, 360], { scale: 1.08, x: -20 })).toEqual([620, 360]);
    const [sx, sy] = stillToScreen([300, 650], { scale: 1.08, x: -20 });
    expect(sx).toBeCloseTo(640 + (300 - 640) * 1.08 - 20);
    expect(sy).toBeCloseTo(360 + 290 * 1.08);
    expect(stillToScreen([300, 650], { scale: 1, x: 0 })).toEqual([300, 650]);
  });
});

describe("colour", () => {
  it("parses and mixes hex", () => {
    expect(parseHex("#c8553d")).toEqual([200, 85, 61]);
    expect(parseHex("#fff")).toEqual([255, 255, 255]);
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#2f7d80", "#ffffff", 0)).toBe("#2f7d80");
    expect(mixHex("#2f7d80", "#ffffff", 2)).toBe("#ffffff");
  });
  it("warms or cools a paint with the light, and tints towards the still", () => {
    const [r1, , b1] = parseHex(litColor("#888888", { warmth: 1 }));
    expect(r1).toBeGreaterThan(b1);
    const [r2, , b2] = parseHex(litColor("#888888", { warmth: 0 }));
    expect(b2).toBeGreaterThan(r2);
    expect(litColor("#888888", { warmth: 0.5 })).toBe("#888888");
    expect(litColor("#888888", { warmth: 0.5, tint: "#ff0000" })).not.toBe("#888888");
  });
  it("keeps shadows and edges coloured, never black", () => {
    expect(shadowColor("#3a2a20")).not.toBe("#000000");
    const [r, g, b] = parseHex(edgeColor("#2f7d80"));
    expect(r + g + b).toBeGreaterThan(60);
    expect(g).toBeLessThan(0x7d);
  });
});

describe("textures", () => {
  it("value noise is deterministic, in range and tiles without a seam", () => {
    const n = valueNoise(64, 3);
    expect(valueNoise(64, 3)).toEqual(n);
    expect(valueNoise(64, 4)).not.toEqual(n);
    let lo = 1;
    let hi = 0;
    for (const v of n) {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    expect(lo).toBeGreaterThanOrEqual(0);
    expect(hi).toBeLessThanOrEqual(1);
    expect(hi - lo).toBeGreaterThan(0.3);
    // the left and right columns are neighbours across the seam: as close as interior neighbours
    let seam = 0;
    let inner = 0;
    for (let y = 0; y < 64; y++) {
      seam += Math.abs(n[y * 64 + 63] - n[y * 64]);
      inner += Math.abs(n[y * 64 + 31] - n[y * 64 + 32]);
    }
    expect(seam).toBeLessThan(inner * 3 + 0.5);
  });
  it("grain is ink coloured, mostly transparent with some pigment", () => {
    const px = grainTile(64, 1, "#3a2a20");
    expect(px.length).toBe(64 * 64 * 4);
    expect([px[0], px[1], px[2]]).toEqual([0x3a, 0x2a, 0x20]);
    const alphas = Array.from({ length: 64 * 64 }, (_, k) => px[k * 4 + 3]);
    const mean = alphas.reduce((a, b) => a + b, 0) / alphas.length;
    expect(mean).toBeGreaterThan(5);
    expect(mean).toBeLessThan(120);
  });
  it("wobble map is opaque and centred on mid grey", () => {
    const px = wobbleTile(64, 2);
    let sum = 0;
    for (let k = 0; k < 64 * 64; k++) {
      expect(px[k * 4 + 3]).toBe(255);
      sum += px[k * 4];
    }
    expect(sum / (64 * 64)).toBeGreaterThan(90);
    expect(sum / (64 * 64)).toBeLessThan(165);
  });
});

describe("pose", () => {
  it("walks the ground point between the two marks and faces the walk", () => {
    expect(groundAt(300, 650, 0, 900)).toEqual({ x: 300, y: 650, faceLeft: false });
    expect(groundAt(300, 650, 0.5, 900, 600)).toEqual({ x: 600, y: 625, faceLeft: false });
    expect(groundAt(900, 650, 1, 300).faceLeft).toBe(true);
    expect(groundAt(300, 650, 0.7)).toEqual({ x: 300, y: 650, faceLeft: false });
  });
  it("plants both feet at every footfall (multiples of PI) and lifts one between", () => {
    for (const k of [0, 1, 2, 5]) {
      const f = feetAt(k * Math.PI, true);
      expect(f.l.lift).toBeCloseTo(0);
      expect(f.r.lift).toBeCloseTo(0);
      expect(Math.abs(f.l.x)).toBeCloseTo(16);
    }
    const mid = feetAt(Math.PI / 2, true);
    expect(mid.l.lift).toBeGreaterThan(0);
    expect(mid.r.lift).toBe(0);
    expect(feetAt(1, false)).toEqual({ l: { x: 0, lift: 0 }, r: { x: 0, lift: 0 } });
  });
});
