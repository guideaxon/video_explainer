import { describe, expect, it } from "vitest";
import { layoutCallouts } from "./callout";
import { edgeWidth } from "./paper";
import { faceTone, LIGHT } from "./iso";
import { pokeAge, pokeKick, NO_UI } from "./ui";
import { buildScore, MAJ, MIN } from "./music";
import { clipAt, duckAt, voiceNow, DUCK, DUCK_RAMP } from "./voice";
import type { Voice } from "./voice";
import { VISEME_OPEN } from "../rig";

const lum = (rgb: string) => (rgb.match(/\d+/g) ?? []).slice(0, 3).map(Number).reduce((a, b) => a + b, 0);

describe("callout layout", () => {
  const items = [
    { label: "A", x: 100, y: 400 }, { label: "B", x: 200, y: 410 }, { label: "C", x: 300, y: 405 },
    { label: "D", x: 900, y: 100 }, { label: "E", x: 1000, y: 110 },
  ];
  const out = layoutCallouts(items);
  it("keeps pills in each column at least 44px apart and in target-height order (leaders cannot cross)", () => {
    for (const left of [true, false]) {
      const col = out.filter((o) => o.left === left).sort((a, b) => a.item.y - b.item.y);
      for (let i = 1; i < col.length; i++) expect(col[i].py - col[i - 1].py).toBeGreaterThanOrEqual(44);
    }
  });
  it("puts targets left of centre in the left column", () => {
    expect(out.filter((o) => o.left).map((o) => o.item.label).sort()).toEqual(["A", "B", "C"]);
  });
});

describe("edge weight", () => {
  const sq = (s: number): [number, number][] => [[0, 0], [s, 0], [s, s], [0, s]];
  it("grows with part size and stays within bounds", () => {
    expect(edgeWidth(sq(8))).toBeLessThan(edgeWidth(sq(60)));
    expect(edgeWidth(sq(60))).toBeLessThan(edgeWidth(sq(400)));
    expect(edgeWidth(sq(5000))).toBeLessThanOrEqual(2.1);
    expect(edgeWidth(sq(1))).toBeGreaterThanOrEqual(0.45);
  });
});

describe("iso face shading", () => {
  it("lights the top most, the left face next and the right face least", () => {
    const top = lum(faceTone("#a59d8a", [0, 0, 1], LIGHT));
    const left = lum(faceTone("#a59d8a", [0, 1, 0], LIGHT));
    const right = lum(faceTone("#a59d8a", [1, 0, 0], LIGHT));
    expect(top).toBeGreaterThan(left);
    expect(left).toBeGreaterThan(right);
  });
});

describe("pokes", () => {
  const ui = { ...NO_UI, wall: 10, pokes: [{ kind: "flower" as const, id: "3-4", wall: 9 }, { kind: "star" as const, id: "star", wall: 9.5 }] };
  it("measures time since the latest matching poke", () => {
    expect(pokeAge(ui, "flower", "3-4")).toBe(1);
    expect(pokeAge(ui, "flower", "9-9")).toBe(Infinity);
    expect(pokeAge(ui, "star")).toBe(0.5);
  });
  it("lets an id of * hit every flower", () => {
    expect(pokeAge({ ...ui, pokes: [{ kind: "flower", id: "*", wall: 9 }] }, "flower", "any")).toBe(1);
  });
  it("decays from 1 to 0", () => {
    expect(pokeKick(0)).toBe(1);
    expect(pokeKick(5)).toBe(0);
    expect(pokeKick(0.7, 1.4)).toBeCloseTo(0.25);
  });
});

describe("score", () => {
  const ev = buildScore({ prog: [[[48, MAJ], [55, MAJ]], [[45, MIN], [53, MAJ]]], pluck: [1, 1], bell: [0, 0], seed: 1 });
  it("is sorted by time and deterministic", () => {
    for (let i = 1; i < ev.length; i++) expect(ev[i].t).toBeGreaterThanOrEqual(ev[i - 1].t);
    expect(buildScore({ prog: [[[48, MAJ], [55, MAJ]], [[45, MIN], [53, MAJ]]], pluck: [1, 1], bell: [0, 0], seed: 1 })).toEqual(ev);
  });
  it("lasts 3 s per bar", () => {
    expect(Math.max(...ev.filter((e) => e.k === "pad").map((e) => e.t))).toBe(9);
  });
});

describe("callout layout near the bottom", () => {
  it("keeps every pill inside the frame", () => {
    const low = [0, 1, 2, 3, 4, 5].map((i) => ({ label: `L${i}`, x: 900, y: 600 + i * 10 }));
    for (const o of layoutCallouts(low)) expect(o.py).toBeLessThanOrEqual(690);
    const col = layoutCallouts(low).sort((a, b) => a.py - b.py);
    for (let i = 1; i < col.length; i++) expect(col[i].py - col[i - 1].py).toBeGreaterThanOrEqual(44);
  });
});

describe("voice timing", () => {
  const clip = (dur: number) => ({ id: "c", text: "hi", src: "", dur, mouth: [0, 0.5, 1, 0.5], visemes: "XBDC" });
  const v: Voice = { fps: 30, clips: [clip(2), null, clip(9)] };
  it("plays clip i from the start of scene i, cut at the scene end", () => {
    expect(clipAt(v, 1, 6)).toEqual({ i: 0, local: 1 });
    expect(clipAt(v, 2.5, 6)).toBeNull(); // clip 0 is over
    expect(clipAt(v, 7, 6)).toBeNull(); // silent scene
    expect(clipAt(v, 17.9, 6)?.i).toBe(2);
    expect(clipAt(v, 18.1, 6)).toBeNull(); // 9 s clip cut at the 6 s scene end
    expect(clipAt(undefined, 1, 6)).toBeNull();
  });
  it("ducks the music by 9 dB inside a clip and ramps either side", () => {
    expect(duckAt(v, 1, 6)).toBeCloseTo(DUCK);
    expect(DUCK).toBeCloseTo(0.355, 2);
    expect(duckAt(v, 2 + DUCK_RAMP / 2, 6)).toBeCloseTo((1 + DUCK) / 2);
    expect(duckAt(v, 4, 6)).toBe(1);
    expect(duckAt(v, 12 - DUCK_RAMP / 2, 6)).toBeCloseTo((1 + DUCK) / 2); // ramps down before the next clip
    expect(duckAt(undefined, 1, 6)).toBe(1);
  });
  it("gives the scene's mouth by scene-local frame, closed outside the clip", () => {
    expect(voiceNow(v, 0, 2 / 30 + 0.001, 6)).toMatchObject({ viseme: "D", open: VISEME_OPEN.D, talking: true, frame: 2 });
    expect(voiceNow(v, 0, 3, 6)).toMatchObject({ open: 0, viseme: "X", talking: false });
    expect(voiceNow(v, 1, 0, 6)).toBeNull();
    expect(voiceNow({ fps: 30, clips: [{ ...clip(2), visemes: undefined }] }, 0, 2 / 30 + 0.001, 6)?.open).toBe(1);
  });
});
