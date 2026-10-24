/**
 * The washing machine's truth: a small pure model. The drawing, the display, the readout and the door lock all read
 * this one state, so nothing the figure shows can disagree with how the machine works. No imports, no DOM.
 *
 * Time: one real second is SPEED virtual minutes (a time-lapse), so a 86 min cotton cycle plays in about 9 s.
 */
export type Phase = "idle" | "fill" | "wash" | "rinse" | "spin" | "done";
export type Program = { name: string; temp: number; fill: number; wash: number; rinse: number; spin: number; rpm: number };

export const SPEED = 10;
export const PROGRAMS: Program[] = [
  { name: "cotton", temp: 40, fill: 4, wash: 45, rinse: 25, spin: 12, rpm: 1200 },
  { name: "quick", temp: 30, fill: 2, wash: 12, rinse: 6, spin: 5, rpm: 1000 },
  { name: "delicates", temp: 20, fill: 3, wash: 20, rinse: 15, spin: 4, rpm: 600 },
  { name: "rinse + spin", temp: 0, fill: 3, wash: 0, rinse: 12, spin: 8, rpm: 1400 },
];
const ORDER: Phase[] = ["fill", "wash", "rinse", "spin"];
const TUMBLE_RPM = 45;

export type WState = {
  power: boolean; prog: number; phase: Phase; elapsed: number; paused: boolean;
  water: number; // 0..1 of the drum's height
  doorOpen: boolean; doorAmt: number; // 0 closed .. 1 open (animated)
  angle: number; rpm: number; knob: number; // knob in degrees, eased
  msg: string; msgAge: number;
};

export const init = (): WState => ({
  power: false, prog: 0, phase: "idle", elapsed: 0, paused: false, water: 0, doorOpen: false, doorAmt: 0,
  angle: 0, rpm: 0, knob: 0, msg: "", msgAge: 99,
});

export const phaseLen = (p: Phase, prog: Program) => (p === "idle" || p === "done" ? 0 : prog[p]);
export const running = (s: WState) => s.phase !== "idle" && s.phase !== "done";
/** The door stays locked while a cycle runs (even paused) and while there is water in the drum. */
export const locked = (s: WState) => running(s) || s.water > 0.05;

export const timeLeft = (s: WState) => {
  const prog = PROGRAMS[s.prog];
  const from = s.phase === "idle" || s.phase === "done" ? 0 : ORDER.indexOf(s.phase);
  let left = s.phase === "idle" || s.phase === "done" ? 0 : phaseLen(s.phase, prog) - s.elapsed;
  for (let i = s.phase === "idle" || s.phase === "done" ? 0 : from + 1; i < ORDER.length; i++) left += phaseLen(ORDER[i], prog);
  return left;
};
export const totalMinutes = (prog: Program) => prog.fill + prog.wash + prog.rinse + prog.spin;

const say = (s: WState, msg: string): WState => ({ ...s, msg, msgAge: 0 });

/** One press of a control. Controls: power, program, start, door. Refusals say why. */
export const act = (s: WState, id: string): WState => {
  switch (id) {
    case "power":
      if (running(s)) return say({ ...s, power: false, phase: "idle", elapsed: 0, paused: false }, "cancelled · power off");
      return { ...s, power: !s.power, msg: "", msgAge: 99 };
    case "program":
      if (!s.power) return say(s, "power is off");
      if (running(s)) return say(s, "can't change program while running");
      return { ...s, prog: (s.prog + 1) % PROGRAMS.length, phase: "idle", msg: "", msgAge: 99 };
    case "start":
      if (!s.power) return say(s, "power is off");
      if (running(s)) return say({ ...s, paused: !s.paused }, s.paused ? "resumed" : "paused");
      if (s.doorOpen) return say(s, "close the door first");
      return say({ ...s, phase: "fill", elapsed: 0, paused: false }, "started · door locked");
    case "door":
      if (locked(s)) return say(s, running(s) ? "door locked while running" : "door locked · water inside");
      return { ...s, doorOpen: !s.doorOpen, phase: s.phase === "done" ? "idle" : s.phase, msg: "", msgAge: 99 };
    default:
      return s;
  }
};

const follow = (v: number, to: number, rate: number) => v + (to - v) * Math.min(1, rate);

export const tick = (s: WState, dt: number): WState => {
  // at rest nothing changes: return the same object so the runtime does not redraw
  const atRest = !running(s) && s.knob === s.prog * 40 && s.doorAmt === (s.doorOpen ? 1 : 0) && s.water === 0 && s.rpm === 0;
  if (atRest && s.msgAge >= 3) return s;
  const n = { ...s, msgAge: s.msgAge + dt };
  const prog = PROGRAMS[s.prog];
  n.knob = Math.abs(s.prog * 40 - s.knob) < 0.1 ? s.prog * 40 : follow(s.knob, s.prog * 40, dt * 8);
  const doorTo = s.doorOpen ? 1 : 0;
  n.doorAmt = Math.max(0, Math.min(1, s.doorAmt + Math.max(-dt * 3, Math.min(dt * 3, doorTo - s.doorAmt))));

  let rpmTo = 0;
  if (running(s) && !s.paused) {
    n.elapsed = s.elapsed + dt * SPEED;
    let len = phaseLen(n.phase, prog);
    while (running(n) && n.elapsed >= len) {
      n.elapsed -= len;
      let next: Phase = "done";
      for (let j = ORDER.indexOf(n.phase) + 1; j < ORDER.length; j++) if (phaseLen(ORDER[j], prog) > 0) { next = ORDER[j]; break; }
      n.phase = next;
      len = phaseLen(next, prog);
      if (next === "done") { n.elapsed = 0; n.msg = "done · door unlocked"; n.msgAge = 0; }
    }
    const u = running(n) ? n.elapsed / phaseLen(n.phase, prog) : 0;
    if (n.phase === "fill") n.water = u;
    else if (n.phase === "wash") n.water = 1;
    else if (n.phase === "rinse") n.water = u < 0.4 ? 1 - (u / 0.4) * 0.7 : 0.3 + ((u - 0.4) / 0.6) * 0.7; // drain, then refill with fresh water
    else if (n.phase === "spin") n.water = u < 0.25 ? 1 - u / 0.25 : 0;
    const tumble = Math.sin(n.elapsed * 0.45) >= 0 ? 1 : -1; // reverses direction so the load does not tangle
    if (n.phase === "wash" || n.phase === "rinse") rpmTo = TUMBLE_RPM * tumble;
    else if (n.phase === "spin") rpmTo = prog.rpm * Math.min(1, u / 0.3);
  } else if (!running(s)) {
    n.water = Math.max(0, s.water - dt * 0.4); // the pump empties whatever is left
  }
  n.rpm = follow(s.rpm, rpmTo, dt * 4);
  if (Math.abs(n.rpm) < 0.05) n.rpm = 0;
  // the picture caps the drum's visible speed (a 1200 rpm spin would only flicker)
  n.angle = s.angle + Math.max(-90, Math.min(90, n.rpm)) * 6 * dt;
  return n;
};

export const readout = (s: WState) => {
  if (s.msg && s.msgAge < 2.5) return s.msg;
  if (!s.power) return "off";
  const p = PROGRAMS[s.prog];
  const label = `${p.name} ${p.temp ? p.temp + "°" : "cold"}`;
  if (!running(s)) return `${s.phase === "done" ? "done" : "ready"} · ${label} · ${totalMinutes(p)} min${s.doorOpen ? " · door open" : ""}`;
  return `${label} · ${s.paused ? "paused" : s.phase} · ${Math.ceil(timeLeft(s))} min left · ${Math.round(Math.abs(s.rpm))} rpm`;
};

export const announce = (s: WState) => {
  if (s.msg && s.msgAge < 2.5) return s.msg;
  if (!s.power) return "off";
  return `${PROGRAMS[s.prog].name}, ${running(s) ? (s.paused ? "paused" : s.phase) : s.phase === "done" ? "done" : "ready"}`;
};
