/**
 * Rubberhose style bundle: pure helpers (no React, no DOM), unit-tested in rubberhose.test.ts.
 *
 * - The held-frame clock ("on twos"): the pipeline renders at 30 fps, but drawings change about 12 times a second.
 * - Film damage, all deterministic and cheap: gate weave, flicker, scratches and dust per drawing; grain pixels
 *   generated once (the kit draws them to a small canvas tile and offsets the tile per drawing).
 * - Rubber-hose limbs: a cubic curve from shoulder to hand whose bow grows as the hand comes closer, so a limb
 *   of fixed length bends like a noodle instead of folding at an elbow.
 * - The pie-cut eye and the iris radius.
 */

/** Drawings per second for the held-frame clock (period cartoons were shot "on twos" at 24 fps = 12 drawings/s). */
export const DRAWINGS_PER_SECOND = 12;

/** Index of the drawing shown at a real frame: Math.floor(frame * 12 / 30) at 30 fps. */
export const drawingAt = (frame: number, fps = 30, rate = DRAWINGS_PER_SECOND) => Math.floor((Math.max(0, frame) * rate) / fps);

/**
 * The real frame at which the current drawing started, so animation code can keep using frame-based timing
 * (rig helpers, springs) and still step at about 12 drawings per second. Always <= frame. Lip sync arrays are
 * per real frame: index them with the real frame, not this.
 */
export const heldFrame = (frame: number, fps = 30, rate = DRAWINGS_PER_SECOND) => {
  if (frame < 0) return frame;
  return Math.floor((drawingAt(frame, fps, rate) * fps) / rate);
};

/** Deterministic hash of three integers to 0..1 (never Math.random: renders must repeat exactly). */
export const hash3 = (a: number, b: number, c = 0) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h = Math.imul(h ^ (h >>> 16), 2246822519);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
};

/** The constant rubber-hose bounce, 0 (down, squashed) .. 1 (up), on the held clock. `bpm` bounces per minute. */
export const bounceAt = (frame: number, fps = 30, bpm = 120) => Math.abs(Math.sin((Math.PI * frame * bpm) / (60 * fps)));

/** Squash-and-stretch scale for a bounce value: squashed (wide, short) at the bottom, stretched at the top. */
export const squash = (b: number, amount = 0.07) => ({ sx: 1 + amount * (1 - b) - amount * 0.4 * b, sy: 1 - amount * (1 - b) + amount * 0.6 * b });

/** Gate weave: a small per-drawing jitter of the whole frame (px); now and then a bigger hop. */
export const weaveAt = (drawing: number, seed = 0, amp = 2.2) => {
  const hop = hash3(drawing, seed, 7) < 0.04 ? 2.2 : 1;
  return {
    x: Math.round((hash3(drawing, seed, 1) - 0.5) * 2 * amp * hop * 10) / 10,
    y: Math.round((hash3(drawing, seed, 2) - 0.5) * 2 * amp * 1.4 * hop * 10) / 10,
  };
};

/** Projector flicker: opacity of a dark overlay per drawing (0.02 .. 0.11), now and then a brighter flash (0). */
export const flickerAt = (drawing: number, seed = 0) => {
  const u = hash3(drawing, seed, 3);
  return u < 0.05 ? 0 : Math.round((0.02 + 0.09 * hash3(drawing, seed, 4)) * 1000) / 1000;
};

export type Scratch = { x: number; y0: number; y1: number; w: number; light: boolean; opacity: number };
/**
 * Vertical print scratches. A scratch lives for one slot of 5 drawings and drifts a little; about one slot in
 * three has one. `width`/`height` are the frame size.
 */
export const scratchesAt = (drawing: number, seed = 0, width = 1080, height = 1920): Scratch[] => {
  const slot = Math.floor(drawing / 5);
  const out: Scratch[] = [];
  for (let k = 0; k < 2; k++) {
    if (hash3(slot, seed + k, 11) > (k === 0 ? 0.34 : 0.1)) continue;
    const x = 60 + hash3(slot, seed + k, 12) * (width - 120) + (drawing % 5) * (hash3(slot, k, 13) - 0.5) * 6;
    const y0 = hash3(slot, seed + k, 14) * height * 0.5;
    out.push({
      x: Math.round(x), y0: Math.round(y0), y1: Math.round(y0 + height * (0.35 + 0.6 * hash3(slot, seed + k, 15))),
      w: 1 + Math.round(hash3(slot, seed + k, 16) * 2), light: hash3(slot, seed + k, 17) < 0.6,
      opacity: Math.round((0.25 + 0.35 * hash3(drawing, seed + k, 18)) * 100) / 100,
    });
  }
  return out;
};

export type Speck = { x: number; y: number; r: number; rot: number; light: boolean };
/** Dust and hair specks: 0 to 3 per drawing, each shown for one drawing only. */
export const dustAt = (drawing: number, seed = 0, width = 1080, height = 1920): Speck[] => {
  const n = Math.floor(hash3(drawing, seed, 21) * 4.6) - 1; // -1..3, so many drawings are clean
  const out: Speck[] = [];
  for (let k = 0; k < n; k++) {
    out.push({
      x: Math.round(hash3(drawing, k, 22 + seed) * width), y: Math.round(hash3(drawing, k, 23 + seed) * height),
      r: 2 + Math.round(hash3(drawing, k, 24 + seed) * 7), rot: Math.round(hash3(drawing, k, 25 + seed) * 180),
      light: hash3(drawing, k, 26 + seed) < 0.35,
    });
  }
  return out;
};

/**
 * Grain tile pixels (RGBA, size x size), generated once. Each pixel is dark or light with a small alpha, so the tile
 * can sit over the frame without a blend mode. Deterministic for a seed.
 */
export const grainPixels = (size = 192, seed = 0, strength = 0.5): Uint8ClampedArray => {
  const px = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const u = hash3(i, seed, 31);
    const dark = hash3(i, seed, 32) < 0.55;
    const v = dark ? 20 : 250;
    px[i * 4] = v;
    px[i * 4 + 1] = dark ? v : 240;
    px[i * 4 + 2] = dark ? v : 220;
    px[i * 4 + 3] = Math.round(u * u * 255 * strength);
  }
  return px;
};

/** Where to place the grain tile for a drawing (a different offset every drawing, so it crawls like film). */
export const grainOffset = (drawing: number, size = 192) => ({
  x: Math.floor(hash3(drawing, 0, 41) * size),
  y: Math.floor(hash3(drawing, 0, 42) * size),
});

type Pt = { x: number; y: number };
/**
 * How far a rubber-hose limb of rest length `len` bows sideways when its ends are `dist` apart: 0 when fully
 * stretched, growing as the ends come closer (half the "slack", like a hose that keeps its length).
 */
export const hoseBow = (len: number, dist: number) => (dist >= len ? 0 : 0.5 * Math.sqrt(len * len - dist * dist));

/**
 * A rubber-hose limb from `a` (shoulder or hip) to `b` (hand or foot): one smooth cubic, no elbow. `bend` (-1..1)
 * chooses the side and share of the bow; `len` is the limb's rest length. Returns the SVG path and the angle (deg) of
 * the limb where it meets `b`, for orienting a glove or shoe.
 */
export const hosePath = (a: Pt, b: Pt, len: number, bend = 1) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const bow = hoseBow(len, dist) * bend * 1.33; // a cubic reaches 3/4 of its control offset at the middle
  const c1 = { x: a.x + dx / 3 + nx * bow, y: a.y + dy / 3 + ny * bow };
  const c2 = { x: a.x + (2 * dx) / 3 + nx * bow, y: a.y + (2 * dy) / 3 + ny * bow };
  const r = (n: number) => Math.round(n * 10) / 10;
  const end = (Math.atan2(b.y - c2.y, b.x - c2.x) * 180) / Math.PI;
  return { d: `M${r(a.x)},${r(a.y)} C${r(c1.x)},${r(c1.y)} ${r(c2.x)},${r(c2.y)} ${r(b.x)},${r(b.y)}`, end: r(end), mid: { x: r(a.x + dx / 2 + nx * bow * 0.75), y: r(a.y + dy / 2 + ny * bow * 0.75) } };
};

/**
 * A pie-cut pupil: an ellipse with a wedge cut out (the 1930s "pie eye"). `cut` is the wedge centre angle in degrees
 * (0 = right, -90 = up), `width` its opening in degrees.
 */
export const piePath = (cx: number, cy: number, rx: number, ry: number, cut = -50, width = 54) => {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a0 = rad(cut + width / 2);
  const a1 = rad(cut - width / 2 + 360);
  const p = (a: number) => `${Math.round((cx + rx * Math.cos(a)) * 10) / 10},${Math.round((cy + ry * Math.sin(a)) * 10) / 10}`;
  return `M${cx},${cy} L${p(a0)} A${rx},${ry} 0 1 1 ${p(a1)} Z`;
};

/**
 * Iris radius at a scene-local frame. Opens from 0 over `open` frames at the start (iris in) and, when
 * `closeAt` is given, closes to 0 over `close` frames ending `tail` frames before `closeAt` (iris out), so the
 * last frames are black and the cut to the next scene is invisible. `full` covers the whole frame.
 */
export const irisRadius = (frame: number, opts: { full: number; open?: number; closeAt?: number; close?: number; tail?: number; mode: "in" | "out" | "both" }) => {
  const { full, open = 18, close = 20, tail = 6, mode } = opts;
  const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u));
  let r = full;
  if (mode !== "out") r = Math.min(r, full * ease(frame / open));
  if (mode !== "in" && opts.closeAt !== undefined) {
    const end = opts.closeAt - tail;
    r = Math.min(r, full * ease((end - frame) / close));
  }
  return Math.max(0, r);
};
