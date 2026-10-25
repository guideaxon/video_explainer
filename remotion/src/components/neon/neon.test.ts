import { describe, expect, it } from "vitest";
import { BUZZ, flickerAt, gridRows, hash3, litSegments, mountainRange, powerOn, starfield, sunStripes, vhsTime, rectPath } from "./core";
import { TUBO_MOUTH } from "./character";
import { VISEMES } from "../rig";

describe("neon core", () => {
  it("hash3 is deterministic and in 0..1", () => {
    expect(hash3(1, 2, 3)).toBe(hash3(1, 2, 3));
    for (let i = 0; i < 50; i++) { const h = hash3(i, 9, 4); expect(h).toBeGreaterThanOrEqual(0); expect(h).toBeLessThan(1); }
  });
  it("flicker is pure, mostly lit, and uses the buzz pattern", () => {
    const a = Array.from({ length: 900 }, (_, f) => flickerAt(f, 3, 0.5));
    expect(a).toEqual(Array.from({ length: 900 }, (_, f) => flickerAt(f, 3, 0.5)));
    expect(a.some((v) => v < 1)).toBe(true);
    expect(a.filter((v) => v === 1).length).toBeGreaterThan(600);
    expect(a.every((v) => v === 1 || BUZZ.includes(v))).toBe(true);
    expect(Array.from({ length: 900 }, (_, f) => flickerAt(f, 3, 0)).every((v) => v === 1)).toBe(true);
  });
  it("powerOn is 0 before start and 1 after the stutter", () => {
    expect(powerOn(-1, 0)).toBe(0);
    expect(powerOn(40, 0)).toBe(1);
  });
  it("grid rows loop every 1/speed frames and recede upward", () => {
    const a = gridRows(0, 1180, 1920, 0.04);
    const b = gridRows(25, 1180, 1920, 0.04);
    expect(a.map((r) => r.y.toFixed(3))).toEqual(b.map((r) => r.y.toFixed(3)));
    for (let i = 1; i < a.length; i++) expect(a[i].y).toBeLessThan(a[i - 1].y);
    expect(a.every((r) => r.y > 1180)).toBe(true);
  });
  it("sun stripes thicken toward the bottom and stay inside the disc", () => {
    const s = sunStripes(10).sort((p, q) => p.y - q.y);
    expect(s[s.length - 1].h).toBeGreaterThan(s[0].h);
    expect(s.every((x) => x.y >= 0 && x.y <= 1.01)).toBe(true);
  });
  it("starfield is seeded and inside the box", () => {
    const a = starfield(40, 1080, 1000, 5);
    expect(a).toEqual(starfield(40, 1080, 1000, 5));
    expect(a.every((s) => s.x >= 0 && s.x < 1080 && s.y >= 0 && s.y < 1000)).toBe(true);
  });
  it("mountains stay above the horizon", () => {
    const m = mountainRange(1080, 1180, 230, 3);
    const ys = [...m.ridge.matchAll(/[ML][\d.]+ ([\d.]+)/g)].map((x) => Number(x[1]));
    expect(ys.every((y) => y <= 1180)).toBe(true);
  });
  it("equaliser lit segments are exact and bounded", () => {
    expect(litSegments(36, 36, 14, 1)).toBe(14);
    expect(litSegments(18, 36, 14, 1)).toBe(7);
    expect(litSegments(18, 36, 14, 0)).toBe(0);
    expect(litSegments(99, 36, 14, 1)).toBe(14);
  });
  it("vhs time formats", () => { expect(vhsTime(30 * 65, 30)).toBe("0:01:05"); });
  it("rectPath closes", () => { expect(rectPath(0, 0, 10, 10, 2).endsWith("Z")).toBe(true); });
  it("Tubo draws a mouth for every Rhubarb shape", () => {
    for (const v of VISEMES) expect(TUBO_MOUTH[v].length).toBeGreaterThan(5);
    expect(new Set(VISEMES.map((v) => TUBO_MOUTH[v])).size).toBe(VISEMES.length);
  });
});
