/**
 * Launch style bundle kit: building blocks for vertical (1080x1920, 9:16, mobile-first) playful consumer-app
 * launch teasers: a friendly evolving mascot, bold two-line headlines, phone mockups with floating
 * callout chips, widgets, and a store pill. All art is original/abstract (placeholder mascot and UI).
 * See docs/launch_video_style_guide.md.
 *
 * Layout: eyebrow + headline in the top third (y 200 to 560), the visual below (y 620 to 1480).
 * Safe zone: y 160 to 1500, x 60 to 1020.
 */
import React, { createContext, useContext } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadJakarta } from "@remotion/google-fonts/PlusJakartaSans";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const jakarta = loadJakarta("normal", { weights: ["600", "800"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });
export const HEAD = jakarta.fontFamily;
export const UI = inter.fontFamily;

export const W = 1080;
export const H = 1920;

export const TONES = {
  mint: { bg: "#d7f4e4", ink: "#0f1f1a", green: "#1b9c68", dim: "#4f6b60", card: "#ffffff", pill: "#0f1f1a", pillText: "#ffffff", dark: false },
  cloud: { bg: "#f2f4fb", ink: "#0f1f1a", green: "#1b9c68", dim: "#66736d", card: "#ffffff", pill: "#0f1f1a", pillText: "#ffffff", dark: false },
  night: { bg: "#0b1220", ink: "#ffffff", green: "#2fe5a4", dim: "#8fa3a0", card: "#16202e", pill: "#ffffff", pillText: "#0b1220", dark: true },
} as const;
export type ToneName = keyof typeof TONES;
export type Tone = (typeof TONES)[ToneName];
const ToneCtx = createContext<Tone>(TONES.mint);
export const useTone = () => useContext(ToneCtx);

export const C = { lavender: "#e4dcfb", peach: "#ffd9c7", gold: "#ffc94a", coral: "#ff7a59", pink: "#ff9bb5", leaf: "#2fd08a", body1: "#3fcf8c", body2: "#1f9a63", line: "#157a4f" };

const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });
export const usePop = (delay: number, damping = 13) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 120 } });
};

/** Scene surface: mint (sunburst + pastel blobs), cloud (pastel blobs) or night (glows). */
export const LScene: React.FC<{ tone: ToneName; sunburst?: boolean; children?: React.ReactNode }> = ({ tone, sunburst, children }) => {
  const T = TONES[tone];
  const frame = useCurrentFrame();
  const fade = prog(frame, 0, 6);
  return (
    <ToneCtx.Provider value={T}>
      <AbsoluteFill style={{ background: T.bg, fontFamily: HEAD, opacity: fade, overflow: "hidden" }}>
        {tone === "night" ? (
          <>
            <AbsoluteFill style={{ background: "radial-gradient(ellipse at 30% 25%, #1d6b5466 0%, transparent 55%)" }} />
            <AbsoluteFill style={{ background: "radial-gradient(ellipse at 85% 85%, #35307a77 0%, transparent 55%)" }} />
          </>
        ) : (
          <>
            <div style={{ position: "absolute", left: -180, top: -160, width: 520, height: 520, borderRadius: "50%", background: C.lavender, opacity: 0.9 }} />
            <div style={{ position: "absolute", right: -200, bottom: -160, width: 620, height: 620, borderRadius: "50%", background: C.peach, opacity: 0.85 }} />
            <div style={{ position: "absolute", left: 40, bottom: 230, width: 150, height: 150, borderRadius: "50%", background: "#fff2b8", opacity: 0.9, transform: `translateY(${Math.sin(frame / 25) * 8}px)` }} />
          </>
        )}
        {sunburst && (
          <div style={{ position: "absolute", left: W / 2 - 1100, top: 1050 - 1100, width: 2200, height: 2200, borderRadius: "50%", background: "repeating-conic-gradient(rgba(255,255,255,0.55) 0deg 9deg, transparent 9deg 18deg)", WebkitMaskImage: "radial-gradient(circle, black 15%, transparent 62%)", transform: `rotate(${frame * 0.12}deg)` }} />
        )}
        {children}
      </AbsoluteFill>
    </ToneCtx.Provider>
  );
};

/** Tiny letter-spaced label above a headline. */
export const Eyebrow: React.FC<{ children: React.ReactNode; y?: number; from?: number; align?: "left" | "center" }> = ({ children, y = 210, from = 2, align = "left" }) => {
  const T = useTone();
  const p = prog(useCurrentFrame(), from, from + 10);
  return (
    <div style={{ position: "absolute", left: align === "center" ? 0 : 80, width: align === "center" ? W : 920, top: y, textAlign: align, fontSize: 24, fontWeight: 800, letterSpacing: 7, color: T.green, opacity: p, textTransform: "uppercase" }}>{children}</div>
  );
};

/** Two-line headline: lines starting with `*` use the brand green. Words rise from a mask. */
export const Headline: React.FC<{ lines: string[]; y?: number; size?: number; from?: number; align?: "left" | "center" }> = ({ lines, y = 270, size = 124, from = 4, align = "left" }) => {
  const T = useTone();
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: align === "center" ? 0 : 80, width: align === "center" ? W : 940, top: y, textAlign: align, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: -4 }}>
      {lines.map((line, i) => {
        const green = line.startsWith("*");
        const p = prog(frame, from + i * 8, from + i * 8 + 14);
        return (
          <div key={i} style={{ overflow: "hidden", paddingBottom: 10 }}>
            <div style={{ color: green ? T.green : T.ink, transform: `translateY(${(1 - p) * 110}%)`, opacity: p > 0 ? 1 : 0 }}>{green ? line.slice(1) : line}</div>
          </div>
        );
      })}
    </div>
  );
};

export const Sub: React.FC<{ children: React.ReactNode; y: number; from?: number; align?: "left" | "center"; size?: number }> = ({ children, y, from = 24, align = "left", size = 38 }) => {
  const T = useTone();
  const p = prog(useCurrentFrame(), from, from + 12);
  return (
    <div style={{ position: "absolute", left: align === "center" ? 0 : 80, width: align === "center" ? W : 900, top: y, textAlign: align, fontFamily: UI, fontWeight: 400, fontSize: size, color: T.dim, opacity: p, transform: `translateY(${(1 - p) * 16}px)` }}>{children}</div>
  );
};

const STAGE_NAMES = ["Seed", "Sprout", "Budding", "Awakening", "Stirring", "Sturdy", "Strong", "Mighty", "Colossus", "Champion"];
export const stageName = (s: number) => STAGE_NAMES[Math.max(0, Math.min(9, Math.round(s) - 1))];

/** Original placeholder mascot. `stage` 1..10 grows it and adds a flower, arms, abs and a crown. */
export const Mascot: React.FC<{ cx: number; cy: number; scale?: number; stage?: number; from?: number; shadow?: boolean }> = ({ cx, cy, scale = 1.6, stage = 10, from = 0, shadow = true }) => {
  const frame = useCurrentFrame();
  const pop = usePop(from, 11);
  const st = Math.max(1, Math.min(10, stage));
  const s = (0.5 + 0.05 * st) * scale * (0.6 + 0.4 * pop);
  const bob = Math.sin(frame / 14) * 7;
  const blink = frame % 90 > 84 ? 0.1 : 1;
  const r = Math.round(st);
  const sparkle = (x: number, y: number, k: number) => {
    const t = 0.5 + 0.5 * Math.sin(frame / 8 + k * 2);
    return <path key={k} d={`M${x},${y - 16 * t} L${x + 4 * t},${y - 4 * t} L${x + 16 * t},${y} L${x + 4 * t},${y + 4 * t} L${x},${y + 16 * t} L${x - 4 * t},${y + 4 * t} L${x - 16 * t},${y} L${x - 4 * t},${y - 4 * t} Z`} fill={C.gold} opacity={0.9} />;
  };
  return (
    <g transform={`translate(${cx} ${cy})`} opacity={Math.min(1, pop * 2)}>
      {shadow && <ellipse cx={0} cy={140 * s + 16} rx={110 * s} ry={16 * s} fill="rgba(15,31,26,0.18)" />}
      <g transform={`translate(0 ${bob}) scale(${s})`}>
        <defs>
          <linearGradient id="bodyG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={C.body1} />
            <stop offset="100%" stopColor={C.body2} />
          </linearGradient>
        </defs>
        {r >= 3 && (
          <>
            <ellipse cx={-112} cy={30} rx={20 + r} ry={38 + r} fill="url(#bodyG)" stroke={C.line} strokeWidth={6} transform={`rotate(${20 + Math.sin(frame / 10) * 6} -112 30)`} />
            <ellipse cx={112} cy={30} rx={20 + r} ry={38 + r} fill="url(#bodyG)" stroke={C.line} strokeWidth={6} transform={`rotate(${-20 - Math.sin(frame / 10) * 6} 112 30)`} />
          </>
        )}
        <path d="M0,-120 C70,-120 105,-50 105,20 C105,85 60,120 0,120 C-60,120 -105,85 -105,20 C-105,-50 -70,-120 0,-120 Z" fill="url(#bodyG)" stroke={C.line} strokeWidth={6} />
        <path d="M0,-118 C-12,-152 22,-170 46,-162 C34,-136 16,-122 0,-118 Z" fill={C.leaf} stroke={C.line} strokeWidth={5} />
        {r >= 5 && (
          <g transform="translate(-4 -128)">
            {[0, 72, 144, 216, 288].map((a) => (
              <ellipse key={a} cx={0} cy={-15} rx={9} ry={15} fill={C.pink} transform={`rotate(${a})`} />
            ))}
            <circle r={8} fill={C.gold} />
          </g>
        )}
        {r >= 8 && [-26, 0, 26].map((y) => <path key={y} d={`M-34,${50 + y * 0.8} Q0,${58 + y * 0.8} 34,${50 + y * 0.8}`} fill="none" stroke={C.line} strokeWidth={5} strokeLinecap="round" opacity={0.7} />)}
        <g transform={`translate(0 -10) scale(1 ${blink})`}>
          {[-36, 36].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy={0} rx={22} ry={28} fill="#fff" stroke={C.line} strokeWidth={4} />
              <circle cx={x + 3} cy={4} r={11} fill="#10241c" />
              <circle cx={x + 7} cy={-1} r={4} fill="#fff" />
            </g>
          ))}
        </g>
        <circle cx={-62} cy={34} r={13} fill={C.pink} opacity={0.75} />
        <circle cx={62} cy={34} r={13} fill={C.pink} opacity={0.75} />
        <path d="M-14,34 Q0,48 14,34" fill="none" stroke={C.line} strokeWidth={5} strokeLinecap="round" />
        {r >= 10 && (
          <g transform="translate(-4 -150)">
            <path d="M-46,10 L-52,-34 L-24,-8 L0,-44 L24,-8 L52,-34 L46,10 Z" fill={C.gold} stroke="#b8860b" strokeWidth={5} strokeLinejoin="round" />
            <circle cx={0} cy={-4} r={7} fill={C.coral} />
          </g>
        )}
      </g>
      {[[-190 * scale / 1.6, -120, 0], [200 * scale / 1.6, -60, 1], [-160 * scale / 1.6, 110, 2], [170 * scale / 1.6, 130, 3]].map(([x, y, k]) => sparkle(x as number, y as number, k as number))}
    </g>
  );
};

/** Ticking counter with a stage pill and progress bar (e.g. "Workout 438 / Stage 10 · Champion"). */
export const Counter: React.FC<{ label: string; value: number; progress: number; stage: number; y?: number; from?: number; dur?: number }> = ({ label, value, progress, stage, y = 260, from = 6, dur = 150 }) => {
  const T = useTone();
  const frame = useCurrentFrame();
  const p = prog(frame, from, from + dur);
  const eased = interpolate(p, [0, 1], [0, 1]);
  const v = Math.max(1, Math.round(Math.pow(eased, 2.2) * value));
  return (
    <div style={{ position: "absolute", left: 80, top: y, width: 600 }}>
      <div style={{ fontSize: 56, fontWeight: 800, color: T.ink, letterSpacing: -1 }}>{label}</div>
      <div style={{ fontSize: 230, fontWeight: 800, color: T.ink, letterSpacing: -8, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{v}</div>
      <div style={{ display: "inline-block", marginTop: 14, padding: "14px 30px", borderRadius: 40, background: T.pill, color: T.pillText, fontSize: 32, fontWeight: 800 }}>
        Stage {Math.round(stage)} · {stageName(stage)}
      </div>
      <div style={{ marginTop: 26, width: 520, height: 14, borderRadius: 8, background: "rgba(15,31,26,0.12)" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", borderRadius: 8, background: `linear-gradient(90deg, ${C.body1}, ${C.body2})` }} />
      </div>
    </div>
  );
};

/** Phone frame (dynamic-island style notch). Children are the screen. */
export const PhoneFrame: React.FC<{ cx?: number; cy: number; scale?: number; from?: number; tilt?: number; children?: React.ReactNode }> = ({ cx = W / 2, cy, scale = 1, from = 4, tilt = 0, children }) => {
  const frame = useCurrentFrame();
  const p = usePop(from, 15);
  const w = 440;
  const h = 900;
  return (
    <div style={{ position: "absolute", left: cx - (w * scale) / 2, top: cy - (h * scale) / 2 + (1 - p) * 120 + Math.sin(frame / 30) * 6, width: w, height: h, transform: `scale(${scale}) rotate(${tilt}deg)`, transformOrigin: "50% 50%", opacity: Math.min(1, p * 1.5) }}>
      <div style={{ width: w, height: h, borderRadius: 70, background: "#0f1115", padding: 12, boxShadow: "0 40px 90px rgba(15,31,26,0.35)" }}>
        <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 60, background: "#fff", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: "50%", top: 16, width: 120, height: 34, marginLeft: -60, borderRadius: 18, background: "#0f1115", zIndex: 2 }} />
          {children}
        </div>
      </div>
    </div>
  );
};

/** Abstract app screen: header card, mascot badge and skeleton rows. No real app content. */
export const ScreenMock: React.FC<{ accent?: string; rows?: number; from?: number; dim?: boolean }> = ({ accent = C.body1, rows = 5, from = 10, dim }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ padding: "76px 26px 26px", background: dim ? "#cfd3d6" : "#fff", height: "100%", boxSizing: "border-box" }}>
      <div style={{ height: 150, borderRadius: 26, background: `linear-gradient(135deg, ${accent}, #8be3c0)`, position: "relative", overflow: "hidden" }}>
        <svg width={120} height={120} viewBox="-130 -170 260 340" style={{ position: "absolute", right: 14, bottom: -6 }}>
          <Mascot cx={0} cy={0} scale={0.5} stage={6} shadow={false} from={from} />
        </svg>
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ marginTop: 18, height: 74, borderRadius: 20, background: "#f1f4f3", display: "flex", alignItems: "center", gap: 16, padding: "0 18px", opacity: prog(frame, from + i * 5, from + i * 5 + 10) }}>
          <div style={{ width: 40, height: 40, borderRadius: 20, background: i % 2 ? "#ffe7a8" : "#c8f0dc" }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 12, width: `${60 + (i % 3) * 14}%`, borderRadius: 6, background: "#cbd5d1" }} />
            <div style={{ height: 10, width: "40%", borderRadius: 5, background: "#e0e6e3", marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
};

/** Floating callout card next to a phone: icon dot, title and sub line. */
export const Chip: React.FC<{ x: number; y: number; title: string; sub?: string; color?: string; from?: number }> = ({ x, y, title, sub, color = C.gold, from = 24 }) => {
  const T = useTone();
  const frame = useCurrentFrame();
  const p = usePop(from, 12);
  return (
    <div style={{ position: "absolute", left: x, top: y + Math.sin((frame + x) / 22) * 8, display: "flex", alignItems: "center", gap: 18, padding: "18px 28px 18px 20px", borderRadius: 26, background: T.card, boxShadow: "0 18px 50px rgba(15,31,26,0.22)", transform: `scale(${0.6 + 0.4 * p})`, opacity: Math.min(1, p * 1.5), fontFamily: HEAD }}>
      <div style={{ width: 54, height: 54, borderRadius: 27, background: color }} />
      <div>
        <div style={{ fontSize: 34, fontWeight: 800, color: T.ink, lineHeight: 1.1 }}>{title}</div>
        {sub && <div style={{ fontSize: 22, color: T.dim, fontFamily: UI }}>{sub}</div>}
      </div>
    </div>
  );
};

/** Home-screen style widget card with abstract content. */
export const WidgetCard: React.FC<{ x: number; y: number; w: number; h: number; title?: string; from?: number; accent?: string }> = ({ x, y, w, h, title, from = 8, accent = C.body1 }) => {
  const T = useTone();
  const p = usePop(from, 14);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 36, background: T.dark ? "linear-gradient(160deg,#1f3b3a,#16202e)" : "linear-gradient(160deg,#eafaf2,#fff)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", padding: 28, boxSizing: "border-box", transform: `scale(${0.8 + 0.2 * p}) translateY(${(1 - p) * 40}px)`, opacity: Math.min(1, p * 1.5) }}>
      {title && <div style={{ fontSize: 28, fontWeight: 800, color: T.dark ? "#fff" : "#0f1f1a", marginBottom: 14 }}>{title}</div>}
      <div style={{ height: 14, width: "70%", borderRadius: 7, background: accent, opacity: 0.9 }} />
      <div style={{ height: 12, width: "90%", borderRadius: 6, background: "rgba(255,255,255,0.25)", marginTop: 14 }} />
      <div style={{ height: 12, width: "55%", borderRadius: 6, background: "rgba(255,255,255,0.18)", marginTop: 12 }} />
    </div>
  );
};

/** Live-activity style pill: ring icon, label, ticking time and a progress bar. */
export const LivePill: React.FC<{ x: number; y: number; w: number; label: string; time: string; right: string; from?: number }> = ({ x, y, w, label, time, right, from = 40 }) => {
  const T = useTone();
  const frame = useCurrentFrame();
  const p = usePop(from, 14);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 190, borderRadius: 60, background: "#fff", padding: "30px 40px", boxSizing: "border-box", transform: `scale(${0.7 + 0.3 * p})`, opacity: Math.min(1, p * 1.5), boxShadow: "0 24px 70px rgba(0,0,0,0.4)", fontFamily: HEAD }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 70, height: 70, borderRadius: 35, border: `8px solid ${C.body1}`, boxSizing: "border-box" }} />
          <div>
            <div style={{ fontSize: 28, color: T.green, fontWeight: 800 }}>{label}</div>
            <div style={{ fontSize: 64, color: "#0f1f1a", fontWeight: 800, lineHeight: 1 }}>{time}</div>
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 30, color: "#0f1f1a", fontWeight: 800 }}>{right}</div>
      </div>
      <div style={{ marginTop: 14, height: 12, borderRadius: 6, background: "#e3ece8" }}>
        <div style={{ width: `${30 + 40 * prog(frame, from, from + 90)}%`, height: "100%", borderRadius: 6, background: C.body1 }} />
      </div>
    </div>
  );
};

/** Big wordmark with a green tagline. Pass your own name. */
export const Wordmark: React.FC<{ name: string; tagline?: string; y: number; from?: number; size?: number }> = ({ name, tagline, y, from = 12, size = 170 }) => {
  const T = useTone();
  const frame = useCurrentFrame();
  const p = prog(frame, from, from + 16);
  const q = prog(frame, from + 12, from + 26);
  return (
    <>
      <div style={{ position: "absolute", left: 0, width: W, top: y, textAlign: "center", fontSize: size, fontWeight: 800, letterSpacing: -7, color: T.ink, opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${0.94 + 0.06 * p})` }}>{name}</div>
      {tagline && <div style={{ position: "absolute", left: 0, width: W, top: y + size * 1.28, textAlign: "center", fontSize: 54, fontWeight: 800, letterSpacing: -2, color: T.green, opacity: q }}>{tagline}</div>}
    </>
  );
};

/** Dark rounded store pill ("Coming soon to the App Store"). Generic glyph, no store logos. */
export const StorePill: React.FC<{ y: number; label: string; note?: string; from?: number }> = ({ y, label, note, from = 30 }) => {
  const T = useTone();
  const p = usePop(from, 13);
  return (
    <>
      <div style={{ position: "absolute", left: 90, width: 900, top: y, height: 130, borderRadius: 65, background: "#0f1115", display: "flex", alignItems: "center", justifyContent: "center", gap: 22, color: "#fff", fontSize: 44, fontWeight: 800, transform: `scale(${0.85 + 0.15 * p})`, opacity: Math.min(1, p * 1.5), boxShadow: "0 20px 60px rgba(15,31,26,0.3)" }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, background: "#fff" }} />
        {label}
      </div>
      {note && <div style={{ position: "absolute", left: 0, width: W, top: y + 160, textAlign: "center", fontFamily: UI, fontSize: 34, color: T.dim, opacity: prog(useCurrentFrame(), from + 12, from + 24) }}>{note}</div>}
    </>
  );
};

/** Concentric rings behind a hero element. */
export const Rings: React.FC<{ cx: number; cy: number; color?: string; from?: number }> = ({ cx, cy, color = "#2fe5a4", from = 0 }) => {
  const frame = useCurrentFrame();
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {[0, 1, 2].map((i) => {
        const t = ((((frame - from) / 90 + i / 3) % 1) + 1) % 1;
        return <circle key={i} cx={cx} cy={cy} r={160 + t * 460} fill="none" stroke={color} strokeWidth={3} opacity={(1 - t) * 0.5 * prog(frame, from, from + 10)} />;
      })}
    </svg>
  );
};

/** Small tag for template scenes with placeholder claims. Remove for real content. */
export const SampleTag: React.FC = () => (
  <div style={{ position: "absolute", left: 0, width: W, top: 1530, textAlign: "center", fontFamily: UI, fontSize: 22, letterSpacing: 6, color: "#8a9a94" }}>SAMPLE CONTENT</div>
);

/** SVG wrapper for the Mascot (absolute canvas coordinates). */
export const Art: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>{children}</svg>
);

/** Feature scene: eyebrow, two-line headline, sub line, phone with abstract screen and two floating chips. */
export const Feature: React.FC<{
  eyebrow: string;
  lines: string[];
  sub: string;
  chips: { title: string; sub?: string; color?: string; x: number; y: number }[];
  dimScreen?: boolean;
}> = ({ eyebrow, lines, sub, chips, dimScreen }) => (
  <LScene tone="cloud">
    <Eyebrow>{eyebrow}</Eyebrow>
    <Headline lines={lines} size={116} />
    <Sub y={560}>{sub}</Sub>
    <PhoneFrame cy={1085} scale={0.95} from={10}>
      <ScreenMock dim={dimScreen} from={22} />
    </PhoneFrame>
    {chips.map((c, i) => (
      <Chip key={c.title} x={c.x} y={c.y} title={c.title} sub={c.sub} color={c.color} from={34 + i * 12} />
    ))}
  </LScene>
);
