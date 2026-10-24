/**
 * Cheap neon glow. Every neon stroke is drawn as stacked copies of the same path: a wide faint halo, a mid glow,
 * the tube itself and an optional white-hot core. No SVG blur filter, so the glow costs a few extra stroke paints
 * instead of a full-layer Gaussian blur (the main render cost of this style; see the style guide, section 9).
 */
import React from "react";

export type NeonProps = {
  d: string;
  color: string;
  /** Tube width in px (the solid stroke). Halo copies scale from it. */
  w?: number;
  /** Halo strength 0..1.5 (1 = default). 0 draws the tube only. */
  glow?: number;
  /** White-hot core line down the middle of the tube. */
  core?: boolean;
  /** Overall brightness 0..1 (use flickerAt / powerOn). */
  on?: number;
  /** Fill under the strokes (night colour to occlude what is behind; never a bright fill). */
  fill?: string;
  /** Draw-on progress 0..1 (strokes trace themselves in). */
  draw?: number;
  /** Dash pattern for broken tubes, e.g. "18 10". Ignored while `draw` < 1. */
  dash?: string;
};

export const Neon: React.FC<NeonProps> = ({ d, color, w = 6, glow = 1, core = true, on = 1, fill, draw = 1, dash }) => {
  if (on <= 0.001 && !fill) return null;
  const tracing = draw < 1;
  const base = {
    d,
    fill: "none",
    stroke: color,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...(tracing ? { pathLength: 1, strokeDasharray: 1, strokeDashoffset: 1 - Math.max(0, draw) } : dash ? { strokeDasharray: dash } : {}),
  };
  const lit = Math.max(0, Math.min(1, on));
  return (
    <g>
      {fill && <path d={d} fill={fill} stroke="none" />}
      {glow > 0 && <path {...base} strokeWidth={w * (3.6 + 2 * glow)} opacity={0.1 * glow * lit} />}
      {glow > 0 && <path {...base} strokeWidth={w * 2.3} opacity={0.3 * Math.min(1, glow) * lit} />}
      <path {...base} strokeWidth={w} opacity={0.25 + 0.75 * lit} />
      {core && lit > 0.05 && <path {...base} stroke="#ffffff" strokeWidth={Math.max(1, w * 0.36)} opacity={0.8 * lit} />}
    </g>
  );
};
