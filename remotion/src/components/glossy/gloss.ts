/**
 * Pure helpers for the Glossy style bundle kit (no React, no drawing): colour mixing for the gradient stops,
 * safe gradient ids, springy squash-and-stretch, the toy's arm poses per gesture and its feet in the walk cycle.
 * Tested in glossy.test.ts. See docs/glossy_video_style_guide.md.
 */

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

const toRgb = (hex: string): [number, number, number] => {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) => `#${rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;

/** Linear mix of two hex colours (t = 0 gives a, 1 gives b). */
export const mix = (a: string, b: string, t: number): string => {
  const A = toRgb(a);
  const B = toRgb(b);
  const u = clamp01(t);
  return toHex(A.map((v, i) => v + (B[i] - v) * u));
};
/** Lighter (toward white): the lit side of a glossy shape. */
export const tint = (c: string, t: number) => mix(c, "#ffffff", t);
/** Darker toward a deep plum, not black, so shadows on candy colours stay saturated. */
export const shade = (c: string, t: number) => mix(c, "#2a0c33", t);
/** `rgba()` string from a hex colour. */
export const alpha = (c: string, a: number) => {
  const [r, g, b] = toRgb(c);
  return `rgba(${r},${g},${b},${a})`;
};

/** A gradient id safe inside `url(#...)`: React's useId gives ":r1:", whose colons break the reference. */
export const safeId = (raw: string) => `g${raw.replace(/[^A-Za-z0-9_-]/g, "")}`;

/**
 * Squash and stretch after a landing, `t` seconds after touch-down: a damped wobble about 1 (squash first,
 * then a smaller stretch). Volume is kept roughly constant (x widens as y squashes). Before landing: 1, 1.
 */
export const squashAt = (t: number, amount = 0.22): { sx: number; sy: number } => {
  if (t < 0) return { sx: 1, sy: 1 };
  const d = amount * Math.exp(-6.5 * t) * Math.cos(2 * Math.PI * 2.6 * t);
  return { sx: 1 + d * 0.8, sy: 1 - d };
};

/** A bounce-in drop: height above the ground (px, >= 0) `t` seconds after release from `h0`, lands at `fall` s. */
export const dropHeight = (t: number, h0: number, fall = 0.5): number => {
  if (t <= 0) return h0;
  if (t >= fall) return 0;
  const u = t / fall;
  return h0 * (1 - u * u);
};

export type ToyGesture = "rest" | "wave" | "cheer" | "point" | "shrug";
export const TOY_GESTURES: ToyGesture[] = ["rest", "wave", "cheer", "point", "shrug"];

/** Outward arm angle in degrees (0 = hanging straight down, 90 = out sideways, 180 = straight up). */
const ARMS: Record<ToyGesture, { l: number; r: number }> = {
  rest: { l: 16, r: 16 },
  wave: { l: 16, r: 150 },
  cheer: { l: 150, r: 150 },
  point: { l: 16, r: 92 },
  shrug: { l: 62, r: 62 },
};

/**
 * Arm angles, hop height (px) and body lean (deg) for a gesture at progress `g` (0..1, from the rig's
 * `gestureT`), `since` frames after it started. Wave wiggles the raised hand; cheer adds one hop; point leans in.
 */
export const armPose = (gesture: ToyGesture, g: number, since: number) => {
  const a = ARMS[gesture] ?? ARMS.rest;
  const rest = ARMS.rest;
  const wag = gesture === "wave" ? Math.sin(since / 3.2) * 20 * g : 0;
  const pump = gesture === "cheer" ? Math.sin(since / 4) * 8 * g : 0;
  const hopT = since / 16;
  const hop = gesture === "cheer" && hopT >= 0 && hopT < 1 ? Math.sin(hopT * Math.PI) * 60 : 0;
  return {
    l: rest.l + (a.l - rest.l) * g + pump,
    r: rest.r + (a.r - rest.r) * g + wag - pump,
    hop,
    lean: gesture === "point" ? 5 * g : gesture === "shrug" ? -4 * g : 0,
  };
};

/**
 * Feet in the walk cycle at rig phase `phase` (radians, PI per footstep): x offset (px, stride along the walk)
 * and lift (px up) for each foot. At every multiple of PI both feet are down and the stride is widest.
 */
export const feetAt = (phase: number, stride = 34, lift = 30) => {
  const s = Math.sin(phase);
  return {
    lx: Math.cos(phase) * stride,
    rx: -Math.cos(phase) * stride,
    ly: Math.max(0, s) * lift,
    ry: Math.max(0, -s) * lift,
  };
};
