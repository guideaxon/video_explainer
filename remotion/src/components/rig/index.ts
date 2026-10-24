/**
 * Shared character rig contract: types and timing only, no drawing and no imports. Every bundle draws its own
 * character from these props (pixel frames, ink strokes, paper cuts, three.js meshes), so styles never mix; what the
 * characters share is how they are told to talk, blink, gesture and walk, and when those things happen.
 *
 * Talk data comes from `scenes/lipsync.ts`, written by `scripts/_lipsync.py` at the project fps:
 *   - `LIPSYNC.<scene>`: mouth openness per frame (0..1, from the voiceover loudness; always present),
 *   - `VISEMES.<scene>`: one Rhubarb mouth shape letter per frame (only when Rhubarb was on PATH).
 * Tiny mouths (pixel sprites) only need openness; larger faces draw one mouth per shape.
 *
 * Sound cues: `src/sound/rig_analyzer.py` reads literal `gestureAt={n}` and `walk={{ from: a, to: b, cadence: c }}`
 * props from scene files and emits a gesture pop and one footstep per `walkSteps()` frame into the `sound` step.
 * Keep `walkSteps` and that analyzer in step.
 */

/**
 * Rhubarb Lip Sync mouth shapes. A closed (M, B, P) · B slightly open, teeth (most consonants) · C open (EH, AE)
 * · D wide open (AA) · E rounded (AO, ER) · F puckered (UW, OW, W) · G teeth on lower lip (F, V) · H tongue up (L)
 * · X rest (silence).
 */
export type Viseme = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "X";
export const VISEMES: Viseme[] = ["A", "B", "C", "D", "E", "F", "G", "H", "X"];

/** How far each shape opens the jaw (0..1), for characters that only draw openness. */
export const VISEME_OPEN: Record<Viseme, number> = { A: 0, B: 0.25, C: 0.55, D: 0.95, E: 0.6, F: 0.35, G: 0.2, H: 0.45, X: 0 };
/** Mouth width relative to rest (rounded shapes are narrower). */
export const VISEME_WIDTH: Record<Viseme, number> = { A: 1, B: 1, C: 1, D: 0.95, E: 0.75, F: 0.55, G: 1, H: 0.95, X: 1 };

/** A walk between two scene-local frames. `cadence` is footsteps per second (default 2). */
export type Walk = { from: number; to: number; cadence?: number };

/** Props every rigged character accepts. G and L are the bundle's own gesture and look names. */
export type RigProps<G extends string = string, L extends string = string> = {
  /** Mouth openness per frame (0..1), `LIPSYNC.<scene>`. Omit for a deterministic syllable rhythm while `talking`. */
  mouth?: number[];
  /** One mouth shape letter per frame, `VISEMES.<scene>`. Wins over `mouth` for the shape; `mouth` still drives nods. */
  visemes?: string;
  /** Mouth moves (default: true when `mouth` or `visemes` is given, else false). */
  talking?: boolean;
  /** false: never blink. Default: blink on the shared rhythm (`blinkAt`). */
  blink?: boolean;
  gesture?: G;
  /** Scene-local frame the gesture starts; it eases in over `GESTURE_FRAMES`. */
  gestureAt?: number;
  walk?: Walk;
  look?: L;
  /** Varies the blink rhythm so two characters on screen do not blink together. */
  seed?: number;
};

export const GESTURE_FRAMES = 14;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
/** Deterministic hash of two integers to 0..1. */
export const hash01 = (a: number, b: number) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * Eyelid closure (0 open .. 1 shut) at a frame. One blink in every 3.4 s slot at a seeded offset, lasting 0.14 s;
 * about one slot in five adds a quick second blink. Pure function of (frame, fps, seed), so it renders identically.
 */
export const blinkAt = (frame: number, fps: number, seed = 0): number => {
  const SLOT = 3.4;
  const DUR = 0.14;
  const t = frame / fps;
  const k = Math.floor(t / SLOT);
  const start = k * SLOT + 0.4 + hash01(seed, k) * (SLOT - 1.2);
  const u = (t - start) / DUR;
  if (u >= 0 && u < 1) return Math.sin(u * Math.PI);
  if (hash01(seed + 101, k) < 0.2) {
    const u2 = (t - start - DUR - 0.12) / DUR;
    if (u2 >= 0 && u2 < 1) return Math.sin(u2 * Math.PI);
  }
  return 0;
};

/** Deterministic syllable rhythm for previews and characters with no lip-sync data. */
export const fallbackMouth = (frame: number): number => {
  const s = Math.sin(frame * 0.9) * 0.5 + Math.sin(frame * 0.37 + 1.3) * 0.5;
  return clamp01(0.5 + s * 0.5 - (Math.sin(frame * 0.11) > 0.8 ? 0.6 : 0));
};

/** Openness from shape letters (preferred) or the loudness curve; closed once the data ends. */
export const mouthAt = (rig: Pick<RigProps, "mouth" | "visemes" | "talking">, frame: number): number => {
  const talking = rig.talking ?? !!(rig.mouth || rig.visemes);
  if (!talking || frame < 0) return 0;
  if (rig.visemes) return VISEME_OPEN[visemeOf(rig.visemes[frame])];
  if (rig.mouth) return frame < rig.mouth.length ? clamp01(rig.mouth[frame]) : 0;
  return fallbackMouth(frame);
};

const visemeOf = (ch: string | undefined): Viseme => (ch && (VISEMES as string[]).includes(ch) ? (ch as Viseme) : "X");

/** The shape to draw at a frame. Without Rhubarb data the shape is derived from openness. */
export const visemeAt = (rig: Pick<RigProps, "mouth" | "visemes" | "talking">, frame: number): Viseme => {
  const talking = rig.talking ?? !!(rig.mouth || rig.visemes);
  if (!talking || frame < 0) return "X";
  if (rig.visemes) return visemeOf(rig.visemes[frame]);
  return shapeFromOpen(mouthAt(rig, frame));
};

export const shapeFromOpen = (open: number): Viseme => (open < 0.08 ? "X" : open < 0.3 ? "B" : open < 0.62 ? "C" : "D");

/** Gesture progress 0..1 (smoothstep) from `gestureAt`. */
export const gestureT = (frame: number, at = 0, frames = GESTURE_FRAMES): number => {
  const u = clamp01((frame - at) / frames);
  return u * u * (3 - 2 * u);
};

/**
 * Walk state at a frame. `phase` is in radians and advances by PI per footstep, so a foot lands at every multiple of
 * PI: draw legs with `Math.cos(phase)` (widest stride at a footfall) and the body bob with `Math.abs(Math.sin(phase))`.
 * `progress` runs 0..1 over the walk, for moving the character across the frame.
 */
export const walkAt = (walk: Walk | undefined, frame: number, fps: number) => {
  if (!walk || walk.to <= walk.from) return { active: false, phase: 0, progress: 0 };
  const f = Math.max(walk.from, Math.min(walk.to, frame));
  const steps = ((f - walk.from) / fps) * (walk.cadence ?? 2);
  return { active: frame >= walk.from && frame < walk.to, phase: steps * Math.PI, progress: (f - walk.from) / (walk.to - walk.from) };
};

/** Scene-local frames where a foot lands (one footstep sound each). Mirrors src/sound/rig_analyzer.py. */
export const walkSteps = (walk: Walk, fps: number): number[] => {
  const every = fps / (walk.cadence ?? 2);
  const out: number[] = [];
  for (let i = 1; walk.from + i * every < walk.to; i++) out.push(Math.round(walk.from + i * every));
  return out;
};
