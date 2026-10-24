/**
 * Pop-art style bundle kit: building blocks for vertical (1080x1920, 9:16, mobile-first) comic pop-art videos.
 * The screen is a comic page: paper with gutters, ink-framed panels that wipe in and push in, Ben-Day dots,
 * flat process colours printed slightly off register, starburst "POW!" captions, speed and motion lines, speech
 * balloons and thought clouds, yellow caption boxes, and the original hero "Dot Dash" (./hero.tsx).
 * Everything is drawn in code and deterministic (seeded hash, no Math.random, no image files).
 * See docs/popart_video_style_guide.md.
 *
 * Layout: the page fills the screen (panels inside x 40..1040, y 120..1800, 24 px gutters); every word of text sits
 * inside the safe zone y 160..1500, x 60..1020. Art (legs, backgrounds) may run below 1500.
 * Render cost: dots are CSS gradients or small SVG <pattern> tiles defined once per page (HalftoneDefs); no blur or
 * turbulence filters anywhere.
 */
import React, { createContext, useContext, useMemo } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadBangers } from "@remotion/google-fonts/Bangers";
import { loadFont as loadComicNeue } from "@remotion/google-fonts/ComicNeue";
import { C, MISREG, burstPath, cloudPath, countUp, dotsRamp, focusLines, h01, inkFrame, motionLines } from "./ink";
import type { ColorName } from "./ink";

export { Hero, HERO_GESTURES, HERO_MOUTHS } from "./hero";
export type { HeroGesture, HeroLook, HeroMood } from "./hero";
export { C, MISREG } from "./ink";
export type { ColorName } from "./ink";

const bangers = loadBangers("normal", { weights: ["400"], subsets: ["latin"] });
const comic = loadComicNeue("normal", { weights: ["700"], subsets: ["latin"] });
/** Display face for headlines, sound effects and numbers. */
export const DISPLAY = bangers.fontFamily;
/** Lettering face for balloons and caption boxes (always upper case). */
export const LETTER = comic.fontFamily;

export const W = 1080;
export const H = 1920;
/** Page frame: panels live inside this box, separated by GUTTER. */
export const PAGE = { left: 40, right: 1040, top: 120, bottom: 1800, gutter: 24 } as const;

export const TONES = {
  paper: { bg: C.paper, dot: "rgba(0,168,232,0.10)", ink: C.ink },
  yellow: { bg: C.yellow, dot: "rgba(229,0,125,0.12)", ink: C.ink },
  cyan: { bg: C.cyan, dot: "rgba(18,18,18,0.10)", ink: C.ink },
  magenta: { bg: C.magenta, dot: "rgba(255,225,0,0.18)", ink: C.ink },
  ink: { bg: C.ink, dot: "rgba(255,255,255,0.08)", ink: C.white },
} as const;
export type ToneName = keyof typeof TONES;
const ToneCtx = createContext<(typeof TONES)[ToneName]>(TONES.paper);
export const useTone = () => useContext(ToneCtx);

const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });
export const usePop = (delay: number, damping = 11) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 160 } });
};

const DOT_SIZES = { s: 10, m: 18, l: 30 } as const;
export type DotSize = keyof typeof DOT_SIZES;

/** CSS Ben-Day dots (two staggered radial-gradient layers): the cheapest halftone there is. */
export const dotsCss = (color: string, size: DotSize = "m", bg = "transparent", r = 0.3): React.CSSProperties => {
  const cell = DOT_SIZES[size];
  const pct = Math.round(r * 100);
  const dot = `radial-gradient(circle, ${color} ${pct}%, transparent ${pct + 2}%)`;
  return { backgroundColor: bg, backgroundImage: `${dot}, ${dot}`, backgroundSize: `${cell}px ${cell}px`, backgroundPosition: `0 0, ${cell / 2}px ${cell / 2}px` };
};

/** SVG id of a page-wide dot pattern: fill={dots("magenta", "s")}. Defined once per page by <HalftoneDefs/>. */
export const dots = (color: ColorName, size: DotSize = "s") => `url(#pa-${color}-${size})`;
const PATTERN_COLORS: ColorName[] = ["cyan", "magenta", "yellow", "red", "blue", "ink", "white"];

/** Every page-wide dot pattern (7 colours x 3 sizes), in a zero-size SVG. Page renders it; render it yourself only outside a Page. */
export const HalftoneDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
    <defs>
      {PATTERN_COLORS.flatMap((c) =>
        (Object.keys(DOT_SIZES) as DotSize[]).map((s) => {
          const k = DOT_SIZES[s];
          return (
            <pattern key={`${c}-${s}`} id={`pa-${c}-${s}`} width={k} height={k} patternUnits="userSpaceOnUse">
              <circle cx={k / 4} cy={k / 4} r={k * 0.21} fill={C[c]} />
              <circle cx={(k * 3) / 4} cy={(k * 3) / 4} r={k * 0.21} fill={C[c]} />
            </pattern>
          );
        }),
      )}
    </defs>
  </svg>
);

/** The comic page: a tone, a faint printed dot texture, the dot patterns. Put Panels inside. */
export const Page: React.FC<{ tone?: ToneName; children?: React.ReactNode }> = ({ tone = "paper", children }) => {
  const T = TONES[tone];
  return (
    <ToneCtx.Provider value={T}>
      <AbsoluteFill style={{ background: T.bg, overflow: "hidden", fontFamily: LETTER }}>
        <AbsoluteFill style={dotsCss(T.dot, "s")} />
        <HalftoneDefs />
        {children}
      </AbsoluteFill>
    </ToneCtx.Provider>
  );
};

export type Push = { at: number; to: number; x?: number; y?: number; dur?: number };
/**
 * One comic panel at page coordinates (x, y, w, h): an ink frame of varying weight around a clipped box.
 * Children use panel-local px. `wipe` reveals it from a side over 7 frames at `from` (a cut between panels);
 * `push` is the camera pushing into the panel (scale 1 to `to` about the point x, y as 0..1 fractions).
 * `dots` lays Ben-Day dots over `bg`.
 */
export const Panel: React.FC<{
  x: number; y: number; w: number; h: number; bg?: string; dots?: { color: string; size?: DotSize; r?: number };
  from?: number; wipe?: "left" | "right" | "up" | "down" | "none"; push?: Push; weight?: number; seed?: number; tilt?: number; children?: React.ReactNode;
}> = ({ x, y, w, h, bg = C.white, dots: d, from = 0, wipe = "left", push, weight = 11, seed = 0, tilt = 0, children }) => {
  const frame = useCurrentFrame();
  const p = wipe === "none" ? (frame >= from ? 1 : 0) : prog(frame, from, from + 7);
  const hide = `${((1 - p) * 100).toFixed(2)}%`;
  const clip = wipe === "left" ? `inset(0 ${hide} 0 0)` : wipe === "right" ? `inset(0 0 0 ${hide})` : wipe === "up" ? `inset(${hide} 0 0 0)` : wipe === "down" ? `inset(0 0 ${hide} 0)` : "none";
  const z = push ? interpolate(frame, [push.at, push.at + (push.dur ?? 45)], [1, push.to], { ...clamp, easing: Easing.inOut(Easing.cubic) }) : 1;
  const frameD = useMemo(() => inkFrame(w, h, weight, seed), [w, h, weight, seed]);
  if (p <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, clipPath: clip, transform: tilt ? `rotate(${tilt}deg)` : undefined }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, transform: `scale(${z.toFixed(4)})`, transformOrigin: `${(push?.x ?? 0.5) * 100}% ${(push?.y ?? 0.5) * 100}%`, background: bg }}>
          {d && <div style={{ position: "absolute", inset: 0, ...dotsCss(d.color, d.size ?? "m", "transparent", d.r ?? 0.3) }} />}
          {children}
        </div>
      </div>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }}>
        <path d={frameD} fill={C.ink} fillRule="evenodd" />
      </svg>
    </div>
  );
};

/** Halftone ramp (dot size grows toward one side), e.g. a sky fading into dots. Static: computed once. */
export const Ramp: React.FC<{ w: number; h: number; color?: string; step?: number; dir?: "up" | "down" | "left" | "right"; x?: number; y?: number; opacity?: number }> = ({ w, h, color = C.magenta, step = 28, dir = "up", x = 0, y = 0, opacity = 1 }) => {
  const list = useMemo(() => dotsRamp(w, h, step, dir), [w, h, step, dir]);
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: x, top: y, opacity }}>
      {list.map((c, i) => <circle key={i} cx={c.x} cy={c.y} r={c.r} fill={color} />)}
    </svg>
  );
};

/** Radial speed (focus) lines aimed at (cx, cy) in the parent's px; they flicker every 3 frames. */
export const SpeedLines: React.FC<{ cx: number; cy: number; w: number; h: number; rIn?: number; color?: string; count?: number; seed?: number; from?: number }> = ({ cx, cy, w, h, rIn = 300, color = C.ink, count = 56, seed = 0, from = 0 }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, from, from + 6);
  const phase = Math.floor(Math.max(0, frame) / 3);
  const rOut = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) + 40;
  const d = useMemo(() => focusLines(cx, cy, rIn, rOut, count, seed, phase), [cx, cy, rIn, rOut, count, seed, phase]);
  if (p <= 0) return null;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, opacity: p }}>
      <path d={d} fill={color} />
    </svg>
  );
};

/** Motion lines trailing a moving thing: (x, y) is the trailing edge's top; `dir` 1 means it moves right. */
export const MotionLines: React.FC<{ x: number; y: number; len?: number; h?: number; count?: number; dir?: 1 | -1; color?: string; seed?: number; from?: number; to?: number }> = ({ x, y, len = 220, h = 160, count = 6, dir = 1, color = C.ink, seed = 0, from = 0, to = 100000 }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const d = motionLines(x, y, len, h, count, seed + Math.floor(frame / 4), dir);
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
      <path d={d} fill={color} />
    </svg>
  );
};

/** Outlined display text (SVG): fill printed off register from its ink outline, optional hard drop shadow. */
const InkText: React.FC<{ x: number; y: number; size: number; fill: string; children: string; stroke?: number; shadow?: number; anchor?: "start" | "middle" | "end"; spacing?: number }> = ({ x, y, size, fill, children, stroke, shadow = 0, anchor = "middle", spacing = 2 }) => {
  const sw = stroke ?? Math.max(6, size * 0.09);
  const common = { x, y, fontFamily: DISPLAY, fontSize: size, textAnchor: anchor, dominantBaseline: "central" as const, letterSpacing: spacing };
  return (
    <g>
      {shadow > 0 && <text {...common} dx={shadow} dy={shadow} fill={C.ink} stroke={C.ink} strokeWidth={sw * 2} strokeLinejoin="round">{children}</text>}
      <text {...common} fill={C.ink} stroke={C.ink} strokeWidth={sw * 2} strokeLinejoin="round">{children}</text>
      <text {...common} dx={MISREG[0]} dy={MISREG[1]} fill={fill}>{children}</text>
    </g>
  );
};

/**
 * Starburst caption ("POW!", "WOW!"): a red outer burst behind a yellow inner burst, both inked and printed off
 * register, with the word slammed on top. Pops in with overshoot and shakes for 10 frames. (x, y) is the centre.
 */
export const Starburst: React.FC<{ x: number; y: number; r?: number; text: string; size?: number; from?: number; rot?: number; seed?: number; outer?: string; inner?: string; textColor?: string; wide?: number }> = ({
  x, y, r = 300, text, size, from = 6, rot = -8, seed = 1, outer = C.red, inner = C.yellow, textColor = C.white, wide = 1.15,
}) => {
  const frame = useCurrentFrame();
  const pop = usePop(from, 8);
  if (frame < from) return null;
  const k = frame - from;
  const shake = k > 4 && k < 14 ? (h01(seed, k) - 0.5) * 14 : 0;
  const fs = size ?? Math.min(r * 0.62, (r * 2 * wide * 0.78) / Math.max(2, text.length * 0.55));
  const sc = 0.2 + 0.8 * pop;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
      <g transform={`translate(${(x + shake).toFixed(1)} ${(y - shake * 0.6).toFixed(1)}) rotate(${(rot - 18 * (1 - pop)).toFixed(2)}) scale(${sc.toFixed(4)})`}>
        <path d={burstPath(0, 0, r, 16, 0.7, seed, wide)} fill={C.ink} transform="translate(12 14)" />
        <path d={burstPath(0, 0, r, 16, 0.7, seed, wide)} fill={outer} transform={`translate(${MISREG[0]} ${MISREG[1]})`} />
        <path d={burstPath(0, 0, r, 16, 0.7, seed, wide)} fill="none" stroke={C.ink} strokeWidth={9} strokeLinejoin="round" />
        <path d={burstPath(0, 0, r * 0.74, 13, 0.74, seed + 5, wide)} fill={inner} transform={`translate(${MISREG[0]} ${MISREG[1]})`} />
        <path d={burstPath(0, 0, r * 0.74, 13, 0.74, seed + 5, wide)} fill={dots("magenta", "s")} opacity={0.55} />
        <path d={burstPath(0, 0, r * 0.74, 13, 0.74, seed + 5, wide)} fill="none" stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
        <g transform="skewX(-8)"><InkText x={0} y={4} size={fs} fill={textColor} shadow={8}>{text}</InkText></g>
      </g>
    </svg>
  );
};

/** Free-floating sound effect lettering ("PING!", "TAP TAP"): outlined, tilted, pops in. (x, y) is its centre. */
export const Sfx: React.FC<{ x: number; y: number; text: string; size?: number; color?: string; rot?: number; from?: number }> = ({ x, y, text, size = 120, color = C.yellow, rot = -10, from = 8 }) => {
  const frame = useCurrentFrame();
  const pop = usePop(from, 9);
  if (frame < from) return null;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${(0.3 + 0.7 * pop).toFixed(4)}) skewX(-6)`}>
        <InkText x={0} y={0} size={size} fill={color} shadow={7}>{text}</InkText>
      </g>
    </svg>
  );
};

/** Yellow caption box (the narrator's voice): ink border, upper-case lettering, wipes in from the left. */
export const Caption: React.FC<{ x: number; y: number; w?: number; children: React.ReactNode; size?: number; from?: number; color?: string; rot?: number }> = ({ x, y, w, children, size = 40, from = 4, color = C.yellow, rot = 0 }) => {
  const frame = useCurrentFrame();
  const p = prog(frame, from, from + 8);
  if (p <= 0) return null;
  const pad = "16px 26px 14px";
  const text: React.CSSProperties = { fontFamily: LETTER, fontWeight: 700, fontSize: size, lineHeight: 1.15, textTransform: "uppercase", letterSpacing: 1, padding: pad };
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, maxWidth: 1020 - x, transform: `rotate(${rot}deg)`, clipPath: `inset(-20px ${((1 - p) * 100).toFixed(1)}% -20px -20px)` }}>
      <div style={{ position: "absolute", inset: 0, background: color, transform: `translate(${MISREG[0]}px, ${MISREG[1]}px)` }} />
      <div style={{ position: "relative", border: `5px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, color: C.ink, ...text }}>{children}</div>
    </div>
  );
};

/**
 * Speech balloon (`speech`), thought cloud (`thought`) or jagged shout (`shout`) with lettered text. The body is the
 * box (x, y, w, h) in the parent's px; `tail` is where the tail points (the speaker's mouth or head). Pops from the tail.
 */
export const Balloon: React.FC<{ x: number; y: number; w: number; h: number; tail: [number, number]; kind?: "speech" | "thought" | "shout"; children: React.ReactNode; size?: number; from?: number; seed?: number }> = ({
  x, y, w, h, tail, kind = "speech", children, size = 46, from = 8, seed = 3,
}) => {
  const frame = useCurrentFrame();
  const pop = usePop(from, 10);
  if (frame < from) return null;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const a = Math.atan2(tail[1] - cy, tail[0] - cx);
  const on = (ang: number): [number, number] => [cx + Math.cos(ang) * rx * 0.92, cy + Math.sin(ang) * ry * 0.92];
  const [b1, b2] = [on(a - 0.2), on(a + 0.2)];
  const bend = 0.18;
  const mid = (p: [number, number]): [number, number] => [(p[0] + tail[0]) / 2 + (tail[1] - p[1]) * bend * 0.3, (p[1] + tail[1]) / 2 - (tail[0] - p[0]) * bend * 0.3];
  const tailD = `M${b1[0].toFixed(1)},${b1[1].toFixed(1)} Q${mid(b1)[0].toFixed(1)},${mid(b1)[1].toFixed(1)} ${tail[0]},${tail[1]} Q${mid(b2)[0].toFixed(1)},${mid(b2)[1].toFixed(1)} ${b2[0].toFixed(1)},${b2[1].toFixed(1)} Z`;
  const ellipse = `M${cx - rx},${cy} A${rx},${ry} 0 1 1 ${cx + rx},${cy} A${rx},${ry} 0 1 1 ${cx - rx},${cy} Z`;
  const body = kind === "thought" ? cloudPath(cx, cy, rx * 0.86, ry * 0.8, 12, seed) : kind === "shout" ? burstPath(cx, cy, ry * 1.12, 22, 0.86, seed, rx / ry) : ellipse;
  const bubbles = kind === "thought" ? [0.62, 0.8, 0.94].map((t, i) => ({ x: cx + (tail[0] - cx) * t, y: cy + (tail[1] - cy) * t, r: 26 - i * 8 })) : [];
  const parts = (
    <>
      <path d={body} />
      {kind !== "thought" && <path d={tailD} />}
      {bubbles.map((b, i) => <circle key={i} cx={b.x} cy={b.y} r={b.r} />)}
    </>
  );
  return (
    <div style={{ position: "absolute", inset: 0, transform: `scale(${(0.3 + 0.7 * pop).toFixed(4)})`, transformOrigin: `${tail[0]}px ${tail[1]}px`, opacity: Math.min(1, pop * 3) }}>
      <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
        <g fill={C.ink} stroke={C.ink} strokeWidth={14} strokeLinejoin="round" transform="translate(6 7)">{parts}</g>
        <g fill={C.ink} stroke={C.ink} strokeWidth={14} strokeLinejoin="round">{parts}</g>
        <g fill={kind === "shout" ? C.yellow : C.white} stroke="none">{parts}</g>
      </svg>
      <div style={{ position: "absolute", left: x + w * 0.14, top: y + h * 0.12, width: w * 0.72, height: h * 0.76, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", fontFamily: LETTER, fontWeight: 700, fontSize: size, lineHeight: 1.12, textTransform: "uppercase", color: C.ink }}>
        {children}
      </div>
    </div>
  );
};

/**
 * Big display lines in Bangers with a fat ink outline, a hard ink drop shadow and the fill printed off register.
 * Lines starting with `*` use `accent`. Each line slams in (scale 1.4 to 1) 5 frames after the last.
 */
export const Headline: React.FC<{ lines: string[]; x?: number; y: number; size?: number; from?: number; color?: string; accent?: string; align?: "left" | "center"; rot?: number }> = ({
  lines, x = 70, y, size = 130, from = 4, color = C.white, accent = C.yellow, align = "left", rot = -3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stroke = Math.round(size * 0.12);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: 1010 - x, transform: `rotate(${rot}deg)`, transformOrigin: "left top", textAlign: align }}>
      {lines.map((raw, i) => {
        const t = spring({ frame: frame - from - i * 5, fps, config: { damping: 12, stiffness: 180 } });
        if (frame < from + i * 5) return <div key={i} style={{ height: size * 1.02 }} />;
        const line = raw.startsWith("*") ? raw.slice(1) : raw;
        const fill = raw.startsWith("*") ? accent : color;
        const base: React.CSSProperties = { position: "absolute", left: 0, right: 0, top: 0, fontFamily: DISPLAY, fontSize: size, lineHeight: 1.02, letterSpacing: 3, whiteSpace: "nowrap" };
        return (
          <div key={i} style={{ position: "relative", height: size * 1.02, transform: `scale(${(1.4 - 0.4 * t).toFixed(4)})`, transformOrigin: align === "center" ? "50% 50%" : "0% 50%", opacity: Math.min(1, t * 3) }}>
            <div style={{ ...base, color: C.ink, WebkitTextStroke: `${stroke * 2}px ${C.ink}`, transform: "translate(9px, 10px)" }}>{line}</div>
            <div style={{ ...base, color: C.ink, WebkitTextStroke: `${stroke * 2}px ${C.ink}` }}>{line}</div>
            <div style={{ ...base, color: fill, transform: `translate(${MISREG[0]}px, ${MISREG[1]}px)` }}>{line}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Cover masthead: the title in huge Bangers with a red 3D extrusion, an issue box and a cover line. */
export const Masthead: React.FC<{ title: string; issue?: string; line?: string; y?: number; size?: number; from?: number }> = ({ title, issue = "No. 1", line, y = 170, size = 230, from = 2 }) => {
  const frame = useCurrentFrame();
  const pop = usePop(from, 12);
  const extrude = Array.from({ length: 12 }, (_, i) => `${i + 1}px ${i + 1}px 0 ${C.red}`).join(", ");
  return (
    <div style={{ position: "absolute", left: 0, top: y, width: W, height: size * 1.3, opacity: Math.min(1, pop * 2) }}>
      <div style={{ position: "absolute", left: 70, top: 6, width: 150, height: 150, background: C.white, border: `6px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontFamily: DISPLAY, color: C.ink, transform: "rotate(-4deg)" }}>
        <div style={{ fontSize: 34, letterSpacing: 2 }}>ISSUE</div>
        <div style={{ fontSize: 58, lineHeight: 1 }}>{issue}</div>
      </div>
      <div style={{ position: "absolute", left: 220, right: 60, top: 0, textAlign: "center", transform: `scale(${(0.6 + 0.4 * pop).toFixed(4)}) rotate(-4deg) skewX(-6deg)`, transformOrigin: "50% 50%" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: size, lineHeight: 0.9, letterSpacing: 4, color: C.yellow, WebkitTextStroke: `8px ${C.ink}`, textShadow: `${extrude}, 14px 14px 0 ${C.ink}` }}>{title}</div>
      </div>
      {line && frame >= from + 10 && (
        <div style={{ position: "absolute", left: 250, top: size * 1.02, fontFamily: LETTER, fontWeight: 700, fontSize: 38, color: C.ink, background: C.white, border: `5px solid ${C.ink}`, padding: "8px 20px", textTransform: "uppercase", transform: "rotate(-4deg)" }}>{line}</div>
      )}
    </div>
  );
};

/** A big number in a starburst, counting up, with a caption-box label under it. (x, y) is the burst centre. */
export const StatBurst: React.FC<{ x: number; y: number; r?: number; value: number; prefix?: string; suffix?: string; decimals?: number; label: string; from?: number; seed?: number }> = ({
  x, y, r = 300, value, prefix = "", suffix = "", decimals = 0, label, from = 6, seed = 2,
}) => {
  const frame = useCurrentFrame();
  const v = countUp(value, prog(frame, from + 4, from + 34), decimals);
  return (
    <>
      <Starburst x={x} y={y} r={r} text={`${prefix}${v}${suffix}`} size={r * 0.62} from={from} seed={seed} rot={-5} outer={C.cyan} inner={C.yellow} textColor={C.white} />
      <Caption x={Math.max(60, x - 300)} y={y + r * 0.95} w={600} from={from + 20} color={C.white} size={40}>
        <div style={{ textAlign: "center" }}>{label}</div>
      </Caption>
    </>
  );
};

/** Bar chart with flat bars, Ben-Day dot shading, ink outlines and the value in Bangers above each bar. */
export const HalftoneBars: React.FC<{ x: number; y: number; w?: number; h?: number; bars: { label: string; value: number; color?: ColorName; shade?: ColorName }[]; from?: number; suffix?: string; decimals?: number }> = ({
  x, y, w = 900, h = 640, bars, from = 8, suffix = "", decimals = 0,
}) => {
  const frame = useCurrentFrame();
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = 46;
  const bw = (w - gap * (bars.length + 1)) / Math.max(1, bars.length);
  const base = h - 70;
  const top = 90;
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: x, top: y, overflow: "visible" }}>
      {bars.map((b, i) => {
        const p = prog(frame, from + i * 8, from + i * 8 + 30);
        const bh = Math.max(0, ((base - top) * b.value) / max) * p;
        const bx = gap + i * (bw + gap);
        const color = C[b.color ?? "yellow"];
        return (
          <g key={i}>
            <rect x={bx + 10} y={base - bh + 10} width={bw} height={bh} fill={C.ink} />
            <rect x={bx + MISREG[0]} y={base - bh + MISREG[1]} width={bw} height={bh} fill={color} />
            <rect x={bx} y={base - bh} width={bw} height={bh} fill={dots(b.shade ?? "magenta", "s")} opacity={0.75} />
            <rect x={bx} y={base - bh} width={bw} height={bh} fill="none" stroke={C.ink} strokeWidth={7} strokeLinejoin="round" />
            {p > 0.6 && <InkText x={bx + bw / 2} y={base - bh - 52} size={92} fill={C.white} shadow={5}>{`${(b.value * p).toFixed(decimals)}${suffix}`}</InkText>}
            <text x={bx + bw / 2} y={base + 46} textAnchor="middle" fontFamily={LETTER} fontWeight={700} fontSize={36} fill={C.ink}>{b.label.toUpperCase()}</text>
          </g>
        );
      })}
      <path d={`M0,${base} L${w},${base}`} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
    </svg>
  );
};

/** Prop: an open laptop (ink outlines, cyan dotted screen) whose screen shows `screen` lettering. (x, y) top-left. */
export const Laptop: React.FC<{ x: number; y: number; w?: number; screen?: string; from?: number }> = ({ x, y, w = 520, screen = "", from = 4 }) => {
  const pop = usePop(from, 12);
  const h = w * 0.62;
  return (
    <svg width={w + 80} height={h + 90} style={{ position: "absolute", left: x - 40, top: y, overflow: "visible", transform: `scale(${(0.7 + 0.3 * pop).toFixed(4)})`, opacity: Math.min(1, pop * 2) }}>
      <g transform="translate(40 0)">
        <rect x={10} y={10} width={w} height={h} rx={18} fill={C.ink} />
        <rect x={MISREG[0]} y={MISREG[1]} width={w} height={h} rx={18} fill={C.white} />
        <rect x={0} y={0} width={w} height={h} rx={18} fill="none" stroke={C.ink} strokeWidth={8} />
        <rect x={26} y={26} width={w - 52} height={h - 52} fill={C.cyan} stroke={C.ink} strokeWidth={5} />
        <rect x={26} y={26} width={w - 52} height={h - 52} fill={dots("blue", "s")} opacity={0.5} />
        <text x={w / 2} y={h / 2 + 4} textAnchor="middle" dominantBaseline="central" fontFamily={DISPLAY} fontSize={w * 0.13} fill={C.white} stroke={C.ink} strokeWidth={6} paintOrder="stroke" letterSpacing={2}>{screen}</text>
        <path d={`M${-40},${h + 70} L${w + 40},${h + 70} L${w},${h + 6} L0,${h + 6} Z`} fill={C.yellow} stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
        <path d={`M${w * 0.4},${h + 50} L${w * 0.6},${h + 50}`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      </g>
    </svg>
  );
};

/** Prop: a flying envelope (an email), inked, with a red heart-free seal. (x, y) is its centre. */
export const Envelope: React.FC<{ x: number; y: number; size?: number; rot?: number; from?: number; drift?: number }> = ({ x, y, size = 120, rot = 0, from = 0, drift = 0 }) => {
  const frame = useCurrentFrame();
  const pop = usePop(from, 10);
  if (frame < from) return null;
  const k = frame - from;
  const w = size;
  const h = size * 0.66;
  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}>
      <g transform={`translate(${(x + drift * k).toFixed(1)} ${(y + Math.sin(k / 6) * 6).toFixed(1)}) rotate(${(rot + Math.sin(k / 9) * 4).toFixed(2)}) scale(${pop.toFixed(4)})`}>
        <rect x={-w / 2 + 7} y={-h / 2 + 7} width={w} height={h} fill={C.ink} />
        <rect x={-w / 2 + MISREG[0]} y={-h / 2 + MISREG[1]} width={w} height={h} fill={C.white} />
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        <path d={`M${-w / 2},${-h / 2} L0,${h * 0.08} L${w / 2},${-h / 2}`} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        <circle cx={0} cy={h * 0.08} r={size * 0.08} fill={C.red} stroke={C.ink} strokeWidth={4} />
      </g>
    </svg>
  );
};

export const SampleTag: React.FC<{ y?: number }> = ({ y = 1510 }) => (
  <div style={{ position: "absolute", left: 0, width: W, top: y, textAlign: "center" }}>
    <span style={{ fontFamily: LETTER, fontWeight: 700, fontSize: 24, letterSpacing: 6, color: C.ink, background: C.white, border: `3px solid ${C.ink}`, padding: "4px 16px" }}>SAMPLE CONTENT</span>
  </div>
);
