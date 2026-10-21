/**
 * Lyric style bundle kit: building blocks for vertical (1080x1920, 9:16, mobile-first) animated lyric /
 * music videos in a kawaii retro-pixel Y2K pastel-pop style. Each lyric line is its own comedic
 * vignette: sunburst or checker backgrounds, chunky outlined type, a terminal, retro windows,
 * stickers, props and an original pixel-art character. See docs/lyric_video_style_guide.md.
 *
 * Layout: the lyric/headline sits in the top 60% (y 160 to 1100), props and the character below it
 * (y 1000 to 1500). Safe zone: y 160 to 1500, x 60 to 1020.
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadTitan } from "@remotion/google-fonts/TitanOne";
import { loadFont as loadBungee } from "@remotion/google-fonts/Bungee";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadPixel } from "@remotion/google-fonts/PressStart2P";

const titan = loadTitan("normal", { weights: ["400"], subsets: ["latin"] });
const bungee = loadBungee("normal", { weights: ["400"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["500", "700"], subsets: ["latin"] });
const playfair = loadPlayfair("italic", { weights: ["500", "700"], subsets: ["latin"] });
const fredoka = loadFredoka("normal", { weights: ["500", "700"], subsets: ["latin"] });
const pixel = loadPixel("normal", { weights: ["400"], subsets: ["latin"] });
export const BUBBLE = titan.fontFamily; // bubble display type
export const BLOCK = bungee.fontFamily; // blocky slam type
export const CODE = mono.fontFamily; // terminal text
export const CURSIVE = playfair.fontFamily; // italic serif for feelings
export const BODY = fredoka.fontFamily; // UI text, stickers
export const PIXEL = pixel.fontFamily; // tiny pixel labels

export const W = 1080;
export const H = 1920;
export const C = {
  ink: "#2a1b3d", pink: "#ff4f9a", pinkLight: "#ffb8dc", yellow: "#ffe45e", mint: "#7ce8c4", lavender: "#c9b8ff",
  peach: "#ffc9a8", sky: "#9fd4ff", purple: "#6b3fa0", night: "#1b1030", white: "#ffffff", green: "#8bf0b4",
};

const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (frame: number, from: number, to: number) =>
  interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });
export const usePop = (delay: number, damping = 9) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 140 } });
};

export type Bg = "pinkburst" | "yellowburst" | "mint" | "checker" | "peach" | "night" | "sky" | "cream" | "lavender" | "black";

const bgStyle = (bg: Bg, frame: number): React.CSSProperties => {
  const spin = frame * 0.2;
  switch (bg) {
    case "pinkburst":
      return { background: `repeating-conic-gradient(from ${spin}deg at 50% 38%, #ff5fa8 0deg 10deg, #ffb3d9 10deg 20deg)` };
    case "yellowburst":
      return { background: `repeating-conic-gradient(from ${spin}deg at 50% 38%, #ffe66d 0deg 10deg, #fff5b0 10deg 20deg)` };
    case "mint":
      return { background: "repeating-linear-gradient(45deg, #9be8cf 0 56px, #c3f3e1 56px 112px)", backgroundPosition: `${frame}px 0` };
    case "checker":
      return { background: "repeating-conic-gradient(#ff3d8b 0 25%, #ffd1e6 0 50%) 0 0 / 150px 150px", backgroundPosition: `${frame * 1.5}px ${frame * 1.5}px` };
    case "peach":
      return { background: "radial-gradient(circle, rgba(255,255,255,0.55) 5px, transparent 6px) 0 0 / 44px 44px, #ffc9a8" };
    case "night":
      return { background: "radial-gradient(circle at 70% 18%, #5b2d8f 0%, #2a1650 40%, #1b1030 100%)" };
    case "sky":
      return { background: "linear-gradient(180deg, #8ecbff 0%, #e4f4ff 100%)" };
    case "cream":
      return { background: "radial-gradient(circle, rgba(42,27,61,0.08) 3px, transparent 4px) 0 0 / 36px 36px, #fbf3df" };
    case "lavender":
      return { background: "radial-gradient(circle, rgba(255,255,255,0.6) 5px, transparent 6px) 0 0 / 44px 44px, #cdbfff" };
    default:
      return { background: "#0b0a10" };
  }
};

/** Scene surface. Backgrounds drift or spin slowly; a faint star field on `night`. */
export const PopScene: React.FC<{ bg: Bg; children?: React.ReactNode }> = ({ bg, children }) => {
  const frame = useCurrentFrame();
  const fade = prog(frame, 0, 4);
  return (
    <AbsoluteFill style={{ opacity: fade, overflow: "hidden", fontFamily: BODY }}>
      <AbsoluteFill style={bgStyle(bg, frame)} />
      {bg === "night" && (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {Array.from({ length: 36 }, (_, i) => (
            <circle key={i} cx={(i * 97) % W} cy={(i * 211) % H} r={2 + (i % 3)} fill="#fff" opacity={0.3 + 0.5 * Math.abs(Math.sin(frame / 20 + i))} />
          ))}
        </svg>
      )}
      {children}
    </AbsoluteFill>
  );
};

/** Chunky outlined bubble title with a stacked extrude; letters bounce in one by one. */
export const BubbleTitle: React.FC<{ text: string; y: number; size?: number; color?: string; shadow?: string; font?: string; from?: number; rotate?: number; spacing?: number }> = ({ text, y, size = 190, color = "#fff", shadow = C.pink, font = BUBBLE, from = 2, rotate = -3, spacing = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const extrude = Array.from({ length: 9 }, (_, i) => `${i + 1}px ${i + 1}px 0 ${shadow}`).join(", ");
  return (
    <div style={{ position: "absolute", left: 0, width: W, top: y, textAlign: "center", fontFamily: font, fontSize: size, lineHeight: 1, letterSpacing: spacing, transform: `rotate(${rotate}deg)` }}>
      {text.split("").map((ch, i) => {
        const p = spring({ frame: frame - from - i * 2, fps, config: { damping: 8, stiffness: 160 } });
        return (
          <span key={i} style={{ display: "inline-block", color, WebkitTextStroke: `7px ${C.ink}`, paintOrder: "stroke fill", textShadow: `${extrude}, 0 22px 30px rgba(42,27,61,0.35)`, transform: `translateY(${(1 - p) * -160}px) rotate(${(1 - p) * 20 * (i % 2 ? 1 : -1)}deg) scale(${0.4 + 0.6 * p})`, opacity: Math.min(1, p * 2), whiteSpace: "pre" }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

/** Blocky slam type (Bungee) that punches in with a quick glitch jitter. */
export const Slam: React.FC<{ text: string; y: number; size?: number; color?: string; shadow?: string; from?: number; rotate?: number; x?: number; width?: number }> = ({ text, y, size = 220, color = "#fff", shadow = C.ink, from = 0, rotate = -4, x = 0, width = W }) => {
  const frame = useCurrentFrame();
  const p = usePop(from, 10);
  const glitch = frame - from > 0 && frame - from < 10 ? Math.sin(frame * 9) * 12 : 0;
  return (
    <div style={{ position: "absolute", left: x, width, top: y, textAlign: "center", fontFamily: BLOCK, fontSize: size, lineHeight: 0.95, color, WebkitTextStroke: `6px ${C.ink}`, paintOrder: "stroke fill", textShadow: `10px 10px 0 ${shadow}`, transform: `translateX(${glitch}px) rotate(${rotate}deg) scale(${0.5 + 0.5 * p})`, opacity: Math.min(1, p * 3), whiteSpace: "pre-line" }}>
      {text}
    </div>
  );
};

/** Handwritten-feel italic serif lyric; words fade in one at a time. */
export const Cursive: React.FC<{ text: string; y: number; size?: number; color?: string; from?: number; align?: "left" | "center"; glow?: string }> = ({ text, y, size = 96, color = C.ink, from = 2, align = "center", glow }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 70, width: W - 140, top: y, textAlign: align, fontFamily: CURSIVE, fontWeight: 700, fontSize: size, lineHeight: 1.12, color, textShadow: glow ? `0 0 30px ${glow}, 0 0 60px ${glow}` : undefined }}>
      {text.split(" ").map((w, i) => {
        const p = prog(frame, from + i * 5, from + i * 5 + 10);
        return (
          <span key={i} style={{ display: "inline-block", marginRight: size * 0.25, opacity: p, transform: `translateY(${(1 - p) * 20}px)` }}>{w}</span>
        );
      })}
    </div>
  );
};

/** Sticker pill ("oh-oh-oh!") that pops in and wobbles. */
export const Sticker: React.FC<{ text: string; x: number; y: number; rot?: number; bg?: string; color?: string; from?: number; size?: number }> = ({ text, x, y, rot = -8, bg = C.mint, color = C.ink, from = 10, size = 40 }) => {
  const frame = useCurrentFrame();
  const p = usePop(from, 8);
  return (
    <div style={{ position: "absolute", left: x, top: y, padding: "14px 34px", borderRadius: 60, background: bg, color, border: `5px solid ${C.ink}`, boxShadow: `7px 7px 0 ${C.ink}`, fontFamily: BODY, fontWeight: 700, fontSize: size, transform: `rotate(${rot + Math.sin(frame / 8) * 2}deg) scale(${p})`, opacity: Math.min(1, p * 2), whiteSpace: "nowrap" }}>
      {text}
    </div>
  );
};

/** Retro OS window: title bar with dots, pastel frame. Children are the body. */
export const RetroWindow: React.FC<{ x: number; y: number; w: number; h: number; title?: string; bar?: string; from?: number; children?: React.ReactNode; dark?: boolean }> = ({ x, y, w, h, title = "untitled", bar = C.lavender, from = 4, children, dark }) => {
  const p = usePop(from, 12);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 26, border: `5px solid ${C.ink}`, background: dark ? "#1a1030" : "#fff", boxShadow: `10px 10px 0 ${C.ink}`, overflow: "hidden", transform: `scale(${0.7 + 0.3 * p})`, opacity: Math.min(1, p * 2) }}>
      <div style={{ height: 56, background: bar, borderBottom: `5px solid ${C.ink}`, display: "flex", alignItems: "center", gap: 10, padding: "0 20px" }}>
        {[C.pink, C.yellow, C.mint].map((c) => (
          <div key={c} style={{ width: 18, height: 18, borderRadius: 9, background: c, border: `3px solid ${C.ink}` }} />
        ))}
        <div style={{ flex: 1, textAlign: "center", fontFamily: PIXEL, fontSize: 16, color: C.ink, paddingRight: 80 }}>{title}</div>
      </div>
      <div style={{ position: "relative", height: h - 61 }}>{children}</div>
    </div>
  );
};

/** Terminal window with typed lines; each line starts typing at its own frame. */
export const Terminal: React.FC<{ x?: number; y: number; w?: number; h?: number; title?: string; lines: { t: string; color?: string; from?: number; size?: number }[]; cps?: number }> = ({ x = 70, y, w = 940, h = 560, title = "terminal", lines, cps = 0.8 }) => {
  const frame = useCurrentFrame();
  return (
    <RetroWindow x={x} y={y} w={w} h={h} title={title} bar={C.lavender} dark>
      <div style={{ padding: "32px 36px", fontFamily: CODE, fontWeight: 700, lineHeight: 1.3 }}>
        {lines.map((ln, i) => {
          const start = ln.from ?? 10 + i * 30;
          const n = Math.max(0, Math.min(ln.t.length, Math.floor((frame - start) * cps)));
          const last = n > 0 && n < ln.t.length;
          return (
            <div key={i} style={{ fontSize: ln.size ?? 54, color: ln.color ?? C.green, minHeight: (ln.size ?? 54) * 1.3 }}>
              {ln.t.slice(0, n)}
              {(last || (n === ln.t.length && i === lines.length - 1 && frame % 24 < 12)) && <span style={{ color: C.pink }}>█</span>}
            </div>
          );
        })}
      </div>
    </RetroWindow>
  );
};

const SPRITE = [
  "....HHHH....",
  "...HHHHHH...",
  "..HHHHHHHH..",
  "..HSSSSSSH..",
  "..HSDSSDSH..",
  "..HSBSSBSH..",
  "...SSSSSS...",
  "....SSSS....",
  "..WWWWWWWW..",
  ".WWWWWWWWWW.",
  ".WWWWWWWWWW.",
  ".SWWWWWWWWS.",
  "..WWWWWWWW..",
  "..PPPPPPPP..",
  "..PPP..PPP..",
  "..DDD..DDD..",
];
const PAL: Record<string, string> = { H: "#ff8a3d", S: "#ffd7b5", W: "#6fe0b8", D: "#2b2140", P: "#3b4cca", G: "#2b2140", B: "#ff9bb5" };

/** Original pixel-art character (orange hair, mint hoodie). hat: chef | hard | none. */
export const Pixie: React.FC<{ x: number; y: number; scale?: number; hat?: "chef" | "hard" | "none"; wave?: boolean; from?: number; flip?: boolean }> = ({ x, y, scale = 1, hat = "none", wave, from = 0, flip }) => {
  const frame = useCurrentFrame();
  const p = usePop(from, 10);
  const u = 12 * scale;
  const blink = frame % 100 > 94;
  const bob = Math.sin(frame / 9) * 4 * scale;
  const rects: React.ReactNode[] = [];
  SPRITE.forEach((row, r) =>
    row.split("").forEach((ch, c) => {
      if (ch === ".") return;
      let col = PAL[ch];
      if (blink && ch === "D" && r === 4) col = PAL.S;
      rects.push(<rect key={`${r}-${c}`} x={c * u} y={r * u} width={u + 0.6} height={u + 0.6} fill={col} />);
    })
  );
  const armUp = wave && frame % 24 < 12;
  return (
    <svg width={12 * u + 40} height={20 * u} viewBox={`-20 ${-4 * u} ${12 * u + 40} ${20 * u}`} shapeRendering="crispEdges" style={{ position: "absolute", left: x, top: y + bob, opacity: Math.min(1, p * 2), transform: `scale(${(0.6 + 0.4 * p) * (flip ? -1 : 1)}, ${0.6 + 0.4 * p})`, transformOrigin: "50% 100%", overflow: "visible" }}>
      {rects}
      {armUp && <rect x={11 * u} y={6 * u} width={u} height={3 * u} fill={PAL.W} />}
      {armUp && <rect x={11 * u} y={5 * u} width={u} height={u} fill={PAL.S} />}
      {hat === "chef" && (
        <>
          <rect x={3 * u} y={-u} width={6 * u} height={2 * u} fill="#fff" stroke={C.ink} strokeWidth={3} />
          <rect x={2 * u} y={-3 * u} width={8 * u} height={2.5 * u} fill="#fff" stroke={C.ink} strokeWidth={3} rx={u} />
        </>
      )}
      {hat === "hard" && <rect x={2 * u} y={-u} width={8 * u} height={2 * u} fill={C.yellow} stroke={C.ink} strokeWidth={3} />}
    </svg>
  );
};

/** "Achievement unlocked" toast. */
export const Toast: React.FC<{ y: number; title: string; sub?: string; from?: number }> = ({ y, title, sub, from = 20 }) => {
  const p = usePop(from, 12);
  return (
    <div style={{ position: "absolute", left: 90, width: 900, top: y, padding: "22px 30px", borderRadius: 28, background: "#1b1030", border: `4px solid ${C.ink}`, boxShadow: `8px 8px 0 ${C.pink}`, display: "flex", alignItems: "center", gap: 24, transform: `translateX(${(1 - p) * 900}px)`, color: "#fff" }}>
      <div style={{ width: 70, height: 70, borderRadius: 18, background: C.yellow, border: `4px solid ${C.ink}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>★</div>
      <div>
        <div style={{ fontFamily: PIXEL, fontSize: 18, color: C.yellow, letterSpacing: 1 }}>ACHIEVEMENT UNLOCKED</div>
        <div style={{ fontFamily: BODY, fontWeight: 700, fontSize: 36, marginTop: 8 }}>{title}</div>
        {sub && <div style={{ fontFamily: BODY, fontSize: 26, color: "#bfb2e6" }}>{sub}</div>}
      </div>
    </div>
  );
};

/** Stopwatch prop: needle sweeps to `seconds`. */
export const Stopwatch: React.FC<{ cx: number; cy: number; r?: number; seconds: number; from?: number }> = ({ cx, cy, r = 190, seconds, from = 4 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - from, fps, config: { damping: 11, stiffness: 60 } });
  const ang = (seconds / 60) * 360 * sp;
  return (
    <g>
      <rect x={cx - 26} y={cy - r - 50} width={52} height={40} rx={10} fill={C.pink} stroke={C.ink} strokeWidth={6} />
      <circle cx={cx} cy={cy} r={r} fill="#fff" stroke={C.ink} strokeWidth={9} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return <line key={i} x1={cx + Math.cos(a) * (r - 24)} y1={cy + Math.sin(a) * (r - 24)} x2={cx + Math.cos(a) * (r - 8)} y2={cy + Math.sin(a) * (r - 8)} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />;
      })}
      <path d={`M${cx},${cy} L${cx + Math.cos((ang - 90) * (Math.PI / 180)) * (r - 20)},${cy + Math.sin((ang - 90) * (Math.PI / 180)) * (r - 20)}`} stroke={C.pink} strokeWidth={10} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={14} fill={C.ink} />
    </g>
  );
};

/** Newspaper prop with a masthead, big headline and a hand-drawn red circle. */
export const Newspaper: React.FC<{ y: number; masthead: string; headline: string; circled: string; from?: number }> = ({ y, masthead, headline, circled, from = 6 }) => {
  const frame = useCurrentFrame();
  const p = usePop(from, 12);
  const c = prog(frame, from + 40, from + 62);
  return (
    <div style={{ position: "absolute", left: 70, width: 940, top: y, height: 760, background: "#fffdf4", border: `5px solid ${C.ink}`, boxShadow: `10px 10px 0 ${C.ink}`, padding: "34px 44px", boxSizing: "border-box", transform: `rotate(${-2 + (1 - p) * 8}deg) scale(${0.8 + 0.2 * p})`, opacity: Math.min(1, p * 2) }}>
      <div style={{ textAlign: "center", fontFamily: CURSIVE, fontWeight: 700, fontSize: 62, color: C.ink, borderBottom: `5px double ${C.ink}`, paddingBottom: 12 }}>{masthead}</div>
      <div style={{ marginTop: 40, fontFamily: BLOCK, fontSize: 82, lineHeight: 1.0, color: C.ink }}>{headline}</div>
      <div style={{ position: "relative", marginTop: 30, fontFamily: BLOCK, fontSize: 82, lineHeight: 1.0, color: C.pink }}>
        {circled}
        <svg width={860} height={150} viewBox="0 0 860 150" style={{ position: "absolute", left: -20, top: -30 }}>
          <path d="M20,80 C60,10 760,0 830,60 C880,110 700,150 420,140 C140,140 0,120 20,80 Z" fill="none" stroke="#e02020" strokeWidth={9} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - c} />
        </svg>
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ height: 14, width: `${88 - i * 12}%`, background: "#d8d2bf", borderRadius: 7, marginTop: i === 0 ? 50 : 18 }} />
      ))}
    </div>
  );
};

/** Receipt prop: rows typed in, then a stamp slaps on. */
export const Receipt: React.FC<{ y: number; title: string; rows: { l: string; r: string }[]; stamp: string; from?: number }> = ({ y, title, rows, stamp, from = 6 }) => {
  const frame = useCurrentFrame();
  const p = usePop(from, 12);
  const s = usePop(from + 60, 7);
  return (
    <div style={{ position: "absolute", left: 120, width: 840, top: y, background: "#fffdf4", border: `5px solid ${C.ink}`, boxShadow: `10px 10px 0 ${C.ink}`, padding: "36px 44px 50px", boxSizing: "border-box", minHeight: 720, fontFamily: CODE, fontWeight: 700, transform: `rotate(${1.5}deg) translateY(${(1 - p) * 500}px)`, opacity: Math.min(1, p * 2) }}>
      <div style={{ textAlign: "center", fontSize: 44, letterSpacing: 6, color: C.ink, borderBottom: `4px dashed ${C.ink}`, paddingBottom: 18 }}>{title}</div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 32, color: C.ink, marginTop: 26, opacity: prog(frame, from + 14 + i * 10, from + 24 + i * 10) }}>
          <span>{row.l}</span>
          <span>{row.r}</span>
        </div>
      ))}
      <div style={{ position: "absolute", right: -40, bottom: 20, padding: "12px 34px", border: `8px solid ${C.pink}`, color: C.pink, fontFamily: BLOCK, fontSize: 88, background: "rgba(255,255,255,0.7)", transform: `rotate(-12deg) scale(${s * 1.0})`, opacity: Math.min(1, s * 2) }}>{stamp}</div>
    </div>
  );
};

/** Credits roll block: label (pixel) over name (display), centered. */
export const Credits: React.FC<{ y: number; rows: { label: string; name: string }[]; from?: number }> = ({ y, rows, from = 4 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, width: W, top: y, textAlign: "center" }}>
      {rows.map((r, i) => {
        const p = prog(frame, from + i * 12, from + i * 12 + 14);
        return (
          <div key={i} style={{ marginBottom: 70, opacity: p, transform: `translateY(${(1 - p) * 30}px)` }}>
            <div style={{ fontFamily: PIXEL, fontSize: 22, color: "#bfb2e6", marginBottom: 20 }}>{r.label}</div>
            <div style={{ fontFamily: BUBBLE, fontSize: 70, color: i % 2 ? C.lavender : C.pinkLight, WebkitTextStroke: `3px ${C.ink}`, paintOrder: "stroke fill" }}>{r.name}</div>
          </div>
        );
      })}
    </div>
  );
};

/** Small tag for template scenes that carry sample lyrics. */
export const SampleTag: React.FC<{ dark?: boolean }> = ({ dark }) => (
  <div style={{ position: "absolute", left: 0, width: W, top: 1560, textAlign: "center", fontFamily: PIXEL, fontSize: 16, color: dark ? "#8a7fb0" : "#7a6a99" }}>SAMPLE LYRICS</div>
);

/** SVG layer helper for props like Stopwatch (absolute canvas coordinates). */
export const Art: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>{children}</svg>
);
