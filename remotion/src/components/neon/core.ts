/**
 * Neon style bundle: pure helpers (no React, no Remotion), so they can be unit tested and every render is identical.
 * Geometry for the perspective grid floor, the striped sun, the starfield and the wireframe mountains, the
 * deterministic tube flicker, and path builders for stroke-only shapes. See docs/neon_video_style_guide.md.
 */

export const NEON = {
  night: "#0b0118", // deep purple-black, the base of every scene
  dusk: "#2a0845",
  haze: "#6d1a63",
  pink: "#ff2bd6",
  cyan: "#22e6ff",
  purple: "#9d4dff",
  orange: "#ff8a1f",
  yellow: "#ffd23f",
  white: "#fff6ff",
  dim: "#b9a2d8",
} as const;

/** Deterministic hash of three integers to 0..1 (no Math.random: renders must be repeatable). */
export const hash3 = (a: number, b: number, c = 0) => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** The off/on pattern of a buzzing tube (brightness per frame) once a flicker event starts. */
export const BUZZ = [0.15, 1, 0.08, 0.08, 0.9, 0.35, 1, 0.2, 1];

/**
 * Brightness multiplier (0..1) of a neon tube at a frame: almost always 1; about `rate` of the 3 s slots hold one
 * short buzz (off/on stutter, `BUZZ`). Pure function of (frame, seed), so it renders identically every time.
 */
export const flickerAt = (frame: number, seed = 0, rate = 0.35, slot = 90): number => {
  if (frame < 0) return 1;
  const k = Math.floor(frame / slot);
  if (hash3(seed, k, 7) >= rate) return 1;
  const start = k * slot + Math.floor(hash3(seed, k, 11) * (slot - BUZZ.length));
  const i = frame - start;
  return i >= 0 && i < BUZZ.length ? BUZZ[i] : 1;
};

/** Tube switch-on: a stutter over about 12 frames from `from`, then fully lit. 0 before `from`. */
export const powerOn = (frame: number, from = 0): number => {
  const i = frame - from;
  if (i < 0) return 0;
  const ON = [0.3, 0, 0.6, 0.1, 0, 0.8, 0.4, 1, 0.7, 1, 1, 0.9];
  return i < ON.length ? ON[i] : 1;
};

export type GridLine = { y: number; z: number; alpha: number };

/**
 * Horizontal lines of the perspective floor at a frame. A line at depth z sits at y = horizon + k / z; lines are
 * one depth unit apart and slide toward the viewer by `speed` units per frame (the floor scrolls, it loops every
 * 1 / speed frames). `bottom` is the frame's bottom edge; lines below it are dropped. Nearest first.
 */
export const gridRows = (frame: number, horizon: number, bottom = 1920, speed = 0.04, k = 740, far = 36): GridLine[] => {
  const off = (((frame * speed) % 1) + 1) % 1;
  const out: GridLine[] = [];
  for (let i = 0; i < far; i++) {
    const z = i + 1 - off + 0.35;
    const y = horizon + k / z;
    if (y > bottom + 4) continue;
    out.push({ y, z, alpha: Math.max(0, Math.min(1, 1.15 - z / (far * 0.8))) });
  }
  return out;
};

/** One path with every vertical floor line: rays from the vanishing point (cx, horizon), `gap` px apart at `bottom`. */
export const gridRaysPath = (cx: number, horizon: number, bottom = 1920, gap = 150, width = 1080, sway = 0): string => {
  const n = Math.ceil((width * 2.2) / gap);
  let d = "";
  for (let j = -n; j <= n; j++) {
    const xb = cx + j * gap + sway;
    d += `M${cx.toFixed(1)} ${horizon.toFixed(1)}L${xb.toFixed(1)} ${bottom}`;
  }
  return d;
};

/**
 * Gaps cut across the lower half of the sun (the classic striped sun). Each gap is a band [y, h] in sun-local units
 * (-1 top .. 1 bottom); bands get thicker toward the bottom and scroll down by `speed` per frame, looping.
 */
export const sunStripes = (frame: number, count = 7, speed = 0.004): { y: number; h: number }[] => {
  const out: { y: number; h: number }[] = [];
  const off = (((frame * speed) % 1) + 1) % 1;
  for (let i = 0; i < count + 1; i++) {
    const t = (i + off) / count; // 0..1 down the lower half
    if (t > 1) continue;
    const y = 0.02 + t * 0.98;
    out.push({ y, h: 0.015 + 0.11 * t });
  }
  return out;
};

export type Star = { x: number; y: number; r: number; tw: number; phase: number };
/** Seeded starfield in a box (no Math.random). `tw` is how strongly a star twinkles. */
export const starfield = (n: number, w: number, h: number, seed = 1): Star[] =>
  Array.from({ length: n }, (_, i) => ({
    x: hash3(seed, i, 1) * w,
    y: Math.pow(hash3(seed, i, 2), 1.4) * h, // denser near the top
    r: 0.8 + hash3(seed, i, 3) * 2.2,
    tw: hash3(seed, i, 4),
    phase: hash3(seed, i, 5) * Math.PI * 2,
  }));

/**
 * Wireframe mountain range sitting on the horizon: a ridge polyline and the wire lines (peak to valley drops and
 * cross struts) that make it read as a 3D mesh. Seeded; `height` is the tallest peak in px, `gap` keeps a clear
 * notch in the middle where the sun sits (fraction of width).
 */
export const mountainRange = (width: number, horizon: number, height = 220, seed = 3, gap = 0.36) => {
  const n = 15;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const centre = Math.abs(u - 0.5) * 2; // 0 at middle, 1 at edges
    const envelope = centre < gap ? 0.08 + 0.2 * (centre / gap) : 0.35 + 0.65 * Math.sin(((centre - gap) / (1 - gap)) * Math.PI * 0.9 + 0.2);
    const peak = i % 2 === 1 ? 1 : 0.35 + 0.3 * hash3(seed, i, 9);
    pts.push([u * width, horizon - height * envelope * peak * (0.75 + 0.25 * hash3(seed, i, 8))]);
  }
  const ridge = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");
  let wires = "";
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i];
    if (i % 2 === 1) {
      wires += `M${x.toFixed(1)} ${y.toFixed(1)}L${(x - width / n * 0.45).toFixed(1)} ${horizon}M${x.toFixed(1)} ${y.toFixed(1)}L${(x + width / n * 0.5).toFixed(1)} ${horizon}`;
      const [px, py] = pts[i - 1];
      const mx = (x + px) / 2;
      const my = (y + py) / 2;
      wires += `M${mx.toFixed(1)} ${my.toFixed(1)}L${(x + width / n * 0.2).toFixed(1)} ${((y + horizon) / 2).toFixed(1)}`;
    }
  }
  const fill = `${ridge}L${width} ${horizon}L0 ${horizon}Z`;
  return { ridge, wires, fill };
};

/** Path builders: every neon shape is a path so one `Neon` element can draw its glow copies. */
export const rectPath = (x: number, y: number, w: number, h: number, r = 0): string => {
  const q = Math.max(0, Math.min(r, w / 2, h / 2));
  if (!q) return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
  return `M${x + q} ${y}H${x + w - q}A${q} ${q} 0 0 1 ${x + w} ${y + q}V${y + h - q}A${q} ${q} 0 0 1 ${x + w - q} ${y + h}H${x + q}A${q} ${q} 0 0 1 ${x} ${y + h - q}V${y + q}A${q} ${q} 0 0 1 ${x + q} ${y}Z`;
};
export const ellipsePath = (cx: number, cy: number, rx: number, ry = rx): string =>
  `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;
export const circlePath = (cx: number, cy: number, r: number) => ellipsePath(cx, cy, r, r);

/** Segments lit in an equaliser bar: value / max of `rows`, grown by `t` (0..1). Always an integer. */
export const litSegments = (value: number, max: number, rows: number, t: number): number =>
  Math.max(0, Math.min(rows, Math.round((value / Math.max(1e-9, max)) * rows * Math.max(0, Math.min(1, t)))));

/** VHS on-screen-display timecode for a frame, `H:MM:SS` (SP tape counter). */
export const vhsTime = (frame: number, fps = 30, startSeconds = 0): string => {
  const s = Math.max(0, Math.floor(frame / fps + startSeconds));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
