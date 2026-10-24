/**
 * Isometric drawing helpers for the Isofigure style bundle: one projection, paper-card solids shaded from a single
 * light, flat drawing laid onto isometric planes with one SVG matrix (so text, rings and buttons sit in perspective).
 * World axes: +x runs down-right, +y down-left, +z up. The viewer sees the top, the y-max face (left, "front") and
 * the x-max face (right, "side").
 */
import React from "react";

export const W = 760;
export const H = 560;
export const INK = "#2a2118";

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);

export type P2 = [number, number];
export type P3 = [number, number, number];
export type Iso = {
  ox: number; oy: number; k: number;
  /** 3D point to screen */
  P: (x: number, y: number, z: number) => P2;
  /** matrix() that lays flat 2D drawing (origin O, axes U and V) onto an isometric plane */
  plane: (O: P3, U: P3, V: P3) => string;
  /** front face (y = const, facing lower-left); origin = its top-left corner, local v runs down */
  front: (x: number, y: number, z: number) => string;
  /** side face (x = const, facing lower-right); origin = its top-left corner, local u runs along -y */
  side: (x: number, y: number, z: number) => string;
  /** top face (z = const) */
  top: (x: number, y: number, z: number) => string;
};

export const makeIso = (ox: number, oy: number, k = 1): Iso => {
  const P = (x: number, y: number, z: number): P2 => [(x - y) * C * k + ox, (x + y) * S * k - z * k + oy];
  const D = (x: number, y: number, z: number): P2 => [(x - y) * C * k, (x + y) * S * k - z * k];
  const plane = (O: P3, U: P3, V: P3) => {
    const o = P(...O), u = D(...U), v = D(...V);
    return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`;
  };
  return {
    ox, oy, k, P, plane,
    front: (x, y, z) => plane([x, y, z], [1, 0, 0], [0, 0, -1]),
    side: (x, y, z) => plane([x, y, z], [0, -1, 0], [0, 0, -1]),
    top: (x, y, z) => plane([x, y, z], [1, 0, 0], [0, 1, 0]),
  };
};

/** Choose scale and origin so the given world points fill a w x h view with `pad` margin. */
export const fitIso = (pts: P3[], w = W, h = H, pad = 40): Iso => {
  const q = makeIso(0, 0, 1);
  const s = pts.map((p) => q.P(...p));
  const minX = Math.min(...s.map((p) => p[0])), maxX = Math.max(...s.map((p) => p[0]));
  const minY = Math.min(...s.map((p) => p[1])), maxY = Math.max(...s.map((p) => p[1]));
  const k = Math.min((w - 2 * pad) / (maxX - minX), (h - 2 * pad) / (maxY - minY));
  return makeIso(w / 2 - (k * (minX + maxX)) / 2, h / 2 - (k * (minY + maxY)) / 2, k);
};

/* ---------- colour ---------- */
const rgb = (c: string) => {
  if (c.startsWith("rgb")) return (c.match(/\d+/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: string, b: string, t: number) => {
  const A = rgb(a), B = rgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};
const unit = (v: number[]) => { const l = Math.hypot(...v); return v.map((a) => a / l); };
export const LIGHT = unit([0.2, 0.55, 0.8]);

/** Tone of a face with normal `n`: lit faces drift toward white, shaded faces toward black. */
export const faceTone = (base: string, n: number[], light = LIGHT) => {
  const f = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
  return f > 0.6 ? mix(base, "#ffffff", (f - 0.6) * 0.5) : mix(base, "#000000", (0.6 - f) * 0.75);
};

/* ---------- solids ---------- */
const poly = (p: P2[]) => "M" + p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("L") + "Z";

/** Ink-line width grows with the part's screen size: small parts stay fine, big bodies look solid. */
export const edgeWidth = (p: P2[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; }
  return Math.min(2.4, 0.55 + Math.sqrt(Math.abs(a) / 2) * 0.012);
};

export const Face: React.FC<{ p: P2[]; fill: string; opacity?: number }> = ({ p, fill, opacity }) => (
  <path d={poly(p)} fill={fill} stroke={INK} strokeOpacity={0.62} strokeWidth={edgeWidth(p)} strokeLinejoin="round" opacity={opacity} />
);

/** A box: x, y, z is its lowest corner; w along x, d along y, h up. Three visible faces, shaded. */
export const Box: React.FC<{ o: Iso; x: number; y: number; z: number; w: number; d: number; h: number; color: string; opacity?: number }> = ({ o, x, y, z, w, d, h, color, opacity }) => {
  const p = o.P;
  return (
    <g opacity={opacity}>
      <Face p={[p(x, y + d, z + h), p(x + w, y + d, z + h), p(x + w, y + d, z), p(x, y + d, z)]} fill={faceTone(color, [0, 1, 0])} />
      <Face p={[p(x + w, y, z + h), p(x + w, y + d, z + h), p(x + w, y + d, z), p(x + w, y, z)]} fill={faceTone(color, [1, 0, 0])} />
      <Face p={[p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)]} fill={faceTone(color, [0, 0, 1])} />
    </g>
  );
};

/** A flat drawing on the front face; children use local units (u right, v down from the corner). */
export const OnFront: React.FC<{ o: Iso; x: number; y: number; z: number; opacity?: number; children: React.ReactNode }> = ({ o, x, y, z, opacity, children }) => (
  <g transform={o.front(x, y, z)} opacity={opacity}>{children}</g>
);
export const OnSide: React.FC<{ o: Iso; x: number; y: number; z: number; opacity?: number; children: React.ReactNode }> = ({ o, x, y, z, opacity, children }) => (
  <g transform={o.side(x, y, z)} opacity={opacity}>{children}</g>
);

/** A round part with its axis along y (towards the viewer): a stack of discs, back to front, darker at the back. */
export const DiscStack: React.FC<{ o: Iso; cx: number; cz: number; r: number; y0: number; y1: number; color: string; step?: number; opacity?: number }> = ({ o, cx, cz, r, y0, y1, color, step = 6, opacity }) => {
  const n = Math.max(1, Math.round((y1 - y0) / step));
  return (
    <g opacity={opacity}>
      {Array.from({ length: n + 1 }, (_, i) => {
        const t = i / n;
        const y = y0 + (y1 - y0) * t;
        return (
          <g key={i} transform={o.plane([cx, y, cz], [1, 0, 0], [0, 0, -1])}>
            <circle r={r} fill={mix(darkOf(color), color, 0.35 + 0.65 * t)} stroke={INK} strokeOpacity={i === n ? 0.7 : 0.18} strokeWidth={i === n ? 1.6 : 0.8} vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </g>
  );
};
const darkOf = (c: string) => mix(c, "#000000", 0.55);

/** A coil spring between two heights, drawn as a projected helix. */
export const Coil: React.FC<{ o: Iso; x: number; y: number; z0: number; z1: number; turns?: number; rad?: number; color?: string }> = ({ o, x, y, z0, z1, turns = 7, rad = 8, color = "#6b7077" }) => {
  const N = turns * 14;
  const pts = Array.from({ length: N + 1 }, (_, i) => {
    const t = i / N, a = t * turns * Math.PI * 2;
    return o.P(x + rad * Math.cos(a), y + rad * Math.sin(a), z0 + (z1 - z0) * t);
  });
  const d = "M" + pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("L");
  return (
    <g fill="none" strokeLinejoin="round">
      <path d={d} stroke={INK} strokeOpacity={0.65} strokeWidth={4} />
      <path d={d} stroke={color} strokeWidth={2.6} />
      <path d={d} stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.8} />
    </g>
  );
};

/** A straight rod or belt between two world points. */
export const Rod: React.FC<{ o: Iso; a: P3; b: P3; w?: number; color?: string }> = ({ o, a, b, w = 3, color = "#202020" }) => {
  const p = o.P(...a), q = o.P(...b);
  return <path d={`M${p[0]} ${p[1]}L${q[0]} ${q[1]}`} stroke={color} strokeWidth={w} strokeLinecap="round" fill="none" />;
};
