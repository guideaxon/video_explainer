/**
 * Markets channel kit: building blocks for vertical (1080x1920, 9:16, mobile-first) market-story
 * explainers. Data-driven chart primitives; scenes pass data, not geometry.
 * See docs/markets_video_style_guide.md.
 *
 * Layout: chapter header at the top (y 90 to 250), one chart below (y 380 to 1300), a hand-written
 * note or insight under it (y 1300 to 1500). Safe zone: y 160 to 1500, x 60 to 1020.
 */
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadBaskerville } from "@remotion/google-fonts/LibreBaskerville";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";

const bask = loadBaskerville("normal", { weights: ["400", "700"], subsets: ["latin"] });
const play = loadPlayfair("normal", { weights: ["700", "900"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["400", "600", "800"], subsets: ["latin"] });
const caveat = loadCaveat("normal", { weights: ["500", "700"], subsets: ["latin"] });
export const SERIF = bask.fontFamily; // chapter headers (lowercase)
export const TITLE = play.fontFamily; // title card and sign-off
export const SANS = inter.fontFamily; // labels and numbers
export const HAND = caveat.fontFamily; // annotations

export const W = 1080;
export const H = 1920;

export const THEMES = {
  paper: {
    name: "paper", bg: "#f4ecc8", ink: "#1c2340", dim: "#6f6d58", grid: "rgba(28,35,64,0.14)",
    up: "#1f9d55", down: "#d64545", amber: "#e0a82e", blue: "#3b6fd8", tile: "#efe6bd",
  },
  terminal: {
    name: "terminal", bg: "#0b1230", ink: "#e8ecf8", dim: "#8f9abf", grid: "rgba(255,255,255,0.10)",
    up: "#2ee08a", down: "#ff5d5d", amber: "#f4c14e", blue: "#6f9cff", tile: "#16204a",
  },
} as const;
export type ThemeName = keyof typeof THEMES;
export type Theme = (typeof THEMES)[ThemeName];
const ThemeCtx = createContext<Theme>(THEMES.paper);
export const useTheme = () => useContext(ThemeCtx);

export type Box = { x: number; y: number; w: number; h: number };
/** Standard chart box under the header. */
export const CHART: Box = { x: 160, y: 380, w: 820, h: 820 };

const ease = Easing.bezier(0.4, 0, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });
export const usePop = (delay: number, damping = 15) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 120 } });
};

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
export const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `rgb(${m(r1, r2)},${m(g1, g2)},${m(b1, b2)})`;
};
export const signed = (n: number, d = 1) => `${n >= 0 ? "+" : "-"}${Math.abs(n).toFixed(d)}%`;

/** Chapter frame: paper (cream + hatching) or terminal (navy) surface, header, footer. */
export const MScene: React.FC<{
  theme: ThemeName;
  chapter: string; // lowercase serif header (may contain \n)
  meta?: string; // small label under the header
  story?: string; // footer label
  children?: React.ReactNode;
}> = ({ theme, chapter, meta, story = "MARKET STORY Nº 01 · SAMPLE DATA", children }) => {
  const T = THEMES[theme];
  const frame = useCurrentFrame();
  const fade = prog(frame, 0, 8);
  const hatch =
    theme === "paper"
      ? "repeating-linear-gradient(135deg, rgba(28,35,64,0.045) 0 2px, transparent 2px 30px)"
      : "radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px) 0 0/40px 40px";
  const title = prog(frame, 2, 18);
  return (
    <ThemeCtx.Provider value={T}>
      <AbsoluteFill style={{ background: T.bg, opacity: fade, fontFamily: SANS }}>
        <AbsoluteFill style={{ background: hatch }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.10) 100%)" }} />
        <div style={{ position: "absolute", left: 80, top: 150, width: 920, fontFamily: SERIF, fontSize: 60, lineHeight: 1.15, color: T.ink, opacity: title, transform: `translateY(${(1 - title) * 14}px)`, whiteSpace: "pre-line" }}>
          {chapter}
        </div>
        {meta && (
          <div style={{ position: "absolute", left: 80, top: 330, fontSize: 22, letterSpacing: 4, color: T.dim, textTransform: "uppercase", opacity: title }}>{meta}</div>
        )}
        <div style={{ position: "absolute", left: 80, right: 80, top: 1520, fontSize: 20, letterSpacing: 4, color: T.dim }}>{story}</div>
        {children}
      </AbsoluteFill>
    </ThemeCtx.Provider>
  );
};

/** Full-canvas SVG layer. All chart children use absolute canvas coordinates. */
export const Layer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
    {children}
  </svg>
);

/** Stroke that draws on (pathLength normalised). */
export const Draw: React.FC<{
  d: string; from?: number; dur?: number; w?: number; color?: string; fill?: string; opacity?: number;
}> = ({ d, from = 0, dur = 30, w = 5, color, fill = "none", opacity = 1 }) => {
  const T = useTheme();
  const p = prog(useCurrentFrame(), from, from + dur);
  return (
    <path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} stroke={color ?? T.ink} strokeWidth={w}
      strokeLinecap="round" strokeLinejoin="round" fill={fill} opacity={p > 0 ? opacity : 0} />
  );
};

const niceTicks = (min: number, max: number, n: number) =>
  Array.from({ length: n }, (_, i) => min + ((max - min) * i) / (n - 1));

const Axes: React.FC<{ box: Box; min: number; max: number; fmt: (n: number) => string; xLabels?: string[]; from: number }> = ({ box, min, max, fmt, xLabels, from }) => {
  const T = useTheme();
  const p = prog(useCurrentFrame(), from, from + 14);
  return (
    <g opacity={p}>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" stroke={T.grid} strokeWidth={2} />
      {niceTicks(min, max, 5).map((v, i) => {
        const y = box.y + box.h - ((v - min) / (max - min)) * box.h;
        return (
          <g key={i}>
            <line x1={box.x} x2={box.x + box.w} y1={y} y2={y} stroke={T.grid} strokeWidth={1} />
            <text x={box.x - 14} y={y + 7} textAnchor="end" fontSize={22} fill={T.dim} fontFamily={SANS}>{fmt(v)}</text>
          </g>
        );
      })}
      {xLabels?.map((l, i) => (
        <text key={i} x={box.x + (box.w * (i + 0.5)) / xLabels.length} y={box.y + box.h + 40} textAnchor="middle" fontSize={22} fill={T.dim} fontFamily={SANS}>{l}</text>
      ))}
    </g>
  );
};

/** Line that draws itself, with axes, end dot and optional badge. */
export const LineChart: React.FC<{
  box?: Box; data: number[]; xLabels?: string[]; from?: number; dur?: number; color?: string;
  badge?: string; fmt?: (n: number) => string; down?: boolean;
}> = ({ box = CHART, data, xLabels, from = 8, dur = 70, color, badge, fmt = (n) => n.toFixed(0), down }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const pad = (hi - lo) * 0.1 || 1;
  const min = lo - pad;
  const max = hi + pad;
  const pts = data.map((v, i) => [box.x + (box.w * i) / (data.length - 1), box.y + box.h - ((v - min) / (max - min)) * box.h]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ");
  const col = color ?? (down ? T.down : T.ink);
  const end = pts[pts.length - 1];
  const done = prog(frame, from + dur, from + dur + 12);
  return (
    <g>
      <Axes box={box} min={min} max={max} fmt={fmt} xLabels={xLabels} from={from - 6} />
      <Draw d={d} from={from} dur={dur} w={6} color={col} />
      <circle cx={end[0]} cy={end[1]} r={12 * done} fill={col} />
      {badge && (
        <g opacity={done} transform={`translate(${end[0] - 150} ${end[1] - 78})`}>
          <rect width={150} height={52} rx={10} fill={T.up} />
          <text x={75} y={36} textAnchor="middle" fontSize={28} fontWeight={800} fill="#fff" fontFamily={SANS}>{badge}</text>
        </g>
      )}
    </g>
  );
};

export type Candle = { o: number; h: number; l: number; c: number; v: number };

/** Candlesticks that grow in one by one, with volume bars. */
export const CandleChart: React.FC<{ box?: Box; candles: Candle[]; from?: number; per?: number; xLabels?: string[] }> = ({ box = CHART, candles, from = 8, per = 3, xLabels }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const lo = Math.min(...candles.map((c) => c.l));
  const hi = Math.max(...candles.map((c) => c.h));
  const pad = (hi - lo) * 0.08;
  const min = lo - pad;
  const max = hi + pad;
  const vmax = Math.max(...candles.map((c) => c.v));
  const slot = box.w / candles.length;
  const y = (v: number) => box.y + box.h * 0.82 - ((v - min) / (max - min)) * box.h * 0.82;
  return (
    <g>
      <Axes box={box} min={min} max={max} fmt={(n) => n.toFixed(0)} xLabels={xLabels} from={from - 6} />
      {candles.map((c, i) => {
        const p = prog(frame, from + i * per, from + i * per + 10);
        const up = c.c >= c.o;
        const col = up ? T.up : T.down;
        const cx = box.x + slot * (i + 0.5);
        const top = y(Math.max(c.o, c.c));
        const bot = y(Math.min(c.o, c.c));
        const vh = (c.v / vmax) * box.h * 0.16 * p;
        return (
          <g key={i} opacity={p > 0 ? 1 : 0}>
            <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={col} strokeWidth={4} strokeLinecap="round" />
            <rect x={cx - slot * 0.3} y={top} width={slot * 0.6} height={Math.max(5, bot - top) * p} fill={col} rx={2} />
            <rect x={cx - slot * 0.3} y={box.y + box.h - vh} width={slot * 0.6} height={vh} fill={col} opacity={0.35} />
          </g>
        );
      })}
    </g>
  );
};

/** Horizontal bars that grow, coloured by sign. Values are percentages. */
export const HBars: React.FC<{ box?: Box; rows: { label: string; value: number }[]; from?: number; per?: number; max?: number }> = ({ box = { x: 80, y: 420, w: 920, h: 760 }, rows, from = 8, per = 10, max }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const m = max ?? Math.max(...rows.map((r) => Math.abs(r.value)));
  const rowH = box.h / rows.length;
  const labelW = 210;
  return (
    <g>
      <line x1={box.x + labelW} x2={box.x + labelW} y1={box.y} y2={box.y + box.h} stroke={T.grid} strokeWidth={2} />
      {rows.map((r, i) => {
        const p = prog(frame, from + i * per, from + i * per + 26);
        const len = (((box.w - labelW - 150) * Math.abs(r.value)) / m) * p;
        const col = r.value >= 0 ? T.up : T.down;
        const y = box.y + i * rowH + rowH * 0.18;
        return (
          <g key={r.label} opacity={p > 0 ? 1 : 0}>
            <text x={box.x + labelW - 20} y={y + rowH * 0.42} textAnchor="end" fontSize={26} letterSpacing={2} fill={T.dim} fontFamily={SANS}>{r.label.toUpperCase()}</text>
            <rect x={box.x + labelW} y={y} width={len} height={rowH * 0.64} fill={col} rx={4} />
            <text x={box.x + labelW + len + 16} y={y + rowH * 0.42} fontSize={30} fontWeight={800} fill={col} fontFamily={SANS} opacity={prog(frame, from + i * per + 18, from + i * per + 30)}>{signed(r.value)}</text>
          </g>
        );
      })}
    </g>
  );
};

/** Donut whose segments sweep around. */
export const Donut: React.FC<{ cx?: number; cy?: number; r?: number; thick?: number; parts: { label: string; value: number; color: string }[]; from?: number; dur?: number }> = ({ cx = 540, cy = 800, r = 230, thick = 100, parts, from = 8, dur = 50 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const p = prog(frame, from, from + dur);
  const total = parts.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <g>
      {parts.map((s) => {
        const start = (acc / total) * 100;
        const len = (s.value / total) * 100;
        acc += s.value;
        const mid = ((start + len / 2) / 100) * Math.PI * 2 - Math.PI / 2;
        const lx = cx + Math.cos(mid) * (r + thick / 2 + 90);
        const ly = cy + Math.sin(mid) * (r + thick / 2 + 70);
        return (
          <g key={s.label}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thick} pathLength={100}
              strokeDasharray={`${len * p} ${100 - len * p}`} strokeDashoffset={-start * p} transform={`rotate(-90 ${cx} ${cy})`} />
            <text x={lx} y={ly} textAnchor="middle" fontSize={28} fontWeight={800} fill={T.ink} fontFamily={SANS} opacity={prog(frame, from + dur - 6, from + dur + 8)}>
              {s.label} {Math.round((s.value / total) * 100)}%
            </text>
          </g>
        );
      })}
    </g>
  );
};

/** Fear/greed style gauge, value 0..100, needle sweeps with a small overshoot. */
export const Gauge: React.FC<{ cx?: number; cy?: number; r?: number; value: number; from?: number; left?: string; right?: string }> = ({ cx = 540, cy = 860, r = 330, value, from = 10, left = "FEAR", right = "GREED" }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - from, fps, config: { damping: 9, stiffness: 70 } });
  const a = (v: number) => (Math.PI * (180 - v * 1.8)) / 180;
  const arc = (v0: number, v1: number) => `M${cx + r * Math.cos(a(v0))},${cy - r * Math.sin(a(v0))} A${r},${r} 0 0 1 ${cx + r * Math.cos(a(v1))},${cy - r * Math.sin(a(v1))}`;
  const seg = [[0, 33, T.down], [33, 66, T.blue], [66, 100, T.up]] as const;
  const show = prog(frame, from - 8, from + 10);
  return (
    <g>
      {seg.map(([v0, v1, c], i) => (
        <Draw key={i} d={arc(v0 + 0.8, v1 - 0.8)} from={from - 8 + i * 6} dur={22} w={44} color={c} />
      ))}
      <text x={cx - r} y={cy + 64} textAnchor="middle" fontSize={30} fontWeight={800} letterSpacing={3} fill={T.down} fontFamily={SANS} opacity={show}>{left}</text>
      <text x={cx + r} y={cy + 64} textAnchor="middle" fontSize={30} fontWeight={800} letterSpacing={3} fill={T.up} fontFamily={SANS} opacity={show}>{right}</text>
      <g transform={`rotate(${sp * value * 1.8} ${cx} ${cy})`} opacity={show}>
        <line x1={cx} y1={cy} x2={cx - r + 50} y2={cy} stroke={T.ink} strokeWidth={10} strokeLinecap="round" />
      </g>
      <circle cx={cx} cy={cy} r={26} fill={T.amber} stroke={T.ink} strokeWidth={6} opacity={show} />
      <text x={cx} y={cy + 230} textAnchor="middle" fontSize={150} fontWeight={800} fill={T.up} fontFamily={SANS} opacity={prog(frame, from + 40, from + 55)}>
        {Math.round(value)}<tspan fontSize={50} fill={T.dim}> /100</tspan>
      </text>
    </g>
  );
};

/** Treemap-style grid of tiles coloured by percentage move. */
export const Heatmap: React.FC<{ box?: Box; tiles: { label: string; value: number }[]; cols?: number; from?: number; per?: number }> = ({ box = { x: 80, y: 400, w: 920, h: 1000 }, tiles, cols = 4, from = 8, per = 3 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const rows = Math.ceil(tiles.length / cols);
  const gap = 12;
  const tw = (box.w - gap * (cols - 1)) / cols;
  const th = (box.h - gap * (rows - 1)) / rows;
  return (
    <g>
      {tiles.map((t, i) => {
        const p = prog(frame, from + i * per, from + i * per + 12);
        const col = mix(T.tile, t.value >= 0 ? T.up : T.down, Math.min(1, Math.abs(t.value) / 5) * 0.85 + 0.1);
        const x = box.x + (i % cols) * (tw + gap);
        const y = box.y + Math.floor(i / cols) * (th + gap);
        return (
          <g key={t.label} opacity={p} transform={`translate(${x + tw / 2} ${y + th / 2}) scale(${0.85 + 0.15 * p}) translate(${-tw / 2} ${-th / 2})`}>
            <rect width={tw} height={th} rx={10} fill={col} />
            <text x={tw / 2} y={th / 2 - 4} textAnchor="middle" fontSize={36} fontWeight={800} fill="#fff" fontFamily={SANS}>{t.label}</text>
            <text x={tw / 2} y={th / 2 + 38} textAnchor="middle" fontSize={28} fontWeight={600} fill="#fff" opacity={0.92} fontFamily={SANS}>{signed(t.value)}</text>
          </g>
        );
      })}
    </g>
  );
};

/** Big ticking number on the terminal surface. */
export const BigNumber: React.FC<{ cy?: number; value: number; decimals?: number; label: string; sub?: string; from?: number; dur?: number; size?: number }> = ({ cy = 900, value, decimals = 1, label, sub, from = 8, dur = 45, size = 230 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const v = value * prog(frame, from, from + dur);
  const col = value >= 0 ? T.up : T.down;
  return (
    <>
      <div style={{ position: "absolute", left: 0, width: W, top: cy - size * 0.95, textAlign: "center", fontSize: 28, letterSpacing: 6, color: T.dim, fontWeight: 600, opacity: prog(frame, 0, 12) }}>{label.toUpperCase()}</div>
      <div style={{ position: "absolute", left: 0, width: W, top: cy - size * 0.62, textAlign: "center", fontSize: size, fontWeight: 800, color: col, fontFamily: SANS, textShadow: `0 0 60px ${col}55`, letterSpacing: -6 }}>
        {signed(v, decimals)}
      </div>
      {sub && <div style={{ position: "absolute", left: 0, width: W, top: cy + size * 0.55, textAlign: "center", fontFamily: HAND, fontSize: 84, color: T.ink, opacity: prog(frame, from + dur, from + dur + 12) }}>{sub}</div>}
    </>
  );
};

/** Hand-written note with a curved arrow pointing at something. */
export const Annotation: React.FC<{ x: number; y: number; text: string; to?: [number, number]; from?: number; rotate?: number; color?: string; size?: number }> = ({ x, y, text, to, from = 40, rotate = -4, color, size = 64 }) => {
  const T = useTheme();
  const p = usePop(from, 12);
  const c = color ?? T.blue;
  let arrow: React.ReactNode = null;
  if (to) {
    const [tx, ty] = to;
    const mx = (x + tx) / 2 + (ty - y) * 0.25;
    const my = (y + ty) / 2 - (tx - x) * 0.25;
    const ang = Math.atan2(ty - my, tx - mx);
    const h = (s: number) => `${tx - Math.cos(ang + s) * 26},${ty - Math.sin(ang + s) * 26}`;
    arrow = (
      <>
        <Draw d={`M${x},${y + 18} Q${mx},${my} ${tx},${ty}`} from={from + 8} dur={16} w={5} color={c} />
        <Draw d={`M${h(0.5)} L${tx},${ty} L${h(-0.5)}`} from={from + 22} dur={8} w={5} color={c} />
      </>
    );
  }
  return (
    <g>
      <text x={x} y={y} fontFamily={HAND} fontWeight={700} fontSize={size} fill={c} opacity={Math.min(1, p * 1.4)} transform={`rotate(${rotate} ${x} ${y}) scale(${0.9 + 0.1 * p})`} style={{ transformOrigin: `${x}px ${y}px` }} textAnchor="middle">{text}</text>
      {arrow}
    </g>
  );
};

export type Tick = { sym: string; chg: number };
/** Scrolling ticker tape. */
export const Ticker: React.FC<{ y: number; items: Tick[]; speed?: number; reverse?: boolean }> = ({ y, items, speed = 3, reverse }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const itemW = 300;
  const total = items.length * itemW;
  const off = ((frame * speed) % total) * (reverse ? -1 : 1);
  const row = [...items, ...items, ...items];
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: W, height: 56, overflow: "hidden", borderTop: `2px solid ${T.grid}`, borderBottom: `2px solid ${T.grid}` }}>
      <div style={{ display: "flex", transform: `translateX(${reverse ? off - total : -off}px)`, whiteSpace: "nowrap" }}>
        {row.map((t, i) => (
          <div key={i} style={{ width: itemW, flex: "none", fontSize: 26, fontWeight: 600, letterSpacing: 2, lineHeight: "56px", color: T.ink, fontFamily: SANS }}>
            {t.sym} <span style={{ color: t.chg >= 0 ? T.up : T.down }}>{t.chg >= 0 ? "▲" : "▼"} {signed(t.chg)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Expanding concentric rings. */
export const Ripples: React.FC<{ cx: number; cy: number; from?: number; count?: number; colors?: string[] }> = ({ cx, cy, from = 0, count = 4, colors }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const cols = colors ?? [T.up, T.blue, T.down, T.amber];
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const r = ((((frame - from) / 90 + i / count) % 1) + 1) % 1;
        return <circle key={i} cx={cx} cy={cy} r={140 + r * 560} fill="none" stroke={cols[i % cols.length]} strokeWidth={4} opacity={(1 - r) * 0.6 * prog(frame, from, from + 10)} />;
      })}
    </g>
  );
};

/** Network of nodes and links (money moving between markets). */
export const Network: React.FC<{ nodes: { id: string; x: number; y: number; label: string }[]; edges: [string, string, number?][]; from?: number }> = ({ nodes, edges, from = 8 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return (
    <g>
      {edges.map(([a, b, chg], i) => {
        const A = byId[a];
        const B = byId[b];
        const p = prog(frame, from + 20 + i * 6, from + 38 + i * 6);
        const t = ((frame - from) / 50 + i * 0.3) % 1;
        const col = chg === undefined ? T.dim : chg >= 0 ? T.up : T.down;
        return (
          <g key={i}>
            <line x1={A.x} y1={A.y} x2={A.x + (B.x - A.x) * p} y2={A.y + (B.y - A.y) * p} stroke={col} strokeWidth={4} opacity={0.8} />
            {p >= 1 && <circle cx={A.x + (B.x - A.x) * t} cy={A.y + (B.y - A.y) * t} r={9} fill={col} />}
          </g>
        );
      })}
      {nodes.map((n, i) => {
        const p = prog(frame, from + i * 4, from + i * 4 + 12);
        return (
          <g key={n.id} opacity={p}>
            <circle cx={n.x} cy={n.y} r={32 * p} fill={T.bg} stroke={T.blue} strokeWidth={5} />
            <text x={n.x} y={n.y + 68} textAnchor="middle" fontSize={22} letterSpacing={2} fill={T.dim} fontFamily={SANS}>{n.label}</text>
          </g>
        );
      })}
    </g>
  );
};

/** Bull-head sign-off mascot (line art, then filled). */
export const BullHead: React.FC<{ cx: number; cy: number; scale?: number; from?: number }> = ({ cx, cy, scale = 1, from = 0 }) => {
  const T = useTheme();
  const frame = useCurrentFrame();
  const fill = prog(frame, from + 30, from + 46);
  return (
    <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
      <Draw d="M-70,-50 C-130,-60 -160,-110 -150,-150 C-120,-120 -90,-110 -60,-100" from={from} dur={26} w={6} />
      <Draw d="M70,-50 C130,-60 160,-110 150,-150 C120,-120 90,-110 60,-100" from={from + 4} dur={26} w={6} />
      <path d="M-80,-70 Q0,-110 80,-70 Q90,40 40,90 Q0,110 -40,90 Q-90,40 -80,-70 Z" fill={T.blue} opacity={fill} stroke={T.ink} strokeWidth={6} />
      <circle cx={-34} cy={-10} r={9} fill="#fff" opacity={fill} />
      <circle cx={34} cy={-10} r={9} fill="#fff" opacity={fill} />
      <ellipse cx={0} cy={62} rx={46} ry={26} fill={T.tile} opacity={fill} stroke={T.ink} strokeWidth={4} />
      <circle cx={-16} cy={62} r={5} fill={T.ink} opacity={fill} />
      <circle cx={16} cy={62} r={5} fill={T.ink} opacity={fill} />
    </g>
  );
};

/** Centered text helper (HTML), for titles and sign-offs. Children may contain <br/> for stacked words. */
export const Title: React.FC<{ children: React.ReactNode; top: number; size?: number; font?: string; delay?: number; color?: string; spacing?: number }> = ({ children, top, size = 230, font, delay = 6, color, spacing = 4 }) => {
  const T = useTheme();
  const p = usePop(delay, 14);
  return (
    <div style={{ position: "absolute", left: 0, width: W, top, textAlign: "center", fontFamily: font ?? TITLE, fontWeight: 900, fontSize: size, lineHeight: 0.95, letterSpacing: spacing, color: color ?? T.ink, opacity: Math.min(1, p * 1.5), transform: `scale(${0.92 + 0.08 * p})` }}>
      {children}
    </div>
  );
};

export const Kicker: React.FC<{ children: React.ReactNode; top: number; delay?: number }> = ({ children, top, delay = 0 }) => {
  const T = useTheme();
  const p = prog(useCurrentFrame(), delay, delay + 12);
  return (
    <div style={{ position: "absolute", left: 0, width: W, top, textAlign: "center", fontSize: 24, letterSpacing: 6, color: T.dim, fontWeight: 600, opacity: p }}>{children}</div>
  );
};
