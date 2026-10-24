/**
 * The robot's truth: a small pure model. The drawing, the readout, the sounds and the callouts all read this one state,
 * so nothing the figure shows can disagree with what the robot is doing. No imports, no DOM.
 *
 * Each action is a timer in seconds (-1 = not running). The robot is never quite at rest: `t` keeps running so it can
 * blink on its own (the idle rhythm is drawn by figure.tsx from the shared rig contract).
 */
export const RAISE = 0.5; // seconds to raise (and to lower) the arm
export const WAVES = 3;
export const WAVE_PERIOD = 0.5; // one wave of the forearm, out and back
export const WAVE_TIME = RAISE * 2 + WAVES * WAVE_PERIOD; // 2.5 s
export const TALK_TIME = 2.5;
export const BLINK_TIME = 0.24;
export const UPPER_UP = 95; // shoulder angle with the arm raised, degrees from hanging
export const ELBOW_UP = 85; // extra elbow bend with the arm raised: the forearm points straight up
export const WAVE_SWING = 25; // forearm swing either side while waving

export type RState = {
  t: number; // seconds since the page opened
  wave: number; talk: number; blink: number; // action timers, -1 when idle
  antenna: boolean; glow: number; // glow eases 0..1 toward the switch
  sound: boolean;
  msg: string; msgAge: number;
};

export const init = (): RState => ({ t: 0, wave: -1, talk: -1, blink: -1, antenna: false, glow: 0, sound: true, msg: "", msgAge: 99 });

export const waving = (s: RState) => s.wave >= 0;
export const talking = (s: RState) => s.talk >= 0;
export const blinking = (s: RState) => s.blink >= 0;

const say = (s: RState, msg: string): RState => ({ ...s, msg, msgAge: 0 });

/** One press of a control. Controls: wave, blink, talk, antenna, sound. A press that cannot start says why. */
export const act = (s: RState, id: string): RState => {
  switch (id) {
    case "wave":
      return waving(s) ? say(s, "already waving") : { ...s, wave: 0, msg: "", msgAge: 99 };
    case "blink":
      return blinking(s) ? say(s, "already blinking") : { ...s, blink: 0, msg: "", msgAge: 99 };
    case "talk":
      return talking(s) ? say(s, "already talking") : { ...s, talk: 0, msg: "", msgAge: 99 };
    case "antenna":
      return { ...s, antenna: !s.antenna, msg: "", msgAge: 99 };
    case "sound":
      return { ...s, sound: !s.sound, msg: "", msgAge: 99 };
    default:
      return s;
  }
};

const step = (v: number, dt: number, len: number) => (v < 0 ? -1 : v + dt >= len ? -1 : v + dt);

export const tick = (s: RState, dt: number): RState => {
  const to = s.antenna ? 1 : 0;
  const glow = Math.abs(to - s.glow) < 0.01 ? to : s.glow + (to - s.glow) * Math.min(1, dt * 8);
  return { ...s, t: s.t + dt, msgAge: s.msgAge + dt, wave: step(s.wave, dt, WAVE_TIME), talk: step(s.talk, dt, TALK_TIME), blink: step(s.blink, dt, BLINK_TIME), glow };
};

const ease = (u: number) => { const c = Math.max(0, Math.min(1, u)); return c * c * (3 - 2 * c); };

/**
 * Arm pose in degrees: `upper` is the shoulder angle from hanging (positive raises the arm out to the side), `fore` the
 * elbow bend on top of it. Raise, wave the forearm WAVES times, lower. `still` (reduced motion) holds the raised pose.
 */
export const armPose = (s: RState, still = false) => {
  if (!waving(s)) return { upper: 0, fore: 0 };
  const w = s.wave;
  if (still) return { upper: UPPER_UP, fore: ELBOW_UP };
  if (w < RAISE) { const e = ease(w / RAISE); return { upper: UPPER_UP * e, fore: ELBOW_UP * e }; }
  const back = WAVE_TIME - RAISE;
  if (w >= back) { const e = 1 - ease((w - back) / RAISE); return { upper: UPPER_UP * e, fore: ELBOW_UP * e }; }
  return { upper: UPPER_UP, fore: ELBOW_UP + WAVE_SWING * Math.sin(((w - RAISE) / WAVE_PERIOD) * Math.PI * 2) };
};

/** Eyelid closure from a pressed blink, 0 open .. 1 shut (the idle blink is added by the drawing). */
export const lid = (s: RState) => (blinking(s) ? Math.sin((s.blink / BLINK_TIME) * Math.PI) : 0);

export const readout = (s: RState) => {
  if (s.msg && s.msgAge < 2.5) return s.msg;
  const doing = [waving(s) && "waving", talking(s) && "talking", blinking(s) && "blinking"].filter(Boolean);
  return [doing.length ? doing.join(" · ") : "idle", `antenna ${s.antenna ? "on" : "off"}`, !s.sound && "muted"].filter(Boolean).join(" · ");
};

export const announce = (s: RState) => {
  if (s.msg && s.msgAge < 2.5) return s.msg;
  const doing = [waving(s) && "waving", talking(s) && "talking"].filter(Boolean);
  return `${doing.length ? doing.join(" and ") : "idle"}, antenna light ${s.antenna ? "on" : "off"}${s.sound ? "" : ", muted"}`;
};
