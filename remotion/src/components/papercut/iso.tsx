/**
 * Isometric paper blocks. Each box has three visible faces shaded from one light direction (top lightest, then the
 * left face, then the right face), so stairs, pillars and cliff steps read as stacked pieces of card.
 * `plane()` turns flat 2D shapes (a ring, text) into an isometric plane with one SVG matrix.
 */
import React from "react";
import { Cut, P, mix } from "./paper";
import { useUi } from "./ui";

const C = Math.cos(Math.PI / 6);
const S = Math.sin(Math.PI / 6);

/** Projection with the 3D origin at screen (ox, oy). +x runs down-right, +y down-left, +z up. */
export const iso = (ox: number, oy: number, k = 1) => ({
  P: (x: number, y: number, z: number): P => [(x - y) * C * k + ox, (x + y) * S * k - z * k + oy],
  /** matrix() that lays flat 2D drawing (origin = O, axes U and V) onto an isometric plane */
  plane: (O: [number, number, number], U: [number, number, number], V: [number, number, number]) => {
    const p = (x: number, y: number, z: number): P => [(x - y) * C * k + ox, (x + y) * S * k - z * k + oy];
    const o = p(...O);
    const u = [(U[0] - U[1]) * C * k, (U[0] + U[1]) * S * k - U[2] * k];
    const v = [(V[0] - V[1]) * C * k, (V[0] + V[1]) * S * k - V[2] * k];
    return `matrix(${u[0]} ${u[1]} ${v[0]} ${v[1]} ${o[0]} ${o[1]})`;
  },
});

const norm = (v: number[]) => {
  const l = Math.hypot(...v);
  return v.map((a) => a / l);
};
export const LIGHT = norm([0.2, 0.55, 0.8]);

/** Shade a base colour for a face normal: lit faces drift toward white, shaded faces toward black. */
export const faceTone = (base: string, n: number[], light = LIGHT) => {
  const f = Math.max(0, n[0] * light[0] + n[1] * light[1] + n[2] * light[2]);
  return f > 0.6 ? mix(base, "#ffffff", (f - 0.6) * 0.5) : mix(base, "#000000", (0.6 - f) * 0.75);
};

export const IsoBox: React.FC<{
  o: ReturnType<typeof iso>; x: number; y: number; z: number; w: number; d: number; h: number;
  color: string; light?: number[]; opacity?: number;
}> = ({ o, x, y, z, w, d, h, color, light = LIGHT, opacity }) => {
  const { P: p } = o;
  return (
    <g opacity={opacity}>
      <Cut p={[p(x, y + d, z + h), p(x + w, y + d, z + h), p(x + w, y + d, z), p(x, y + d, z)]} fill={faceTone(color, [0, 1, 0], light)} />
      <Cut p={[p(x + w, y, z + h), p(x + w, y + d, z + h), p(x + w, y + d, z), p(x + w, y, z)]} fill={faceTone(color, [1, 0, 0], light)} />
      <Cut p={[p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)]} fill={faceTone(color, [0, 0, 1], light)} />
    </g>
  );
};

/** A flight of steps rising toward -y (away from the viewer). Painter's order: far steps first. */
export const IsoStairs: React.FC<{ o: ReturnType<typeof iso>; x: number; y: number; z: number; w: number; steps: number; rise: number; run: number; color: string }> = ({ o, x, y, z, w, steps, rise, run, color }) => (
  <g>
    {Array.from({ length: steps }, (_, i) => {
      // i = 0 is the top step (farthest)
      return <IsoBox key={i} o={o} x={x} y={y + i * run} z={z} w={w} d={run} h={(steps - i) * rise} color={i % 2 ? color : mix(color, "#ffffff", 0.08)} />;
    })}
  </g>
);

/**
 * The star gate as an isometric diorama: platform, two block pillars, a gold ring lying on the front plane and a flight
 * of steps. "Look inside" (ui.xray) turns the pillars see-through to show their glowing rune cores and the ring's lens.
 */
export const IsoGate: React.FC<{ ox: number; oy: number; t: number; k?: number }> = ({ ox, oy, t, k = 1.15 }) => {
  const { xray } = useUi();
  const o = iso(ox, oy, k);
  const stone = "#a59d8a";
  const pillarOpacity = 1 - 0.82 * xray;
  const pulse = 1 + Math.sin(t * 2) * 0.04;
  const rc = o.P(120, 20, 118); // ring centre on screen
  const ringPlane = o.plane([120, 20, 118], [1, 0, 0], [0, 0, -1]);
  const pillar = (x: number) => (
    <g>
      <IsoBox o={o} x={x} y={0} z={0} w={40} d={40} h={230} color={stone} opacity={pillarOpacity} />
      <IsoBox o={o} x={x - 6} y={-6} z={230} w={52} d={52} h={14} color="#c4bba5" opacity={pillarOpacity} />
    </g>
  );
  const core = (x: number) => (
    <g opacity={xray}>
      <IsoBox o={o} x={x + 14} y={14} z={8} w={12} d={12} h={214} color="#ffd266" />
      {[40, 90, 140, 190].map((z) => <IsoBox key={z} o={o} x={x + 8} y={8} z={z} w={24} d={24} h={8} color="#ffe39a" />)}
    </g>
  );
  return (
    <g>
      <circle cx={rc[0]} cy={rc[1]} r={260} fill="url(#glow-w)" style={{ mixBlendMode: "screen" }} opacity={0.85} />
      <IsoBox o={o} x={-40} y={-20} z={-18} w={320} d={80} h={18} color="#8f8774" />
      {core(0)}
      {pillar(0)}
      <g transform={ringPlane} filter="url(#sh-s)">
        <g transform={`scale(${pulse})`}>
          <circle r={86} fill="#6b5a2a" stroke="rgba(255,255,255,.25)" />
          <circle r={78} fill="#e2b341" />
          <circle r={68} fill="#8a6b22" />
          <circle r={60} fill="#ffd96a" />
          <circle r={48} fill="url(#glow-w)" />
          {Array.from({ length: 12 }, (_, i) => (
            <path key={i} d="M0 -68 L5 -78 L-5 -78Z" transform={`rotate(${i * 30})`} fill="#fff1b0" />
          ))}
          <g opacity={xray}>
            <circle r={36} fill="none" stroke="#fff6d0" strokeWidth={2} strokeDasharray="6 5" strokeDashoffset={t * 20} />
            <path d="M0 -30 L9 0 L0 30 L-9 0Z" fill="#fffbe6" transform={`rotate(${t * 40})`} />
          </g>
        </g>
      </g>
      {core(200)}
      {pillar(200)}
      <IsoStairs o={o} x={40} y={44} z={0} w={160} steps={4} rise={12} run={26} color="#b4ad99" />
    </g>
  );
};
