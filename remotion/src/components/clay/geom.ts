/**
 * Clay style bundle: pure helpers (no React, no DOM), unit-tested in clay.test.ts.
 *
 * - Held-frame clock: the render pipeline is fixed at 30 fps, but claymation is shot "on twos" (12 poses per second).
 *   `poseOf(frame)` is the pose index and `heldFrame(frame)` the real (30 fps) frame where that pose starts, so every
 *   animation evaluated at `heldFrame(frame)` holds still for 2 or 3 frames and then jumps, like stop-motion.
 * - Boil: each held pose nudges outline points and positions by a seeded 1-2 px (`boil`), as if the animator touched
 *   the clay between exposures. Same pose, same nudge: renders are repeatable.
 * - Lumpy outlines: `blobPath` turns a few control points into a smooth closed Catmull-Rom path with a seeded,
 *   per-point radial lump (fixed for the object) plus the per-pose boil.
 * - Colours: `shade` lightens or darkens a hex colour for the matte soft-shading gradients.
 */

export const FPS = 30;
export const POSES_PER_SECOND = 12;

/** Deterministic hash of three integers to 0..1 (no Math.random anywhere in the bundle). */
export const hash3 = (a: number, b: number, c = 0): number => {
  let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};
/** Seeded value in -1..1. */
export const jitter = (a: number, b: number, c = 0) => hash3(a, b, c) * 2 - 1;

/** Pose index at a real frame ("on twos": 12 poses per second at 30 fps). */
export const poseOf = (frame: number, fps = FPS, poses = POSES_PER_SECOND) => Math.floor((frame * poses) / fps);
/** The real frame where a pose starts. */
export const poseStart = (pose: number, fps = FPS, poses = POSES_PER_SECOND) => Math.ceil((pose * fps) / poses - 1e-9) + 0;
/** The real frame to evaluate animation at: the start of the pose this frame belongs to (holds 2 or 3 frames). */
export const heldFrame = (frame: number, fps = FPS, poses = POSES_PER_SECOND) => poseStart(poseOf(frame, fps, poses), fps, poses);

/** Per-pose boil offset in px (-amp..amp) for one value of one object. */
export const boil = (seed: number, pose: number, i: number, amp = 1.5) => jitter(seed * 7919 + i, pose, 31) * amp;

export type Pt = [number, number];

/** Smooth closed path through the points (Catmull-Rom converted to cubic Beziers). */
export const closedSpline = (pts: Pt[]): string => {
  const n = pts.length;
  if (n < 3) return "";
  const f = (v: number) => Math.round(v * 10) / 10;
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return `${d} Z`;
};

/** Points on an ellipse (clockwise from the top). */
export const ellipsePts = (cx: number, cy: number, rx: number, ry: number, n = 12): Pt[] =>
  Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] as Pt;
  });

/** Points around a capsule (a rolled clay sausage) from (x1, y1) to (x2, y2) with radius r. */
export const capsulePts = (x1: number, y1: number, x2: number, y2: number, r: number, n = 6): Pt[] => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = a - Math.PI / 2 + (i / n) * Math.PI; // cap around the end point
    out.push([x2 + Math.cos(t) * r, y2 + Math.sin(t) * r]);
  }
  for (let i = 0; i <= n; i++) {
    const t = a + Math.PI / 2 + (i / n) * Math.PI; // cap around the start point
    out.push([x1 + Math.cos(t) * r, y1 + Math.sin(t) * r]);
  }
  return out;
};

/**
 * Points around a bent clay sausage that follows a polyline (shoulder, elbow, hand) with radius r: one side, a
 * rounded tip, the other side back, a rounded root. Smoothed by `closedSpline`, it reads as one rolled limb.
 */
export const sausagePts = (line: Pt[], r: number): Pt[] => {
  const n = line.length;
  const dir = (i: number): Pt => {
    const a = line[Math.max(0, i - 1)];
    const b = line[Math.min(n - 1, i + 1)];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  };
  const side = (i: number, s: number): Pt => {
    const [dx, dy] = dir(i);
    return [line[i][0] - dy * r * s, line[i][1] + dx * r * s];
  };
  const tip = (i: number, s: number): Pt[] => {
    const [dx, dy] = dir(i);
    const k = Math.SQRT1_2;
    const p = line[i];
    // From the side we arrive on, round the end (s = 1: tip, s = -1: root), to the other side.
    return [
      [p[0] + s * (dx - dy) * r * k, p[1] + s * (dy + dx) * r * k],
      [p[0] + s * dx * r, p[1] + s * dy * r],
      [p[0] + s * (dx + dy) * r * k, p[1] + s * (dy - dx) * r * k],
    ];
  };
  const out: Pt[] = [];
  for (let i = 0; i < n; i++) out.push(side(i, 1));
  out.push(...tip(n - 1, 1));
  for (let i = n - 1; i >= 0; i--) out.push(side(i, -1));
  out.push(...tip(0, -1));
  return out;
};

/** Points around a rounded rectangle (a clay slab). */
export const slabPts = (x: number, y: number, w: number, h: number, r: number): Pt[] => {
  const rr = Math.min(r, w / 2, h / 2);
  const k = 0.3 * rr;
  return [
    [x + rr, y], [x + w / 2, y], [x + w - rr, y], [x + w - k, y + k], [x + w, y + rr], [x + w, y + h / 2], [x + w, y + h - rr],
    [x + w - k, y + h - k], [x + w - rr, y + h], [x + w / 2, y + h], [x + rr, y + h], [x + k, y + h - k], [x, y + h - rr],
    [x, y + h / 2], [x, y + rr], [x + k, y + k],
  ];
};

/**
 * Lumpy clay outline: each point is pushed in or out from the centroid by a fixed seeded lump (`lump`, a share of
 * its distance) and nudged per held pose by the boil (`boilPx`). `pose` = -1 turns the boil off (still frames).
 */
export const blobPath = (pts: Pt[], seed: number, pose: number, lump = 0.035, boilPx = 1.4): string => {
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const cy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
  const moved = pts.map(([x, y], i) => {
    const k = 1 + jitter(seed, i, 7) * lump;
    const bx = pose < 0 ? 0 : boil(seed, pose, i * 2, boilPx);
    const by = pose < 0 ? 0 : boil(seed, pose, i * 2 + 1, boilPx);
    return [cx + (x - cx) * k + bx, cy + (y - cy) * k + by] as Pt;
  });
  return closedSpline(moved);
};

const hex2 = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
/** Lighten (amt > 0, towards a warm white) or darken (amt < 0, towards a warm brown) a #rrggbb colour. */
export const shade = (hex: string, amt: number): string => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const rgb = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  const target = amt >= 0 ? [255, 246, 228] : [42, 22, 12];
  const t = Math.min(1, Math.abs(amt));
  return `#${rgb.map((c, i) => hex2(c + (target[i] - c) * t)).join("")}`;
};

/** Smoothstep 0..1 between two frames. */
export const ramp = (frame: number, from: number, to: number) => {
  const u = Math.max(0, Math.min(1, (frame - from) / Math.max(1e-6, to - from)));
  return u * u * (3 - 2 * u);
};

/** Count-up value at a held frame: steps once per pose, finishes exactly on `value`. */
export const countAt = (frame: number, from: number, dur: number, value: number, decimals = 0) => {
  const v = value * ramp(frame, from, from + dur);
  const p = 10 ** decimals;
  return Math.round(v * p) / p;
};
