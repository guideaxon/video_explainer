/**
 * Leader Bot style bundle kit: building blocks for vertical (1080x1920, 9:16, mobile-first) pixel-mosaic business
 * explainers starring a "Leader bot": flat 12x12 pixel avatars on loud primary-colour tiles with visible grid
 * lines, glitch/scramble bursts, hard-shadow stat cards and pixel bar charts. All art is original
 * (placeholder bot, abstract data). See docs/leaderbot_video_style_guide.md.
 *
 * Layout: eyebrow + headline in the top third (y 200 to 560), the visual below (y 620 to 1500).
 * Safe zone: y 160 to 1500, x 60 to 1020.
 */
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadSilk } from "@remotion/google-fonts/Silkscreen";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { VISEME_WIDTH, blinkAt, mouthAt, visemeAt } from "../rig";
import type { RigProps, Viseme } from "../rig";

const silk = loadSilk("normal", { weights: ["400", "700"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });
export const PIX = silk.fontFamily;
export const UI = inter.fontFamily;

export const W = 1080;
export const H = 1920;

export const C = {
  yellow: "#ffd800", red: "#ff2e2e", blue: "#1a4dff", green: "#14b85a", purple: "#7a3cff", pink: "#ff5fa8",
  cyan: "#8be9ff", ink: "#111111", white: "#ffffff", grey: "#b8b8b8", paper: "#f4f1e8", skin: "#f0c4a8",
};
const POOL = [C.yellow, C.red, C.blue, C.green, C.purple, C.pink, C.cyan, C.ink, C.white, C.grey];

export const TONES = {
  ink: { bg: "#111111", ink: "#ffffff", accent: "#ffd800", dim: "#9a9a9a", card: "#1d1d1d", line: "rgba(255,255,255,0.07)" },
  paper: { bg: "#f4f1e8", ink: "#111111", accent: "#ff2e2e", dim: "#6b6b66", card: "#ffffff", line: "rgba(0,0,0,0.06)" },
  yellow: { bg: "#ffd800", ink: "#111111", accent: "#1a4dff", dim: "#5c5200", card: "#ffffff", line: "rgba(0,0,0,0.08)" },
} as const;
export type ToneName = keyof typeof TONES;
export type Tone = (typeof TONES)[ToneName];
const ToneCtx = createContext<Tone>(TONES.ink);
export const useTone = () => useContext(ToneCtx);

const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });
export const usePop = (delay: number, damping = 12) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 140 } });
};
/** Deterministic 0..1 noise for glitch cells (no Math.random: renders must be repeatable). */
const hash = (a: number, b: number, c: number) => (((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0) % 1000 / 1000;

/** Scene surface with a faint pixel grid. */
export const CScene: React.FC<{ tone: ToneName; children?: React.ReactNode }> = ({ tone, children }) => {
  const T = TONES[tone];
  const fade = prog(useCurrentFrame(), 0, 5);
  return (
    <ToneCtx.Provider value={T}>
      <AbsoluteFill style={{ background: T.bg, fontFamily: PIX, opacity: fade, overflow: "hidden" }}>
        <AbsoluteFill style={{ backgroundImage: `linear-gradient(${T.line} 2px, transparent 2px), linear-gradient(90deg, ${T.line} 2px, transparent 2px)`, backgroundSize: "60px 60px" }} />
        {children}
      </AbsoluteFill>
    </ToneCtx.Provider>
  );
};

export const Eyebrow: React.FC<{ children: React.ReactNode; y?: number; from?: number }> = ({ children, y = 200, from = 2 }) => {
  const T = useTone();
  const p = prog(useCurrentFrame(), from, from + 8);
  return <div style={{ position: "absolute", left: 80, top: y, fontSize: 28, fontWeight: 700, letterSpacing: 6, color: T.accent, opacity: p, textTransform: "uppercase" }}>{`> ${children}`}</div>;
};

/** Headline: lines starting with `*` use the accent colour. Each line steps in (stepped, not eased, like a sprite). */
export const Headline: React.FC<{ lines: string[]; y?: number; size?: number; from?: number }> = ({ lines, y = 270, size = 112, from = 4 }) => {
  const T = useTone();
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 80, width: 940, top: y, fontWeight: 700, fontSize: size, lineHeight: 1.12, textTransform: "uppercase" }}>
      {lines.map((line, i) => {
        const accent = line.startsWith("*");
        const shown = frame >= from + i * 6;
        const dx = shown ? Math.round(interpolate(frame, [from + i * 6, from + i * 6 + 6], [-40, 0], clamp) / 10) * 10 : -40;
        return <div key={i} style={{ color: accent ? T.accent : T.ink, opacity: shown ? 1 : 0, transform: `translateX(${dx}px)` }}>{accent ? line.slice(1) : line}</div>;
      })}
    </div>
  );
};

export const Sub: React.FC<{ children: React.ReactNode; y: number; from?: number; size?: number }> = ({ children, y, from = 22, size = 38 }) => {
  const T = useTone();
  const p = prog(useCurrentFrame(), from, from + 10);
  return <div style={{ position: "absolute", left: 80, width: 900, top: y, fontFamily: UI, fontWeight: 400, fontSize: size, color: T.dim, opacity: p }}>{children}</div>;
};

type Look = { bg: string; hair: string; skin: string; suit: string; tie: string; shirt: string };
export const LOOKS: Look[] = [
  { bg: C.green, hair: C.yellow, skin: C.yellow, suit: C.cyan, tie: C.red, shirt: C.white },
  { bg: C.red, hair: C.grey, skin: C.yellow, suit: C.blue, tie: C.cyan, shirt: C.blue },
  { bg: C.pink, hair: C.green, skin: C.white, suit: C.purple, tie: C.grey, shirt: C.grey },
  { bg: C.yellow, hair: C.blue, skin: C.cyan, suit: "#555555", tie: C.yellow, shirt: C.grey },
  { bg: C.ink, hair: C.grey, skin: C.skin, suit: C.white, tie: C.green, shirt: C.white },
  { bg: C.red, hair: C.yellow, skin: C.yellow, suit: C.blue, tie: C.green, shirt: C.cyan },
  { bg: C.green, hair: C.green, skin: C.yellow, suit: C.purple, tie: C.cyan, shirt: C.cyan },
  { bg: C.red, hair: C.grey, skin: C.yellow, suit: C.yellow, tie: C.pink, shirt: C.grey },
  { bg: C.ink, hair: C.red, skin: C.pink, suit: C.cyan, tie: C.red, shirt: C.white },
];
// 12x12 sprite: H hair, S skin, E eyes/mouth (ink), B suit, W shirt, T tie, . tile background.
const SPRITE = [
  "..HHHHHHHH..",
  ".HHHHHHHHHH.",
  ".HSSSSSSSSH.",
  ".HSEESSEESH.",
  ".HSEESSEESH.",
  ".HSSSEESSSH.",
  "..SSEEEESS..",
  "..SEESSEES..",
  "...SSSSSS...",
  "BBBBWTTWBBBB",
  "BBBBBTTBBBBB",
  "BBBBBTTBBBBB",
];

// Mouth frames (sprite rows 6 and 7) per Rhubarb shape; X is the resting face above.
const MOUTH_ROWS: Record<Viseme, [string, string]> = {
  X: [SPRITE[6], SPRITE[7]],
  A: ["..SSEEEESS..", "..SSSSSSSS.."],
  B: ["..SEEEEEES..", "..SSSSSSSS.."],
  C: ["..SEEEEEES..", "..SSEEEESS.."],
  D: ["..SEEEEEES..", "..SEEEEEES.."],
  E: ["..SSEEEESS..", "..SSEEEESS.."],
  F: ["..SSSEESSS..", "..SSSEESSS.."],
  G: ["..SEEEEEES..", "..SSSSSSSS.."],
  H: ["..SEEEEEES..", "..SSEEEESS.."],
};

/**
 * One bot tile. `glitch` 0..1 scrambles that share of cells every 3 frames; `smooth` draws the clean vector
 * version (no grid lines). (x, y) is the top-left corner.
 * Rig: `mouth`/`visemes` (from `scenes/lipsync.ts`) swap the two mouth rows per frame; the eyes blink on the shared
 * rhythm when `blink` is set (off by default so a grid of nine bots stays still).
 */
export const PixelBot: React.FC<{ x: number; y: number; size?: number; look?: number; glitch?: number; smooth?: boolean; from?: number; seed?: number } & Pick<RigProps, "mouth" | "visemes" | "talking" | "blink">> = ({
  x, y, size = 320, look = 0, glitch = 0, smooth = false, from = 0, seed = 0, mouth, visemes, talking, blink = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = usePop(from, 14);
  const L = LOOKS[((look % LOOKS.length) + LOOKS.length) % LOOKS.length];
  const step = Math.floor(frame / 3);
  const rig = { mouth, visemes, talking };
  const shape = visemeAt(rig, frame);
  const open = mouthAt(rig, frame);
  const shut = blink ? blinkAt(frame, fps, seed) : 0;
  const sprite = SPRITE.map((row, r) => (r === 6 || r === 7 ? MOUTH_ROWS[shape][r - 6] : r === 3 && shut > 0.5 ? row.replace(/E/g, "S") : row));
  const colour = (ch: string) => ({ H: L.hair, S: L.skin, E: C.ink, B: L.suit, W: L.shirt, T: L.tie }[ch] ?? L.bg);
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} style={{ position: "absolute", left: x, top: y, transform: `scale(${0.4 + 0.6 * pop})`, opacity: Math.min(1, pop * 2), shapeRendering: "crispEdges" }}>
      {smooth ? (
        <g>
          <rect width={12} height={12} fill={C.ink} />
          <path d="M0 12 V10.2 Q0 9.2 1.2 9.2 H10.8 Q12 9.2 12 10.2 V12 Z" fill={C.white} />
          <path d="M5.2 9.2 L6.8 9.2 L7.2 12 L4.8 12 Z" fill={C.green} />
          <rect x={2.4} y={1.6} width={7.2} height={7} rx={2.2} fill={C.skin} />
          <path d="M2.2 3.6 Q2.4 1 6 1 Q9.6 1 9.8 3.6 Q8.4 2.4 6 2.4 Q3.6 2.4 2.2 3.6 Z" fill={C.grey} />
          <ellipse cx={4.5} cy={4.6} rx={0.5} ry={0.5 * (1 - 0.85 * shut)} fill={C.ink} />
          <ellipse cx={7.5} cy={4.6} rx={0.5} ry={0.5 * (1 - 0.85 * shut)} fill={C.ink} />
          <circle cx={6} cy={5.9} r={0.65} fill="#e0a98c" />
          {shape === "X" ? (
            <path d="M4.4 7 Q6 8.4 7.6 7 Q6 7.7 4.4 7 Z" fill={C.ink} stroke={C.ink} strokeWidth={0.2} />
          ) : (
            <ellipse cx={6} cy={7.3} rx={1.5 * VISEME_WIDTH[shape]} ry={shape === "A" ? 0.12 : 0.2 + 0.75 * open} fill={C.ink} />
          )}
        </g>
      ) : (
        sprite.map((row, r) =>
          row.split("").map((ch, c) => {
            const scramble = glitch > 0 && hash(r + seed, c, step) < glitch;
            const fill = scramble ? POOL[Math.floor(hash(c, r + seed, step + 7) * POOL.length)] : colour(ch);
            return <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill={fill} stroke="rgba(0,0,0,0.35)" strokeWidth={0.04} />;
          }),
        )
      )}
    </svg>
  );
};

/**
 * 3x3 mosaic of bots (the style bundle's signature). The centre tile is the clean vector bot unless `clean` is false.
 * `mouth`/`visemes` make the centre bot talk (and blink).
 */
export const BotGrid: React.FC<{ y: number; cell?: number; glitch?: (frame: number) => number; clean?: boolean; from?: number } & Pick<RigProps, "mouth" | "visemes" | "talking">> = ({ y, cell = 320, glitch, clean = true, from = 0, mouth, visemes, talking }) => {
  const frame = useCurrentFrame();
  const g = glitch ? glitch(frame) : 0;
  const left = (W - cell * 3) / 2;
  return (
    <>
      {Array.from({ length: 9 }, (_, i) => {
        const r = Math.floor(i / 3);
        const c = i % 3;
        const centre = i === 4;
        return <PixelBot key={i} x={left + c * cell} y={y + r * cell} size={cell} look={i} glitch={centre && clean ? 0 : g} smooth={centre && clean} from={from + i * 2} seed={i} {...(centre ? { mouth, visemes, talking, blink: true } : {})} />;
      })}
    </>
  );
};
/** Default glitch curve: bursts of scramble every ~2 s that settle in between. */
export const burst = (frame: number) => {
  const t = frame % 60;
  return t < 12 ? 0.5 : t < 20 ? 0.15 : 0;
};

/** Neo-brutal stat card with hard shadow and a count-up number. */
export const StatCard: React.FC<{ x: number; y: number; w?: number; label: string; value: number; prefix?: string; suffix?: string; color?: string; from?: number; decimals?: number }> = ({
  x, y, w = 920, label, value, prefix = "", suffix = "", color = C.yellow, from = 6, decimals = 0,
}) => {
  const T = useTone();
  const frame = useCurrentFrame();
  const pop = usePop(from);
  const v = interpolate(prog(frame, from + 4, from + 40), [0, 1], [0, value]);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, transform: `scale(${0.8 + 0.2 * pop})`, opacity: Math.min(1, pop * 2), transformOrigin: "left top" }}>
      <div style={{ background: color, border: "6px solid #111", boxShadow: "16px 16px 0 #111", padding: "36px 44px", color: C.ink }}>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 4, textTransform: "uppercase" }}>{label}</div>
        <div style={{ fontSize: 140, fontWeight: 700, lineHeight: 1.15, fontVariantNumeric: "tabular-nums" }}>{`${prefix}${v.toFixed(decimals)}${suffix}`}</div>
      </div>
    </div>
  );
};

/** Bar chart drawn as stacked pixel blocks that grow upward. */
export const PixelBars: React.FC<{ x: number; y: number; w?: number; h?: number; bars: { label: string; value: number; color: string }[]; from?: number; unit?: number }> = ({ x, y, w = 920, h = 760, bars, from = 6, unit = 40 }) => {
  const T = useTone();
  const frame = useCurrentFrame();
  const max = Math.max(1, ...bars.map((b) => b.value)); // 1 keeps an empty or all-zero chart from dividing by 0
  const bw = Math.floor(w / bars.length) - 28;
  const rows = Math.floor((h - 90) / unit);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      {bars.map((b, i) => {
        const n = Math.round((b.value / max) * rows * prog(frame, from + i * 5, from + i * 5 + 28));
        return (
          <div key={i} style={{ position: "absolute", left: i * (bw + 28), bottom: 70, width: bw }}>
            {Array.from({ length: n }, (_, k) => <div key={k} style={{ position: "absolute", bottom: k * unit, left: 0, width: bw, height: unit - 4, background: b.color, border: "3px solid #111" }} />)}
            <div style={{ position: "absolute", bottom: -62, width: bw, textAlign: "center", fontSize: 26, fontWeight: 700, color: T.ink, textTransform: "uppercase" }}>{b.label}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Speech bubble with a typewriter reveal; the tail points down-left at a bot. */
export const Speech: React.FC<{ x: number; y: number; w?: number; children: string; from?: number; color?: string }> = ({ x, y, w = 900, children, from = 8, color = C.white }) => {
  const frame = useCurrentFrame();
  const n = Math.floor(Math.max(0, frame - from) * 1.6);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w }}>
      <div style={{ background: color, border: "6px solid #111", boxShadow: "12px 12px 0 #111", padding: "34px 40px", fontFamily: UI, fontWeight: 600, fontSize: 50, lineHeight: 1.25, color: C.ink, minHeight: 120 }}>{children.slice(0, n)}<span style={{ opacity: frame % 16 < 8 ? 1 : 0 }}>_</span></div>
      <div style={{ marginLeft: 70, width: 0, height: 0, borderLeft: "34px solid transparent", borderRight: "0 solid transparent", borderTop: "44px solid #111" }} />
    </div>
  );
};

/** Rotated approval stamp that slams in. */
export const Stamp: React.FC<{ x: number; y: number; text: string; color?: string; from?: number; rot?: number; size?: number }> = ({ x, y, text, color = C.green, from = 10, rot = -8, size = 64 }) => {
  const pop = usePop(from, 9);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg) scale(${2 - pop})`, opacity: Math.min(1, pop * 3), border: `8px solid ${color}`, color, padding: "10px 26px", fontSize: size, fontWeight: 700, letterSpacing: 4, background: "rgba(255,255,255,0.88)", textTransform: "uppercase" }}>{text}</div>
  );
};

/**
 * Scrolling ticker band (corporate-news bar). Each repeat sits in a fixed-width box so the scroll period equals
 * that width exactly and the loop never jumps, whatever the text.
 */
export const Ticker: React.FC<{ y: number; text: string; color?: string }> = ({ y, text, color = C.yellow }) => {
  const frame = useCurrentFrame();
  const unit = `${text}   ■`;
  const unitW = (unit.length + 4) * 34; // about 0.85 em per Silkscreen char at 40 px, plus a gap
  const copies = Math.ceil(W / unitW) + 2;
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: W, height: 84, background: color, borderTop: "6px solid #111", borderBottom: "6px solid #111", overflow: "hidden", whiteSpace: "nowrap" }}>
      <div style={{ transform: `translateX(${-((frame * 6) % unitW)}px)`, fontSize: 40, fontWeight: 700, lineHeight: "84px", color: C.ink, textTransform: "uppercase" }}>
        {Array.from({ length: copies }, (_, i) => <span key={i} style={{ display: "inline-block", width: unitW }}>{unit}</span>)}
      </div>
    </div>
  );
};

export const SampleTag: React.FC = () => (
  <div style={{ position: "absolute", left: 0, width: W, top: 1530, textAlign: "center", fontFamily: UI, fontSize: 22, letterSpacing: 6, color: "#8a8a8a" }}>SAMPLE CONTENT</div>
);
