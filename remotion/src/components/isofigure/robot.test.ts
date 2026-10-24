import { describe, expect, it } from "vitest";
import { act, armPose, BLINK_TIME, init, lid, readout, TALK_TIME, tick, UPPER_UP, WAVE_TIME, blinking, talking, waving } from "../../../../templates/isofigure_robot/model";
import type { RState } from "../../../../templates/isofigure_robot/model";

const run = (s: RState, seconds: number, dt = 0.02) => { for (let t = 0; t < seconds - 1e-9; t += dt) s = tick(s, dt); return s; };

describe("robot model", () => {
  it("waves: raises the arm, swings the forearm, lowers it and stops after WAVE_TIME", () => {
    let s = act(init(), "wave");
    expect(waving(s)).toBe(true);
    const fores: number[] = [];
    let maxUpper = 0, t = 0;
    while (waving(s) && t < 10) { s = tick(s, 0.02); t += 0.02; const p = armPose(s); maxUpper = Math.max(maxUpper, p.upper); fores.push(p.fore); }
    expect(Math.abs(t - WAVE_TIME)).toBeLessThan(0.05);
    expect(maxUpper).toBeCloseTo(UPPER_UP, 0);
    expect(Math.max(...fores) - Math.min(...fores.filter((f) => f > 40))).toBeGreaterThan(30); // the forearm really swings
    expect(armPose(s)).toEqual({ upper: 0, fore: 0 });
  });

  it("refuses a second wave or talk while one runs, and says why", () => {
    const w = act(act(init(), "wave"), "wave");
    expect(w.msg).toBe("already waving");
    expect(readout(w)).toBe("already waving");
    expect(w.wave).toBe(0); // not restarted
    const t = act(run(act(init(), "talk"), 1), "talk");
    expect(t.msg).toBe("already talking");
    expect(t.talk).toBeGreaterThan(0.9);
  });

  it("talks for TALK_TIME, then falls quiet; it can wave and talk at once", () => {
    let s = act(act(init(), "talk"), "wave");
    expect(readout(s)).toBe("waving · talking · antenna off");
    s = run(s, TALK_TIME - 0.1);
    expect(talking(s)).toBe(true);
    s = run(s, 0.2);
    expect(talking(s)).toBe(false);
    expect(act(s, "talk").talk).toBe(0); // can talk again
  });

  it("blinks: the eyes close and open again", () => {
    let s = act(init(), "blink");
    expect(lid(s)).toBe(0);
    s = run(s, BLINK_TIME / 2, BLINK_TIME / 20);
    expect(lid(s)).toBeGreaterThan(0.95);
    expect(act(s, "blink").msg).toBe("already blinking");
    s = run(s, BLINK_TIME);
    expect(blinking(s)).toBe(false);
    expect(lid(s)).toBe(0);
  });

  it("toggles the antenna light, whose glow eases on and off", () => {
    let s = act(init(), "antenna");
    expect(s.antenna).toBe(true);
    expect(s.glow).toBe(0);
    s = run(s, 1);
    expect(s.glow).toBe(1);
    expect(readout(s)).toBe("idle · antenna on");
    s = run(act(s, "antenna"), 1);
    expect(s.antenna).toBe(false);
    expect(s.glow).toBe(0);
  });

  it("mutes and unmutes the sound effects", () => {
    const s = act(init(), "sound");
    expect(s.sound).toBe(false);
    expect(readout(s)).toBe("idle · antenna off · muted");
    expect(act(s, "sound").sound).toBe(true);
  });

  it("holds the raised pose without swinging under reduced motion", () => {
    const s = run(act(init(), "wave"), 1);
    expect(armPose(s, true)).toEqual(armPose(run(s, 0.2), true));
    expect(armPose(s, true).upper).toBe(UPPER_UP);
  });
});
