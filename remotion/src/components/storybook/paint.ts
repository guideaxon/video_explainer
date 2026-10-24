/**
 * Storybook style bundle: pure helpers for the camera move and the painted character layer (no React, no DOM), so
 * they can be unit tested. The kit (`kit.tsx`) and the character (`character.tsx`) draw with them.
 * See docs/storybook_video_style_guide.md, section 7.
 */

export type Move = "push-in" | "pull-out" | "pan-left" | "pan-right";

/** Where a move starts and ends: scale and horizontal drift in design px. */
export const MOVES: Record<Move, { s: [number, number]; x: [number, number] }> = {
  "push-in": { s: [1.0, 1.08], x: [0, -20] },
  "pull-out": { s: [1.08, 1.0], x: [-20, 0] },
  "pan-left": { s: [1.06, 1.06], x: [30, -30] },
  "pan-right": { s: [1.06, 1.06], x: [-30, 30] },
};

export type Camera = { scale: number; x: number };

/** Camera of a move at eased progress t (0..1). */
export const cameraAt = (move: Move, t: number): Camera => {
  const m = MOVES[move];
  return { scale: m.s[0] + (m.s[1] - m.s[0]) * t, x: m.x[0] + (m.x[1] - m.x[0]) * t };
};

/**
 * Where a point of the still (design units, 1280x720 frame of the still at scale 1) lands on screen under a camera.
 * Mirrors the CSS `translateX(x) scale(s)` about the frame centre that `PaintedShot` applies to the still.
 */
export const stillToScreen = (p: [number, number], cam: Camera, w = 1280, h = 720): [number, number] => [
  w / 2 + (p[0] - w / 2) * cam.scale + cam.x,
  h / 2 + (p[1] - h / 2) * cam.scale,
];

/* ---------- colour ---------- */

const hex2 = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, "0");
export const parseHex = (c: string): [number, number, number] => {
  const s = c.replace("#", "");
  const f = s.length === 3 ? s.split("").map((ch) => ch + ch).join("") : s;
  return [parseInt(f.slice(0, 2), 16), parseInt(f.slice(2, 4), 16), parseInt(f.slice(4, 6), 16)];
};
/** Linear mix of two hex colours (t = 0 gives a, 1 gives b). */
export const mixHex = (a: string, b: string, t: number): string => {
  const A = parseHex(a);
  const B = parseHex(b);
  const u = Math.max(0, Math.min(1, t));
  return "#" + A.map((v, i) => hex2(v + (B[i] - v) * u)).join("");
};

/**
 * Light that the character matches to the still. `x` is where the light comes from horizontally (-1 left .. 1 right),
 * `warmth` 0 (cool daylight) .. 1 (warm lamp, sunset), `tint` an optional colour picked from the still that every
 * paint is nudged towards, `strength` how hard the shading and the contact shadow are (0..1).
 */
export type Light = { x?: number; warmth?: number; tint?: string; strength?: number };
export const DEFAULT_LIGHT: Required<Omit<Light, "tint">> = { x: -0.5, warmth: 0.55, strength: 0.55 };

const WARM = "#ffc98a";
const COOL = "#a9c4e2";

/** A paint colour under the light: pushed warm or cool by `warmth`, then towards `tint` (15 percent). */
export const litColor = (base: string, light: Light = {}): string => {
  const w = light.warmth ?? DEFAULT_LIGHT.warmth;
  const toward = w >= 0.5 ? WARM : COOL;
  const c = mixHex(base, toward, Math.abs(w - 0.5) * 2 * 0.2);
  return light.tint ? mixHex(c, light.tint, 0.15) : c;
};

/** Watercolour shadow colour: ink cooled (or warmed) and thinned, never black. */
export const shadowColor = (ink: string, light: Light = {}): string => {
  const w = light.warmth ?? DEFAULT_LIGHT.warmth;
  return mixHex(ink, w >= 0.5 ? "#4b5a7a" : "#2f4660", 0.45);
};

/** Darker pigment that pools at the edge of a wash. */
export const edgeColor = (c: string): string => mixHex(c, "#2a1c14", 0.35);

/* ---------- paper and pigment texture (computed once per seed) ---------- */

/** Deterministic hash of three integers to 0..1. */
const hash3 = (a: number, b: number, c: number) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * Tileable value noise (size x size, values 0..1) summed over octaves. The lattice wraps at the tile edge, so the
 * tile repeats without a seam. `cells` is the lattice count of the first octave.
 */
export const valueNoise = (size: number, seed: number, cells = 4, octaves = 3): Float32Array => {
  const out = new Float32Array(size * size);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const at = (i: number, j: number) => hash3(((i % n) + n) % n, ((j % n) + n) % n, seed * 31 + o);
    for (let y = 0; y < size; y++) {
      const fy = (y / size) * n;
      const j = Math.floor(fy);
      const ty = fy - j;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * n;
        const i = Math.floor(fx);
        const tx = fx - i;
        const sx = tx * tx * (3 - 2 * tx);
        const a = at(i, j) + (at(i + 1, j) - at(i, j)) * sx;
        const b = at(i, j + 1) + (at(i + 1, j + 1) - at(i, j + 1)) * sx;
        out[y * size + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let k = 0; k < out.length; k++) out[k] /= total;
  return out;
};

/**
 * RGBA pixels of the pigment-grain tile: transparent paper with ink-coloured granulation (fine specks) and soft
 * wet-in-wet blooms (low-frequency blotches). Drawn over every wash at low alpha.
 */
export const grainTile = (size: number, seed: number, ink = "#3a2a20"): Uint8ClampedArray => {
  const [r, g, b] = parseHex(ink);
  const bloom = valueNoise(size, seed, 3, 2);
  const fine = valueNoise(size, seed + 7, 24, 2);
  const px = new Uint8ClampedArray(size * size * 4);
  for (let k = 0; k < size * size; k++) {
    const speck = Math.max(0, fine[k] - 0.56) * 2.4; // only the darker grains
    const a = Math.min(1, Math.max(0, bloom[k] - 0.4) * 0.85 + speck * 0.3);
    px[k * 4] = r;
    px[k * 4 + 1] = g;
    px[k * 4 + 2] = b;
    px[k * 4 + 3] = Math.round(a * 255);
  }
  return px;
};

/**
 * RGBA pixels of the edge-wobble map for feDisplacementMap: smooth noise in R and G around mid grey, opaque. A
 * displacement of a few units makes the drawn edges wander like a brush.
 */
export const wobbleTile = (size: number, seed: number): Uint8ClampedArray => {
  const nx = valueNoise(size, seed + 13, 6, 2);
  const ny = valueNoise(size, seed + 29, 6, 2);
  const px = new Uint8ClampedArray(size * size * 4);
  for (let k = 0; k < size * size; k++) {
    px[k * 4] = Math.round(nx[k] * 255);
    px[k * 4 + 1] = Math.round(ny[k] * 255);
    px[k * 4 + 2] = 128;
    px[k * 4 + 3] = 255;
  }
  return px;
};

/* ---------- character pose helpers ---------- */

/**
 * Ground point of a character at walk progress p (0..1) between (x, y) and (walkTo, walkToY). Facing follows the
 * walk direction: true when moving left.
 */
export const groundAt = (x: number, y: number, p: number, walkTo?: number, walkToY?: number) => {
  const tx = walkTo ?? x;
  const ty = walkToY ?? y;
  return { x: x + (tx - x) * p, y: y + (ty - y) * p, faceLeft: tx < x };
};

/** Foot offsets during a walk: stride (x) and lift (up, >= 0). A foot lands, unlifted, at every multiple of PI. */
export const feetAt = (phase: number, active: boolean, stride = 16, lift = 9) => {
  if (!active) return { l: { x: 0, lift: 0 }, r: { x: 0, lift: 0 } };
  const c = Math.cos(phase);
  const s = Math.sin(phase);
  return { l: { x: -stride * c, lift: Math.max(0, s) * lift }, r: { x: stride * c, lift: Math.max(0, -s) * lift } };
};
