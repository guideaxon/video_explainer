/**
 * Papercut kit: everything is drawn in code (SVG polygons, gradients, filters). No image, font or audio assets.
 * Paper look = flat-colour facets + a thin pale cut edge + soft drop shadows per layer + a grain overlay.
 */
import React from "react";
import { pokeAge, pokeKick, useUi } from "./ui";

export const W = 1280;
export const H = 720;

export const rng = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

const hex = (c: string) => {
  if (c.startsWith("rgb")) return (c.match(/\d+/g) ?? [0, 0, 0]).slice(0, 3).map(Number); // mix() output can be re-mixed
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const mix = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  const o = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return `rgb(${o[0]},${o[1]},${o[2]})`;
};
export const lighten = (c: string, t: number) => mix(c, "#ffffff", t);
export const darken = (c: string, t: number) => mix(c, "#000000", t);

export type P = [number, number];
export const path = (p: P[]) => "M" + p.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join("L") + "Z";

const EDGE = "rgba(255,255,255,0.22)";

/** Cut-edge width grows with the part's size: petals and ears stay fine, rocks and cliffs look solid. */
export const edgeWidth = (p: P[]) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length];
    a += p[i][0] * q[1] - q[0] * p[i][1];
  }
  return Math.min(2.1, 0.45 + Math.sqrt(Math.abs(a) / 2) * 0.011);
};

/** One paper facet. */
export const Cut: React.FC<{ p: P[]; fill: string; edge?: boolean; opacity?: number }> = ({ p, fill, edge = true, opacity }) => (
  <path d={path(p)} fill={fill} stroke={edge ? EDGE : "none"} strokeWidth={edge ? edgeWidth(p) : 0} strokeLinejoin="round" opacity={opacity} />
);

/** A depth layer: parallax with the camera + a drop shadow of its whole silhouette. */
export const L: React.FC<{
  d?: number;
  cam: number;
  sh?: "none" | "s" | "m" | "l";
  dy?: number;
  children: React.ReactNode;
}> = ({ d = 0, cam, sh = "m", dy = 0, children }) => (
  <g transform={`translate(${(-cam * d * 60).toFixed(2)} ${dy.toFixed(2)})`} filter={sh === "none" ? undefined : `url(#sh-${sh})`}>
    {children}
  </g>
);

export const Defs: React.FC = () => (
  <defs>
    <filter id="sh-s" x="-10%" y="-10%" width="125%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#05060f" floodOpacity="0.5" />
    </filter>
    <filter id="sh-m" x="-5%" y="-8%" width="112%" height="125%">
      <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor="#05060f" floodOpacity="0.45" />
    </filter>
    <filter id="sh-l" x="-5%" y="-8%" width="112%" height="125%">
      <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#05060f" floodOpacity="0.5" />
    </filter>
    <filter id="grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0.9 -0.25" />
    </filter>
    <filter id="fiber" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.012 0.18" numOctaves="2" seed="3" result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.9  0 0 0 1.1 -0.5" />
    </filter>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" />
    </filter>
    <radialGradient id="glow-w">
      <stop offset="0" stopColor="#fff6d0" stopOpacity="0.95" />
      <stop offset="0.35" stopColor="#ffe08a" stopOpacity="0.45" />
      <stop offset="1" stopColor="#ffd36a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="glow-g">
      <stop offset="0" stopColor="#fff2a8" stopOpacity="0.95" />
      <stop offset="0.3" stopColor="#ffd84a" stopOpacity="0.4" />
      <stop offset="1" stopColor="#ffd84a" stopOpacity="0" />
    </radialGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.55" stopColor="#000" stopOpacity="0" />
      <stop offset="1" stopColor="#000" stopOpacity="0.5" />
    </radialGradient>
  </defs>
);

/** Paper grain + fibres + vignette over the whole frame. */
export const PaperOverlay: React.FC = () => (
  <g pointerEvents="none">
    <rect width={W} height={H} filter="url(#grain)" opacity={0.3} style={{ mixBlendMode: "multiply" }} />
    <rect width={W} height={H} filter="url(#fiber)" opacity={0.1} style={{ mixBlendMode: "screen" }} />
    <rect width={W} height={H} fill="url(#vig)" />
  </g>
);

/** Guiding four-point star. */
export const GuideStar: React.FC<{ x: number; y: number; r?: number; t: number; glow?: number }> = ({ x, y, r = 22, t, glow = 1 }) => {
  const ui = useUi();
  const age = pokeAge(ui, "star", "star");
  const kick = pokeKick(age, 1.6);
  // swells with the music and flares when clicked
  const pulse = 1 + Math.sin(t * 2.4) * 0.09 + ui.level * 0.35 + kick * 0.7;
  const R = r * pulse;
  const k = R * 0.2;
  const star: P[] = [
    [0, -R * 1.5], [k, -k], [R, 0], [k, k], [0, R * 1.5], [-k, k], [-R, 0], [-k, -k],
  ];
  const small: P[] = star.map(([a, b]) => [a * 0.6, b * 0.6] as P);
  return (
    <g transform={`translate(${x} ${y})`} data-poke="star" data-id="star" style={{ cursor: "pointer" }}>
      <circle r={R * 5.5 * glow * (1 + kick * 0.6)} fill="url(#glow-w)" style={{ mixBlendMode: "screen" }} />
      {kick > 0 && Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        const d = (1 - kick) * R * 9 + R;
        const s = R * 0.35 * kick;
        return <path key={i} d={path([[0, -s * 2], [s * 0.5, 0], [0, s * 2], [-s * 0.5, 0]])} transform={`translate(${Math.cos(a) * d} ${Math.sin(a) * d})`} fill="#fff3b8" opacity={kick} />;
      })}
      <circle r={R * 2.6} fill="transparent" pointerEvents="all" />
      <g transform={`rotate(${Math.sin(t * 0.8) * 4})`}>
        <path d={path(star)} fill="#ffe9a0" stroke="#fff8d8" strokeWidth={1.2} />
        <path d={path(small)} fill="#fffbe8" transform="rotate(45)" />
      </g>
    </g>
  );
};

export const Fireflies: React.FC<{ n: number; seed: number; t: number; x0?: number; x1?: number; y0?: number; y1?: number }> = ({
  n, seed, t, x0 = 0, x1 = W, y0 = 60, y1 = 560,
}) => {
  const r = rng(seed);
  const { level } = useUi();
  return (
    <g style={{ mixBlendMode: "screen" }}>
      {Array.from({ length: n }, (_, i) => {
        const bx = x0 + r() * (x1 - x0);
        const by = y0 + r() * (y1 - y0);
        const ph = r() * 6.28;
        const sp = 0.4 + r() * 0.6;
        const x = bx + Math.sin(t * sp + ph) * 22;
        const y = by + Math.cos(t * sp * 0.8 + ph) * 16 - t * 3 * sp;
        const tw = Math.min(1, 0.45 + 0.55 * Math.sin(t * (1.5 + sp) + ph) ** 2 + level * 0.5);
        const sz = 1.6 + r() * 2.2;
        return (
          <g key={i} opacity={tw}>
            <circle cx={x} cy={y} r={sz * 6} fill="url(#glow-g)" />
            <circle cx={x} cy={y} r={sz} fill="#fffbd0" />
          </g>
        );
      })}
    </g>
  );
};

export const Rain: React.FC<{ t: number; n?: number; slant?: number }> = ({ t, n = 150, slant = 0.25 }) => {
  const r = rng(11);
  return (
    <g stroke="#cfe0ff" strokeWidth={1.4} opacity={0.5}>
      {Array.from({ length: n }, (_, i) => {
        const x0 = r() * (W + 200) - 100;
        const sp = 900 + r() * 500;
        const len = 18 + r() * 22;
        const y = ((r() * H + t * sp) % (H + 60)) - 30;
        const x = x0 - y * slant;
        return <line key={i} x1={x} y1={y} x2={x - len * slant} y2={y + len} />;
      })}
    </g>
  );
};

export const Snowfall: React.FC<{ t: number; n?: number }> = ({ t, n = 90 }) => {
  const r = rng(5);
  return (
    <g fill="#fff" opacity={0.85}>
      {Array.from({ length: n }, (_, i) => {
        const x0 = r() * W;
        const sp = 20 + r() * 40;
        const y = ((r() * H + t * sp) % (H + 20)) - 10;
        const x = x0 + Math.sin(t * 0.8 + i) * 18;
        return <circle key={i} cx={x} cy={y} r={1 + r() * 2.2} />;
      })}
    </g>
  );
};
