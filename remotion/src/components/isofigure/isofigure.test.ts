import { describe, expect, it } from "vitest";
import { act, init, locked, PROGRAMS, running, SPEED, tick, totalMinutes } from "../../../../templates/isofigure_figure/model";
import type { Phase, WState } from "../../../../templates/isofigure_figure/model";
import { faceTone, fitIso, LIGHT, W, H } from "./iso";
import { layoutPills } from "./callout";

const run = (s: WState, seconds: number, dt = 0.05) => { for (let t = 0; t < seconds; t += dt) s = tick(s, dt); return s; };
const lum = (c: string) => (c.match(/\d+/g) ?? []).slice(0, 3).map(Number).reduce((a, b) => a + b, 0);
const started = () => act(act(init(), "power"), "start");

describe("washing machine model", () => {
  it("refuses to start with the power off or the door open", () => {
    expect(act(init(), "start").phase).toBe("idle");
    expect(act(init(), "start").msg).toBe("power is off");
    const open = act(act(init(), "power"), "door");
    expect(open.doorOpen).toBe(true);
    const tried = act(open, "start");
    expect(tried.phase).toBe("idle");
    expect(tried.msg).toBe("close the door first");
  });

  it("locks the door and the program while a cycle runs", () => {
    const s = started();
    expect(running(s) && locked(s)).toBe(true);
    expect(act(s, "door").doorOpen).toBe(false);
    expect(act(s, "door").msg).toBe("door locked while running");
    expect(act(s, "program").prog).toBe(0);
  });

  it("runs the whole program in total/SPEED seconds, then unlocks the door", () => {
    let s = started();
    const seen = new Set<Phase>();
    let t = 0;
    while (running(s) && t < 30) { s = tick(s, 0.05); seen.add(s.phase); t += 0.05; }
    expect(s.phase).toBe("done");
    expect(Math.abs(t - totalMinutes(PROGRAMS[0]) / SPEED)).toBeLessThan(0.4);
    expect([...seen]).toEqual(expect.arrayContaining(["fill", "wash", "rinse", "spin"]));
    s = run(s, 1);
    expect(locked(s)).toBe(false);
    expect(act(s, "door").doorOpen).toBe(true);
  });

  it("fills before washing and reaches the program's spin speed", () => {
    let s = started();
    let maxRpm = 0, washedEmpty = false;
    while (running(s)) {
      s = tick(s, 0.05);
      maxRpm = Math.max(maxRpm, Math.abs(s.rpm));
      if (s.phase === "wash" && s.water < 0.99) washedEmpty = true;
    }
    expect(washedEmpty).toBe(false);
    expect(maxRpm).toBeGreaterThan(PROGRAMS[0].rpm * 0.95);
  });

  it("skips the wash phase for rinse + spin", () => {
    let s = act(act(act(act(init(), "power"), "program"), "program"), "program");
    expect(PROGRAMS[s.prog].name).toBe("rinse + spin");
    s = act(s, "start");
    const seen = new Set<Phase>();
    while (running(s)) { s = tick(s, 0.05); seen.add(s.phase); }
    expect(seen.has("wash")).toBe(false);
  });

  it("pauses and resumes, and power-off cancels the cycle and drains the water", () => {
    let s = run(started(), 2);
    const e = s.elapsed;
    s = act(s, "start");
    expect(s.paused).toBe(true);
    expect(run(s, 1).elapsed).toBe(e);
    s = act(run(s, 0.1), "power");
    expect(s.phase).toBe("idle");
    s = run(s, 4);
    expect(s.water).toBe(0);
    expect(locked(s)).toBe(false);
  });

  it("returns the same object when at rest, so the runtime does not redraw", () => {
    const s = run(act(init(), "power"), 3.5);
    expect(tick(s, 0.016)).toBe(s);
  });
});

describe("isofigure kit", () => {
  it("fits all corners inside the view", () => {
    const pts: [number, number, number][] = [];
    for (const x of [0, 190]) for (const y of [0, 170]) for (const z of [-9, 250]) pts.push([x, y, z]);
    const o = fitIso(pts, W, H, 60);
    for (const p of pts) {
      const [sx, sy] = o.P(...p);
      expect(sx).toBeGreaterThanOrEqual(59.9); expect(sx).toBeLessThanOrEqual(W - 59.9);
      expect(sy).toBeGreaterThanOrEqual(59.9); expect(sy).toBeLessThanOrEqual(H - 59.9);
    }
  });
  it("shades the top lightest and the right face darkest", () => {
    const [t, l, r] = [[0, 0, 1], [0, 1, 0], [1, 0, 0]].map((n) => lum(faceTone("#ece7d9", n, LIGHT)));
    expect(t).toBeGreaterThan(l);
    expect(l).toBeGreaterThan(r);
  });
  it("keeps callout pills apart, in column order, inside the view", () => {
    const items = Array.from({ length: 7 }, (_, i) => ({ label: `L${i}`, x: 100, y: 500 + i }));
    const out = layoutPills(items).sort((a, b) => a.py - b.py);
    for (let i = 1; i < out.length; i++) expect(out[i].py - out[i - 1].py).toBeGreaterThanOrEqual(40);
    expect(out[out.length - 1].py).toBeLessThanOrEqual(520);
  });
});
