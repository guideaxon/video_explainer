/**
 * Pop-art bundle: pure geometry helpers (no React), so they can be tested and so every shape is a pure function of
 * its inputs and a seed. Same input, same path: renders are repeatable (never Math.random).
 */

/** Flat process colours (CMYK-like primaries plus their red and blue overprints), paper and ink. */
export const C = {
  cyan: "#00a8e8", magenta: "#e5007d", yellow: "#ffe100", red: "#e8232a", blue: "#22409a",
  ink: "#121212", paper: "#fbf4e2", white: "#ffffff", skin: "#ffd6bd", mouth: "#3a0614", tongue: "#ff6f96",
} as const;
export type ColorName = keyof typeof C;

/** Misregistration: the colour plate sits this many px off the ink plate (constant, so it never jitters). */
export const MISREG: [number, number] = [3, -2];

/** Deterministic hash of two integers to 0..1. */
export const h01 = (a: number, b: number): number => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

const f1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Jagged starburst ("POW!") outline centred on (cx, cy). Spikes alternate between an outer radius (varied by the
 * seed, 82..100% of `r`) and an inner radius `r * inner`. `sx` stretches it sideways for wide words.
 */
export const burstPath = (cx: number, cy: number, r: number, spikes = 14, inner = 0.68, seed = 0, sx = 1): string => {
  const pts: string[] = [];
  const n = Math.max(5, Math.round(spikes));
  for (let i = 0; i < n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2 + (h01(seed, i + 50) - 0.5) * (Math.PI / n) * 0.5;
    const rr = i % 2 === 0 ? r * (0.82 + 0.18 * h01(seed, i)) : r * inner * (0.9 + 0.2 * h01(seed + 7, i));
    pts.push(`${f1(cx + Math.cos(a) * rr * sx)},${f1(cy + Math.sin(a) * rr)}`);
  }
  return `M${pts.join(" L")} Z`;
};

/**
 * Hand-inked panel border: a closed ring (fill with `fillRule="evenodd"`) whose thickness wanders between
 * `weight * 0.7` and `weight * 1.3` along each edge, so the frame reads as brushed ink, not a CSS border.
 * Outer edge is the panel rectangle (0,0)-(w,h); thickness grows inward.
 */
export const inkFrame = (w: number, h: number, weight = 10, seed = 0): string => {
  const step = 140;
  const outer = `M0,0 H${w} V${h} H0 Z`;
  const edge: [number, number][] = [];
  const along = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number, k: number) => {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(2, Math.ceil(len / step));
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const th = weight * (0.7 + 0.6 * h01(seed + k, i));
      edge.push([x0 + (x1 - x0) * t + nx * th, y0 + (y1 - y0) * t + ny * th]);
    }
  };
  along(0, 0, w, 0, 0, 1, 1);
  along(w, 0, w, h, -1, 0, 2);
  along(w, h, 0, h, 0, -1, 3);
  along(0, h, 0, 0, 1, 0, 4);
  // Corners: push each corner point inward on both axes so the ring stays closed and even there.
  const inner = edge.map(([x, y]) => [Math.min(Math.max(x, weight * 0.7), w - weight * 0.7), Math.min(Math.max(y, weight * 0.7), h - weight * 0.7)]);
  return `${outer} M${inner.map(([x, y]) => `${f1(x)},${f1(y)}`).join(" L")} Z`;
};

/** Thickness of an `inkFrame` at each sample (for tests): the inward offsets used to build it. */
export const inkFrameWeights = (w: number, h: number, weight = 10, seed = 0): number[] => {
  const out: number[] = [];
  [[w, 1], [h, 2], [w, 3], [h, 4]].forEach(([len, k]) => {
    const n = Math.max(2, Math.ceil(len / 140));
    for (let i = 0; i < n; i++) out.push(weight * (0.7 + 0.6 * h01(seed + k, i)));
  });
  return out;
};

/**
 * Two-bone inverse kinematics: the elbow (or knee) that joins a limb of lengths l1, l2 from `root` to `target`.
 * `bend` +1 or -1 picks which side the joint bows to. The target is clamped to the reachable ring, so the
 * returned end point may stop short of it.
 */
export const ik2 = (root: [number, number], target: [number, number], l1: number, l2: number, bend: 1 | -1 = 1) => {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const d0 = Math.hypot(dx, dy) || 0.0001;
  const d = Math.min(l1 + l2 - 0.001, Math.max(Math.abs(l1 - l2) + 0.001, d0));
  const base = Math.atan2(dy, dx);
  const cosA = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d);
  const a = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const joint: [number, number] = [root[0] + Math.cos(base + bend * a) * l1, root[1] + Math.sin(base + bend * a) * l1];
  const end: [number, number] = [root[0] + (dx / d0) * d, root[1] + (dy / d0) * d];
  return { joint, end };
};

/**
 * Radial focus lines (comic "speed lines" aimed at a point): thin ink wedges from beyond the frame edge to an
 * inner radius that varies per line. `phase` re-seeds the inner ends, so changing it every few frames makes the
 * lines flicker like hand-drawn animation. Returns one SVG path (fill it).
 */
export const focusLines = (cx: number, cy: number, rIn: number, rOut: number, count = 48, seed = 0, phase = 0): string => {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (h01(seed, i) - 0.5) * 0.08;
    const half = 0.008 + 0.018 * h01(seed + 3, i);
    const r0 = rIn * (0.85 + 0.45 * h01(seed + phase * 31, i));
    const p = (ang: number, r: number) => `${f1(cx + Math.cos(ang) * r)},${f1(cy + Math.sin(ang) * r)}`;
    parts.push(`M${p(a, r0)} L${p(a - half, rOut)} L${p(a + half, rOut)} Z`);
  }
  return parts.join(" ");
};

/**
 * Parallel motion lines trailing an object moving along +x (`dir` 1) or -x (`dir` -1): `count` tapered strokes in
 * a box of height `h`, lengths varied by the seed. (x, y) is the leading edge's top. Returns one path (fill it).
 */
export const motionLines = (x: number, y: number, len: number, h: number, count = 6, seed = 0, dir: 1 | -1 = 1): string => {
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const yy = y + (count === 1 ? h / 2 : (i / (count - 1)) * h);
    const l = len * (0.5 + 0.5 * h01(seed, i));
    const t = 2 + 3 * h01(seed + 9, i);
    const x0 = x - dir * 8 * h01(seed + 4, i);
    const x1 = x0 - dir * l;
    parts.push(`M${f1(x0)},${f1(yy - t)} L${f1(x0)},${f1(yy + t)} L${f1(x1)},${f1(yy)} Z`);
  }
  return parts.join(" ");
};

/** Thought-cloud outline: `bumps` circular bumps around an ellipse (rx, ry) centred at (cx, cy). Fill it. */
export const cloudPath = (cx: number, cy: number, rx: number, ry: number, bumps = 11, seed = 0): string => {
  const pts: [number, number][] = [];
  for (let i = 0; i < bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  let d = `M${f1(pts[0][0])},${f1(pts[0][1])}`;
  for (let i = 0; i < bumps; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[(i + 1) % bumps];
    const mx = (x0 + x1) / 2;
    const my = (y0 + y1) / 2;
    const out = 0.55 + 0.25 * h01(seed, i);
    const nl = Math.hypot(mx - cx, my - cy) || 1;
    const bulge = Math.hypot(x1 - x0, y1 - y0) * out;
    d += ` Q${f1(mx + ((mx - cx) / nl) * bulge)},${f1(my + ((my - cy) / nl) * bulge)} ${f1(x1)},${f1(y1)}`;
  }
  return `${d} Z`;
};

/**
 * Halftone ramp: a grid of dots (staggered rows, `step` apart) whose radius grows along a direction, like a
 * printed tone fading from light to dark. `dir` "up" puts the biggest dots at the bottom. Radii stay in
 * 0..step*0.62 so dots just touch at the dark end. Compute it once per scene (useMemo); it is static.
 */
export const dotsRamp = (w: number, h: number, step: number, dir: "up" | "down" | "left" | "right" = "up", max = 0.62) => {
  const out: { x: number; y: number; r: number }[] = [];
  for (let row = 0, y = step / 2; y < h + step; row++, y += step * 0.866) {
    for (let x = row % 2 ? step : step / 2; x < w + step; x += step) {
      const t = dir === "up" ? y / h : dir === "down" ? 1 - y / h : dir === "left" ? x / w : 1 - x / w;
      const r = step * max * Math.max(0, Math.min(1, t)) ** 1.4;
      if (r > 0.6) out.push({ x: f1(x), y: f1(y), r: f1(r) });
    }
  }
  return out;
};

/** Count-up value at progress p (0..1), rounded to `decimals`. */
export const countUp = (value: number, p: number, decimals = 0): string => (value * Math.max(0, Math.min(1, p))).toFixed(decimals);
