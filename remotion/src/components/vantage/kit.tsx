import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadCinzel } from "@remotion/google-fonts/Cinzel";
import { loadFont as loadMono } from "@remotion/google-fonts/IBMPlexMono";

const cinzel = loadCinzel("normal", { weights: ["700", "900"], subsets: ["latin"] });
const plex = loadMono("normal", { weights: ["400", "500"], subsets: ["latin"] });
export const SERIF = cinzel.fontFamily;
export const MONO = plex.fontFamily;

export const W = 1080;
export const H = 1920;
export const ART_H = 1660; // themed film area; below is the caption band

export const THEMES = {
  parch: { bg: "#d9ceb4", ink: "#1b1712", accent: "#b3261e", dim: "#6f6550", glow: false },
  navy: { bg: "#0a1127", ink: "#f2efe6", accent: "#f2b84b", dim: "#7f8aa8", glow: true },
} as const;
export type ThemeName = keyof typeof THEMES;
const ThemeCtx = createContext<(typeof THEMES)[ThemeName]>(THEMES.navy);
export const useTheme = () => useContext(ThemeCtx);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.4, 0, 0.2, 1);

export const prog = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });

export const usePop = (delay: number, damping = 16) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 120 } });
};

const Grain: React.FC<{ opacity: number; blend: string }> = ({ opacity, blend }) => (
  <svg width={W} height={ART_H} style={{ position: "absolute", left: 0, top: 0, mixBlendMode: blend as any, opacity }}>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width={W} height={ART_H} filter="url(#grain)" />
  </svg>
);

const Brackets: React.FC<{ color: string }> = ({ color }) => {
  const m = 44;
  const s = 34;
  const p = (x: number, y: number, dx: number, dy: number) => `M${x + dx * s},${y} L${x},${y} L${x},${y + dy * s}`;
  return (
    <g stroke={color} strokeWidth={2} fill="none" opacity={0.7}>
      <path d={p(m, m, 1, 1)} />
      <path d={p(W - m, m, -1, 1)} />
      <path d={p(m, ART_H - m, 1, -1)} />
      <path d={p(W - m, ART_H - m, -1, -1)} />
    </g>
  );
};

/** Film frame: themed background, grain, HUD brackets/labels, timeline, navy caption band below. */
export const Scene: React.FC<{
  theme: ThemeName;
  beat: number; // 1..6, drives the timeline fill
  chapter: string;
  readout: string;
  fade?: boolean;
  children?: React.ReactNode; // SVG art + text layers
}> = ({ theme, beat, chapter, readout, fade = true, children }) => {
  const T = THEMES[theme];
  const frame = useCurrentFrame();
  const fadeIn = fade ? prog(frame, 0, 6) : 1;
  const fill = (beat - 1) / 6 + (prog(frame, 0, 190) * 1) / 6;
  const tl = { x1: 90, x2: 990, y: 1560 };
  return (
    <ThemeCtx.Provider value={T}>
      <AbsoluteFill style={{ background: "#0a1127", fontFamily: MONO }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: W, height: ART_H, background: T.bg, opacity: fadeIn, overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: theme === "parch" ? "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(60,40,10,0.28) 100%)" : "radial-gradient(ellipse at 50% 40%, #16224a 0%, transparent 70%)" }} />
          <Grain opacity={theme === "parch" ? 0.22 : 0.07} blend={theme === "parch" ? "multiply" : "screen"} />
          <svg width={W} height={ART_H} style={{ position: "absolute", left: 0, top: 0 }}>
            <Brackets color={T.ink} />
            <text x={90} y={96} fill={T.dim} fontSize={22} letterSpacing={3}>{`VANTAGE · ${chapter}`}</text>
            <text x={W - 90} y={96} fill={T.dim} fontSize={22} letterSpacing={3} textAnchor="end">PRIVATE AI LIFE COACH</text>
            <line x1={tl.x1} x2={tl.x2} y1={tl.y} y2={tl.y} stroke={T.dim} strokeWidth={2} opacity={0.6} />
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <line key={i} x1={tl.x1 + (900 * i) / 6} x2={tl.x1 + (900 * i) / 6} y1={tl.y - 8} y2={tl.y + 8} stroke={T.dim} strokeWidth={2} opacity={0.6} />
            ))}
            <line x1={tl.x1} x2={tl.x1 + 900 * fill} y1={tl.y} y2={tl.y} stroke={T.accent} strokeWidth={4} />
            <text x={90} y={tl.y + 48} fill={T.ink} fontSize={24} letterSpacing={2}>{chapter}</text>
            <text x={W - 90} y={tl.y + 48} fill={T.ink} fontSize={24} letterSpacing={2} textAnchor="end">{readout}</text>
          </svg>
          {children}
        </div>
      </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};

/** Draws a stroked path on, using pathLength normalisation. */
export const Draw: React.FC<{
  d: string;
  from: number;
  dur?: number;
  w?: number;
  color?: string;
  fill?: string;
  opacity?: number;
}> = ({ d, from, dur = 30, w = 4, color, fill = "none", opacity = 1 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const p = prog(frame, from, from + dur);
  return (
    <path
      d={d}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={1 - p}
      stroke={color ?? T.ink}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill={fill}
      opacity={p > 0 ? opacity : 0}
    />
  );
};

/** Svg wrapper positioned over the art area; adds a soft glow in dark theme. */
export const Art: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const T = useTheme();
  return (
    <svg
      width={W}
      height={ART_H}
      style={{ position: "absolute", left: 0, top: 0, filter: T.glow ? `drop-shadow(0 0 10px ${T.accent}66)` : undefined }}
    >
      {children}
    </svg>
  );
};

/** Editorial headline: serif caps, words starting with * use the accent colour. */
export const Headline: React.FC<{
  lines: string[];
  top?: number;
  size?: number;
  delay?: number;
  align?: "left" | "center";
}> = ({ lines, top = 190, size = 124, delay = 0, align = "left" }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 90, right: 90, top, textAlign: align, fontFamily: SERIF, fontWeight: 900, fontSize: size, lineHeight: 1.04, color: T.ink, letterSpacing: 2 }}>
      {lines.map((line, i) => {
        const p = prog(frame, delay + i * 9, delay + i * 9 + 14);
        return (
          <div key={i} style={{ opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
            {line.split(" ").map((w, j) =>
              w.startsWith("*") ? (
                <span key={j} style={{ color: T.accent, textShadow: T.glow ? `0 0 28px ${T.accent}88` : undefined }}>
                  {w.slice(1)}{" "}
                </span>
              ) : (
                <span key={j}>{w} </span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
};

export const Label: React.FC<{
  children: React.ReactNode;
  x: number;
  y: number;
  size?: number;
  delay?: number;
  anchor?: "start" | "middle" | "end";
  color?: string;
  serif?: boolean;
  weight?: number;
  spacing?: number;
}> = ({ children, x, y, size = 26, delay = 0, anchor = "start", color, serif, weight = 500, spacing = 3 }) => {
  const T = useTheme();
  const p = prog(useCurrentFrame(), delay, delay + 12);
  return (
    <div
      style={{
        position: "absolute",
        left: anchor === "start" ? x : anchor === "middle" ? x - 500 : x - 1000,
        width: anchor === "start" ? undefined : anchor === "middle" ? 1000 : 1000,
        top: y,
        textAlign: anchor === "start" ? "left" : anchor === "middle" ? "center" : "right",
        fontFamily: serif ? SERIF : MONO,
        fontWeight: serif ? 700 : weight,
        fontSize: size,
        letterSpacing: spacing,
        color: color ?? T.ink,
        opacity: p,
        transform: `translateY(${(1 - p) * 14}px)`,
        whiteSpace: "nowrap",
        textShadow: T.glow && color ? `0 0 20px ${color}77` : undefined,
      }}
    >
      {children}
    </div>
  );
};

/** Small neural-net glyph that "thinks" (nodes pulse). Centered at cx, cy. */
export const NeuralNet: React.FC<{ cx: number; cy: number; scale?: number; from?: number }> = ({ cx, cy, scale = 1, from = 0 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const cols = [-100, 0, 100];
  const rows = [[-90, 0, 90], [-135, -45, 45, 135], [-90, 0, 90]];
  const nodes = cols.flatMap((x, c) => rows[c].map((y, r) => ({ x, y, c, r })));
  const edges: { a: (typeof nodes)[number]; b: (typeof nodes)[number] }[] = [];
  nodes.forEach((a) => nodes.forEach((b) => b.c === a.c + 1 && edges.push({ a, b })));
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      {edges.map((e, i) => (
        <line key={i} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y} stroke={T.accent} strokeWidth={1.5} opacity={0.35 * prog(frame, from + 8 + (i % 6) * 2, from + 30)} />
      ))}
      {nodes.map((n, i) => {
        const pulse = 0.55 + 0.45 * Math.sin(frame / 7 - n.c * 1.4 - n.r * 0.7);
        const p = prog(frame, from + n.c * 8 + n.r * 2, from + 20 + n.c * 8);
        return <circle key={i} cx={n.x} cy={n.y} r={11 * p} fill={T.bg} stroke={T.accent} strokeWidth={3} opacity={0.4 + 0.6 * pulse} />;
      })}
    </g>
  );
};

export const PhonePath = (cx: number, cy: number, w: number, h: number, r = 44) => {
  const x = cx - w / 2;
  const y = cy - h / 2;
  return `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
};

export const LockGlyph: React.FC<{ cx: number; cy: number; scale?: number; from?: number }> = ({ cx, cy, scale = 1, from = 0 }) => {
  const T = useTheme();
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <Draw d="M-34,-8 V-34 A34,34 0 0 1 34,-34 V-8" from={from} dur={18} w={6} color={T.accent} />
      <Draw d="M-52,-8 H52 V62 H-52 Z" from={from + 8} dur={22} w={6} color={T.accent} />
      <Draw d="M0,18 V38" from={from + 24} dur={10} w={7} color={T.accent} />
    </g>
  );
};
