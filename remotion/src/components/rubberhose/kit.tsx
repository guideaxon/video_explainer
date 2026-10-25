/**
 * Rubberhose style bundle kit: building blocks for vertical (1080x1920, 9:16) retro rubber-hose cartoons with a
 * 1930s feel: ink-black fills on a sepia palette, noodle limbs with white four-finger gloves and round shoes, pie-cut
 * eyes, a constant rhythmic bounce, film grain, gate weave, flicker, vignette, dust and scratches, Art Deco title
 * cards and iris-in / iris-out. All art is original and drawn in code; everything is deterministic.
 * See docs/rubberhose_video_style_guide.md.
 *
 * Period motion ("on twos"): the pipeline renders 30 fps, but the character, props and film damage change on a
 * held-frame clock of about 12 drawings per second (`useHeld`). Lip sync arrays are per real frame, so the mouth
 * is indexed with the real frame.
 *
 * Layout: eyebrow + headline in the top third (y 200 to 520), the stage below, ground line about y 1440.
 * Safe zone: y 160 to 1500, x 60 to 1020.
 */
import React, { createContext, useContext, useId, useMemo } from "react";
import { AbsoluteFill, Internals, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadCorben } from "@remotion/google-fonts/Corben";
import { loadFont as loadLime } from "@remotion/google-fonts/Limelight";
import { loadFont as loadYester } from "@remotion/google-fonts/Yesteryear";
import { blinkAt, gestureT, visemeAt, walkAt } from "../rig";
import type { RigProps, Viseme } from "../rig";
import { bounceAt, drawingAt, dustAt, flickerAt, grainOffset, grainPixels, hash3, heldFrame, hosePath, irisRadius, piePath, scratchesAt, squash, weaveAt } from "./film";

export { drawingAt, heldFrame } from "./film";

const corben = loadCorben("normal", { weights: ["400", "700"], subsets: ["latin"] });
const lime = loadLime("normal", { weights: ["400"], subsets: ["latin"] });
const yester = loadYester("normal", { weights: ["400"], subsets: ["latin"] });
/** Rounded period cartoon lettering: headlines, signs, sub lines. */
export const BODY = corben.fontFamily;
/** Art Deco display face: title cards, eyebrows. */
export const DECO = lime.fontFamily;
/** Script: the "That's all!" end card only. */
export const SCRIPT = yester.fontFamily;

export const W = 1080;
export const H = 1920;

/** Limited period palette: sepia paper, ink, enamel white, one muted brick red and one old gold (use sparingly). */
export const C = {
  paper: "#ece0c3", paperDark: "#d8c59c", sepia: "#a8865a", umber: "#5a4630", ink: "#1b140d",
  enamel: "#f6ecd4", glove: "#fbf6ea", rose: "#cf9478", brick: "#9c3b22", gold: "#d9aa52", tongue: "#a8432c",
};

export const TONES = {
  paper: { bg: C.paper, ink: C.ink, accent: C.brick, dim: C.umber, card: C.enamel, ground: C.paperDark },
  ink: { bg: "#241a11", ink: C.enamel, accent: C.gold, dim: "#b9a47c", card: "#30241a", ground: "#3a2c1f" },
  stage: { bg: C.paperDark, ink: C.ink, accent: C.brick, dim: C.umber, card: C.enamel, ground: C.sepia },
} as const;
export type ToneName = keyof typeof TONES;
export type Tone = (typeof TONES)[ToneName];
const ToneCtx = createContext<Tone>(TONES.paper);
export const useTone = () => useContext(ToneCtx);

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** The held-frame clock: `frame` (real, for lip sync), `hf` (frame the current drawing started) and drawing index `d`. */
export const useHeld = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, hf: heldFrame(frame, fps), d: drawingAt(frame, fps) };
};
/** Bouncy pop (overshooting spring) on the held clock. */
export const usePop = (delay: number, damping = 9) => {
  const { hf, fps } = useHeld();
  return spring({ frame: hf - delay, fps, config: { damping, stiffness: 160, mass: 0.8 } });
};
/** Scene length: the storyboard sequence when inside one, else the composition. */
export const useSceneLength = () => {
  const seq = useContext(Internals.SequenceContext);
  const { durationInFrames } = useVideoConfig();
  return seq?.durationInFrames ?? durationInFrames;
};

const Svg: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", ...style }}>{children}</svg>
);

// ---------------------------------------------------------------------------------------------------------------
// Film: grain, weave, flicker, vignette, dust, scratches, iris
// ---------------------------------------------------------------------------------------------------------------

const GRAIN_SIZE = 192;
let grainUrl: string | null = null;
/** The grain tile as a PNG data URL, generated once per page from seeded pixels (no per-frame noise filter). */
const getGrain = (): string | null => {
  if (grainUrl !== null || typeof document === "undefined") return grainUrl;
  const canvas = document.createElement("canvas");
  canvas.width = GRAIN_SIZE;
  canvas.height = GRAIN_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const img = ctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  img.data.set(grainPixels(GRAIN_SIZE, 7, 0.32));
  ctx.putImageData(img, 0, 0);
  grainUrl = canvas.toDataURL("image/png");
  return grainUrl;
};

/**
 * The projector layer over a scene: grain (one tile, re-offset per drawing), flicker, vignette, dust and
 * scratches. All of it changes only on the held clock. `damage` 0 turns off dust and scratches.
 */
export const FilmFx: React.FC<{ seed?: number; damage?: number; grain?: number; vignette?: number }> = ({ seed = 0, damage = 1, grain = 1, vignette = 1 }) => {
  const { d } = useHeld();
  const url = useMemo(getGrain, []);
  const off = grainOffset(d, GRAIN_SIZE);
  const marks = damage > 0 ? scratchesAt(d, seed) : [];
  const dust = damage > 0 ? dustAt(d, seed) : [];
  return (
    <>
      {url && grain > 0 && (
        <AbsoluteFill style={{ backgroundImage: `url(${url})`, backgroundSize: `${GRAIN_SIZE * 2}px ${GRAIN_SIZE * 2}px`, backgroundPosition: `${off.x * 2}px ${off.y * 2}px`, opacity: grain }} />
      )}
      <AbsoluteFill style={{ background: "#120c06", opacity: flickerAt(d, seed) }} />
      {vignette > 0 && <AbsoluteFill style={{ background: "radial-gradient(ellipse 75% 62% at 50% 46%, rgba(18,12,6,0) 58%, rgba(18,12,6,0.62) 100%)", opacity: vignette }} />}
      {(marks.length > 0 || dust.length > 0) && (
        <Svg>
          {marks.map((m, i) => (
            <path key={`s${i}`} d={`M${m.x},${m.y0} Q${m.x + 4},${(m.y0 + m.y1) / 2} ${m.x - 2},${m.y1}`} stroke={m.light ? "#fff8e6" : "#140d07"} strokeWidth={m.w} fill="none" opacity={m.opacity * damage} />
          ))}
          {dust.map((s, i) => (
            <ellipse key={`d${i}`} cx={s.x} cy={s.y} rx={s.r} ry={s.r * 0.6} transform={`rotate(${s.rot} ${s.x} ${s.y})`} fill={s.light ? "#fff8e6" : "#140d07"} opacity={0.7 * damage} />
          ))}
        </Svg>
      )}
    </>
  );
};

/**
 * Iris in / iris out: black with a round opening centred on (cx, cy). `in` opens over the first 18 frames; `out`
 * closes over 20 frames and holds black for the last 6, so scenes cut cleanly through black.
 */
export const Iris: React.FC<{ mode: "in" | "out" | "both"; cx?: number; cy?: number; open?: number; close?: number }> = ({ mode, cx = W / 2, cy = 900, open = 18, close = 20 }) => {
  const { hf } = useHeld();
  const len = useSceneLength();
  const full = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 20;
  const r = irisRadius(hf, { full, open, close, closeAt: len, mode });
  if (r >= full) return null;
  return (
    <Svg>
      <path d={`M-40,-40 H${W + 40} V${H + 40} H-40 Z M${cx - r},${cy} a${r},${r} 0 1 0 ${2 * r},0 a${r},${r} 0 1 0 ${-2 * r},0 Z`} fill="#0d0905" fillRule="evenodd" />
      {r > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0d0905" strokeWidth={10} opacity={0.6} />}
    </Svg>
  );
};

/**
 * Scene surface: tone background, gate weave on everything inside, the projector layer on top and an optional
 * iris. `irisAt` centres the iris (usually on the character's face).
 */
export const RScene: React.FC<{
  tone?: ToneName; iris?: "in" | "out" | "both"; irisAt?: { x: number; y: number }; seed?: number; damage?: number; children?: React.ReactNode;
}> = ({ tone = "paper", iris, irisAt, seed = 0, damage = 1, children }) => {
  const T = TONES[tone];
  const { d } = useHeld();
  const wv = weaveAt(d, seed);
  return (
    <ToneCtx.Provider value={T}>
      <AbsoluteFill style={{ background: T.bg, overflow: "hidden", fontFamily: BODY, color: T.ink }}>
        <AbsoluteFill style={{ transform: `translate(${wv.x}px, ${wv.y}px)` }}>
          <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 50% at 50% 42%, rgba(255,250,235,0.35), rgba(255,250,235,0) 70%)` }} />
          {children}
          {iris && <Iris mode={iris} cx={irisAt?.x} cy={irisAt?.y} />}
        </AbsoluteFill>
        <FilmFx seed={seed} damage={damage} />
      </AbsoluteFill>
    </ToneCtx.Provider>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Type
// ---------------------------------------------------------------------------------------------------------------

/** Small Art Deco label between two rules, accent colour. */
export const Eyebrow: React.FC<{ children: React.ReactNode; y?: number; from?: number }> = ({ children, y = 190, from = 2 }) => {
  const T = useTone();
  const p = usePop(from, 14);
  return (
    <div style={{ position: "absolute", left: 60, width: 960, top: y, display: "flex", alignItems: "center", gap: 22, opacity: Math.min(1, p * 2), fontFamily: DECO, fontSize: 34, letterSpacing: 8, color: T.accent, textTransform: "uppercase" }}>
      <div style={{ flex: 1, height: 0, borderTop: `3px solid ${T.accent}`, borderBottom: `3px solid ${T.accent}`, paddingTop: 4 }} />
      <div style={{ whiteSpace: "nowrap" }}>{children}</div>
      <div style={{ flex: 1, height: 0, borderTop: `3px solid ${T.accent}`, borderBottom: `3px solid ${T.accent}`, paddingTop: 4 }} />
    </div>
  );
};

/**
 * Headline, centred: lines starting with `*` use the accent colour. Each line bounces in with squash and stretch
 * on the held clock. At the default 104 px a line holds about 13 characters.
 */
export const Headline: React.FC<{ lines: string[]; y?: number; size?: number; from?: number }> = ({ lines, y = 260, size = 104, from = 4 }) => {
  const T = useTone();
  const { hf, fps } = useHeld();
  return (
    <div style={{ position: "absolute", left: 60, width: 960, top: y, fontFamily: BODY, fontWeight: 700, fontSize: size, lineHeight: 1.08, textAlign: "center" }}>
      {lines.map((line, i) => {
        const accent = line.startsWith("*");
        const s = spring({ frame: hf - from - i * 5, fps, config: { damping: 8, stiffness: 170, mass: 0.7 } });
        const sy = 0.4 + 0.6 * s;
        const sx = 1.25 - 0.25 * s;
        return (
          <div key={i} style={{ color: accent ? T.accent : T.ink, opacity: s > 0.02 ? 1 : 0, transform: `scale(${sx}, ${sy})`, transformOrigin: "50% 100%", textShadow: `5px 5px 0 ${T.bg === C.paper || T.bg === C.paperDark ? "rgba(90,70,48,0.35)" : "rgba(0,0,0,0.5)"}` }}>
            {accent ? line.slice(1) : line}
          </div>
        );
      })}
    </div>
  );
};

export const Sub: React.FC<{ children: React.ReactNode; y: number; from?: number; size?: number }> = ({ children, y, from = 18, size = 42 }) => {
  const T = useTone();
  const p = usePop(from, 14);
  return <div style={{ position: "absolute", left: 90, width: 900, top: y, textAlign: "center", fontFamily: BODY, fontSize: size, lineHeight: 1.25, color: T.dim, opacity: Math.min(1, p * 2) }}>{children}</div>;
};

// ---------------------------------------------------------------------------------------------------------------
// Art Deco cards
// ---------------------------------------------------------------------------------------------------------------

/** Rectangle with stepped (Art Deco) corners. */
const decoRect = (x: number, y: number, w: number, h: number, s: number) =>
  `M${x + 2 * s},${y} H${x + w - 2 * s} V${y + s} H${x + w - s} V${y + 2 * s} H${x + w} V${y + h - 2 * s} H${x + w - s} V${y + h - s} H${x + w - 2 * s} V${y + h} H${x + 2 * s} V${y + h - s} H${x + s} V${y + h - 2 * s} H${x} V${y + 2 * s} H${x + s} V${y + s} H${x + 2 * s} Z`;

/** Half sunburst fan (Deco ornament), apex at (cx, cy), opening upward when `up`. */
const Fan: React.FC<{ cx: number; cy: number; r: number; up?: boolean; color: string; n?: number }> = ({ cx, cy, r, up = true, color, n = 9 }) => (
  <g>
    {Array.from({ length: n }, (_, i) => {
      const a0 = Math.PI + (i / n) * Math.PI;
      const a1 = Math.PI + ((i + 0.55) / n) * Math.PI;
      const sgn = up ? 1 : -1;
      return <path key={i} d={`M${cx},${cy} L${cx + r * Math.cos(a0)},${cy + sgn * r * Math.sin(a0)} L${cx + r * Math.cos(a1)},${cy + sgn * r * Math.sin(a1)} Z`} fill={color} />;
    })}
    <circle cx={cx} cy={cy} r={r * 0.22} fill={color} />
  </g>
);

/**
 * Opening title card: Art Deco frame (stepped corners, double rule, sunburst fans), a small kicker ("Kip the
 * Kettle in"), the title in Deco caps and a sub line. Pops in with a squash; centred at `y` (top of the card).
 */
export const TitleCard: React.FC<{ kicker?: string; title: string[]; sub?: string; y?: number; h?: number; from?: number; titleSize?: number }> = ({ kicker, title, sub, y = 330, h = 760, from = 6, titleSize = 120 }) => {
  const T = useTone();
  const p = usePop(from, 8);
  const w = 920;
  const x = (W - w) / 2;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${0.6 + 0.4 * p}, ${0.4 + 0.6 * p})`, transformOrigin: `50% ${y + h / 2}px`, opacity: Math.min(1, p * 3) }}>
      <Svg>
        <path d={decoRect(x + 14, y + 14, w, h, 26)} fill="rgba(0,0,0,0.35)" />
        <path d={decoRect(x, y, w, h, 26)} fill={T.card} stroke={C.ink} strokeWidth={10} />
        <path d={decoRect(x + 26, y + 26, w - 52, h - 52, 18)} fill="none" stroke={C.ink} strokeWidth={3} />
        <path d={decoRect(x + 38, y + 38, w - 76, h - 76, 14)} fill="none" stroke={T.accent} strokeWidth={3} />
        <Fan cx={W / 2} cy={y + 40} r={120} up={false} color={C.ink} />
        <Fan cx={W / 2} cy={y + h - 40} r={120} color={C.ink} />
        {[0, 1, 2].map((k) => (
          <g key={k}>
            <rect x={x + 70 + k * 18} y={y + h / 2 - 60} width={8} height={120} fill={T.accent} />
            <rect x={x + w - 78 - k * 18} y={y + h / 2 - 60} width={8} height={120} fill={T.accent} />
          </g>
        ))}
      </Svg>
      <div style={{ position: "absolute", left: x + 120, width: w - 240, top: y + 170, textAlign: "center", color: C.ink }}>
        {kicker && <div style={{ fontFamily: BODY, fontSize: 44, color: T.accent, marginBottom: 12 }}>{kicker}</div>}
        {title.map((t, i) => (
          <div key={i} style={{ fontFamily: DECO, fontSize: titleSize, lineHeight: 1.04, letterSpacing: 2, textTransform: "uppercase" }}>{t}</div>
        ))}
        {sub && <div style={{ fontFamily: BODY, fontSize: 40, marginTop: 24, color: C.umber }}>{sub}</div>}
      </div>
    </div>
  );
};

/**
 * End card: concentric Deco rings (drum-head style) with "That's all!" in script and a sub line. Pair with
 * `<RScene iris="out">` so it closes on the character.
 */
export const EndCard: React.FC<{ text?: string; sub?: string; cy?: number; r?: number; from?: number }> = ({ text = "That's all!", sub, cy = 720, r = 400, from = 4 }) => {
  const T = useTone();
  const { hf } = useHeld();
  const p = usePop(from, 8);
  const spin = hf * 0.6;
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, transform: `scale(${0.3 + 0.7 * p})`, transformOrigin: `50% ${cy}px`, opacity: Math.min(1, p * 3) }}>
      <Svg>
        <circle cx={W / 2} cy={cy} r={r + 16} fill={C.ink} />
        <circle cx={W / 2} cy={cy} r={r} fill={T.accent} />
        <g transform={`rotate(${spin} ${W / 2} ${cy})`}>
          {Array.from({ length: 24 }, (_, i) => {
            const a0 = (i / 24) * Math.PI * 2;
            const a1 = ((i + 0.5) / 24) * Math.PI * 2;
            return <path key={i} d={`M${W / 2},${cy} L${W / 2 + r * Math.cos(a0)},${cy + r * Math.sin(a0)} L${W / 2 + r * Math.cos(a1)},${cy + r * Math.sin(a1)} Z`} fill={C.brick} opacity={0.55} />;
          })}
        </g>
        <circle cx={W / 2} cy={cy} r={r * 0.74} fill={C.ink} />
        <circle cx={W / 2} cy={cy} r={r * 0.7} fill={C.enamel} />
        <circle cx={W / 2} cy={cy} r={r * 0.64} fill="none" stroke={C.ink} strokeWidth={4} />
      </Svg>
      <div style={{ position: "absolute", left: W / 2 - r * 0.62, width: r * 1.24, top: cy - r * 0.4, textAlign: "center", color: C.ink }}>
        <div style={{ fontFamily: SCRIPT, fontSize: 112, lineHeight: 1.1, transform: "rotate(-6deg)" }}>{text}</div>
        {sub && <div style={{ fontFamily: DECO, fontSize: 34, letterSpacing: 4, marginTop: 18, textTransform: "uppercase", color: C.umber }}>{sub}</div>}
      </div>
    </div>
  );
};

/** Rotating sunburst behind a title or finale, two sepia tones. Static wedges, rotated on the held clock. */
export const Rays: React.FC<{ cx?: number; cy?: number; n?: number; color?: string; speed?: number }> = ({ cx = W / 2, cy = 760, n = 18, color = "rgba(90,70,48,0.16)", speed = 0.35 }) => {
  const { hf } = useHeld();
  const R = 2400;
  return (
    <Svg>
      <g transform={`rotate(${hf * speed} ${cx} ${cy})`}>
        {Array.from({ length: n }, (_, i) => {
          const a0 = (i / n) * Math.PI * 2;
          const a1 = ((i + 0.5) / n) * Math.PI * 2;
          return <path key={i} d={`M${cx},${cy} L${cx + R * Math.cos(a0)},${cy + R * Math.sin(a0)} L${cx + R * Math.cos(a1)},${cy + R * Math.sin(a1)} Z`} fill={color} />;
        })}
      </g>
    </Svg>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Set and props (all bounce on the beat)
// ---------------------------------------------------------------------------------------------------------------

/** Ground: a brushy ink horizon at `y`, a darker floor below and a few tufts and pebbles. */
export const Ground: React.FC<{ y?: number; seed?: number }> = ({ y = 1440, seed = 3 }) => {
  const T = useTone();
  const tufts = Array.from({ length: 7 }, (_, i) => ({ x: 80 + i * 150 + hash3(i, seed) * 60, s: 0.7 + hash3(i, seed, 1) * 0.6 }));
  return (
    <Svg>
      <rect x={-40} y={y} width={W + 80} height={H - y + 40} fill={T.ground} />
      <path d={`M-40,${y} Q270,${y - 10} 540,${y} T1120,${y}`} stroke={C.ink} strokeWidth={8} fill="none" strokeLinecap="round" />
      {[0, 1, 2].map((k) => (
        <path key={k} d={`M${120 + k * 330},${y + 60 + k * 40} q60,-8 120,0`} stroke={C.ink} strokeWidth={4} fill="none" opacity={0.35} strokeLinecap="round" />
      ))}
      {tufts.map((t, i) => (
        <path key={i} d={`M${t.x},${y} q${-8 * t.s},${-22 * t.s} ${-16 * t.s},${-26 * t.s} M${t.x},${y} q${2 * t.s},${-26 * t.s} ${4 * t.s},${-34 * t.s} M${t.x},${y} q${10 * t.s},${-18 * t.s} ${20 * t.s},${-22 * t.s}`} stroke={C.ink} strokeWidth={5} fill="none" strokeLinecap="round" />
      ))}
    </Svg>
  );
};

/** Wooden sign on a post that drops in and wobbles to rest. Text in the cartoon face, two or three short lines. */
export const Sign: React.FC<{ x: number; y: number; w?: number; lines: string[]; from?: number; size?: number; post?: number }> = ({ x, y, w = 560, lines, from = 10, size = 58, post = 260 }) => {
  const T = useTone();
  const { hf, fps } = useHeld();
  const drop = spring({ frame: hf - from, fps, config: { damping: 7, stiffness: 150, mass: 0.9 } });
  const h = 70 + lines.length * size * 1.15;
  const wob = Math.sin((hf - from) / 3) * 6 * Math.max(0, 1 - (hf - from) / 30) * (hf > from ? 1 : 0);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h + post, transform: `translateY(${(1 - drop) * -900}px) rotate(${wob}deg)`, transformOrigin: "50% 100%" }}>
      <div style={{ position: "absolute", left: w / 2 - 16, top: h - 10, width: 32, height: post + 10, background: C.umber, border: `6px solid ${C.ink}`, boxSizing: "border-box" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: h, background: T.card, border: `9px solid ${C.ink}`, borderRadius: 18, boxSizing: "border-box", boxShadow: `10px 10px 0 rgba(27,20,13,0.4)` }}>
        <div style={{ position: "absolute", inset: 10, border: `3px solid ${T.accent}`, borderRadius: 10 }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", fontFamily: BODY, fontWeight: 700, fontSize: size, lineHeight: 1.12, color: C.ink, textAlign: "center" }}>
          {lines.map((l, i) => <div key={i} style={{ color: l.startsWith("*") ? T.accent : C.ink }}>{l.replace(/^\*/, "")}</div>)}
        </div>
      </div>
    </div>
  );
};

/** A puff of steam or dust: a cluster of round clouds that billows out and fades over `dur` frames. */
export const Puff: React.FC<{ x: number; y: number; size?: number; from?: number; dur?: number; seed?: number }> = ({ x, y, size = 1, from = 0, dur = 22, seed = 0 }) => {
  const { hf } = useHeld();
  const t = (hf - from) / dur;
  if (t < 0 || t > 1) return null;
  return (
    <Svg>
      <g transform={`translate(${x} ${y - t * 60 * size}) scale(${size * (0.5 + t)})`} opacity={1 - t * t}>
        {Array.from({ length: 5 }, (_, k) => {
          const a = (k / 5) * Math.PI * 2 + hash3(k, seed) * 0.8;
          const r = 34 + hash3(k, seed, 1) * 18;
          return <circle key={k} cx={Math.cos(a) * 46} cy={Math.sin(a) * 30} r={r} fill={C.enamel} stroke={C.ink} strokeWidth={6} />;
        })}
        <ellipse cx={0} cy={0} rx={52} ry={34} fill={C.enamel} />
      </g>
    </Svg>
  );
};

const starPath = (r: number) => Array.from({ length: 10 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI) / 5;
  const rr = i % 2 ? r * 0.45 : r;
  return `${i ? "L" : "M"}${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
}).join(" ") + " Z";

/** Dizzy stars circling a point (the gag). */
export const Stars: React.FC<{ x: number; y: number; rx?: number; from?: number; n?: number }> = ({ x, y, rx = 150, from = 0, n = 4 }) => {
  const { hf } = useHeld();
  if (hf < from) return null;
  const t = (hf - from) / 9;
  return (
    <Svg>
      {Array.from({ length: n }, (_, k) => {
        const a = t + (k / n) * Math.PI * 2;
        const front = Math.sin(a) > 0;
        return (
          <g key={k} transform={`translate(${x + Math.cos(a) * rx} ${y + Math.sin(a) * rx * 0.28}) rotate(${hf * 6 + k * 40}) scale(${front ? 1 : 0.75})`}>
            <path d={starPath(30)} fill={k % 2 ? C.gold : C.enamel} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          </g>
        );
      })}
    </Svg>
  );
};

/** Light bulb that pops in and flashes on at `on` (the idea). */
export const Bulb: React.FC<{ x: number; y: number; scale?: number; from?: number; on?: number }> = ({ x, y, scale = 1, from = 0, on = 10 }) => {
  const { hf } = useHeld();
  const p = usePop(from, 7);
  const lit = hf >= on;
  const flash = lit ? 0.6 + 0.4 * Math.abs(Math.sin((hf - on) / 4)) : 0;
  if (p <= 0.001) return null;
  return (
    <Svg>
      <g transform={`translate(${x} ${y}) scale(${scale * (0.3 + 0.7 * p)})`}>
        {lit && Array.from({ length: 8 }, (_, k) => {
          const a = (k / 8) * Math.PI * 2;
          const r0 = 104;
          const r1 = 140 + 26 * flash;
          return <path key={k} d={`M${Math.cos(a) * r0},${Math.sin(a) * r0 - 20} L${Math.cos(a) * r1},${Math.sin(a) * r1 - 20}`} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />;
        })}
        <path d="M-80,-20 C-80,-80 -40,-110 0,-110 C40,-110 80,-80 80,-20 C80,20 40,40 34,74 L-34,74 C-40,40 -80,20 -80,-20 Z" fill={lit ? C.gold : C.enamel} stroke={C.ink} strokeWidth={9} />
        <path d="M-40,-60 Q-52,-30 -40,0" stroke={C.glove} strokeWidth={10} fill="none" strokeLinecap="round" opacity={0.9} />
        <path d="M-18,74 L-12,10 M18,74 L12,10 M-12,10 Q0,-6 12,10" stroke={C.ink} strokeWidth={5} fill="none" />
        <rect x={-38} y={74} width={76} height={44} rx={8} fill={C.ink} />
        <path d="M-36,90 H36 M-36,104 H36" stroke={C.paperDark} strokeWidth={4} />
      </g>
    </Svg>
  );
};

/** Teacup on a saucer with steam wisps; bounces on the beat. */
export const Cup: React.FC<{ x: number; y: number; scale?: number; from?: number }> = ({ x, y, scale = 1, from = 0 }) => {
  const { hf, fps } = useHeld();
  const p = usePop(from, 8);
  const b = bounceAt(hf, fps);
  const sq = squash(b, 0.08);
  if (p <= 0.001) return null;
  return (
    <Svg>
      <g transform={`translate(${x} ${y}) scale(${scale * p})`}>
        <g transform={`translate(0 ${-b * 14}) scale(${sq.sx} ${sq.sy})`}>
          {[0, 1].map((k) => (
            <path key={k} d={`M${-26 + k * 44},-150 q${-18 + 6 * Math.sin(hf / 5 + k)},-30 0,-60 q18,-30 0,-60`} stroke={C.ink} strokeWidth={7} fill="none" strokeLinecap="round" opacity={0.7} />
          ))}
          <path d="M92,-110 C150,-110 150,-40 84,-40" stroke={C.ink} strokeWidth={16} fill="none" />
          <path d="M-110,-130 H110 C106,-40 70,0 0,0 C-70,0 -106,-40 -110,-130 Z" fill={C.enamel} stroke={C.ink} strokeWidth={9} />
          <ellipse cx={0} cy={-130} rx={110} ry={20} fill={C.umber} stroke={C.ink} strokeWidth={9} />
          <path d="M-80,-80 H80" stroke={C.brick} strokeWidth={10} />
        </g>
        <ellipse cx={0} cy={6} rx={160} ry={24} fill={C.enamel} stroke={C.ink} strokeWidth={9} />
      </g>
    </Svg>
  );
};

/** Alarm clock on rubber-hose legs; rattles and sprouts ring lines while `ringing` (from `ringFrom`). */
export const Clock: React.FC<{ x: number; y: number; scale?: number; from?: number; ringFrom?: number; hour?: number }> = ({ x, y, scale = 1, from = 0, ringFrom = 12, hour = 10 }) => {
  const { hf, fps, d } = useHeld();
  const p = usePop(from, 8);
  const ring = hf >= ringFrom;
  const shake = ring ? (d % 2 ? 1 : -1) * 7 : 0;
  const b = ring ? 1 : bounceAt(hf, fps);
  if (p <= 0.001) return null;
  const legs = [-1, 1].map((s) => hosePath({ x: s * 40, y: -60 }, { x: s * 70, y: 0 }, 110, s));
  return (
    <Svg>
      <g transform={`translate(${x} ${y}) scale(${scale * p})`}>
        {legs.map((l, i) => <path key={i} d={l.d} stroke={C.ink} strokeWidth={14} fill="none" strokeLinecap="round" />)}
        {[-1, 1].map((s) => <ellipse key={s} cx={s * 84} cy={-6} rx={30} ry={16} fill={C.ink} />)}
        <g transform={`translate(0 ${-b * 10 - (ring ? Math.abs(shake) : 0)}) rotate(${shake} 0 -150)`}>
          {[-1, 1].map((s) => <circle key={s} cx={s * 70} cy={-250} r={34} fill={C.ink} />)}
          <path d="M-14,-262 L0,-290 L14,-262" stroke={C.ink} strokeWidth={10} fill="none" />
          <circle cx={0} cy={-160} r={104} fill={C.enamel} stroke={C.ink} strokeWidth={12} />
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2;
            return <circle key={k} cx={Math.cos(a) * 82} cy={-160 + Math.sin(a) * 82} r={k % 3 ? 4 : 8} fill={C.ink} />;
          })}
          <path d={`M0,-160 L${Math.cos(((hour % 12) / 12) * Math.PI * 2 - Math.PI / 2) * 46},${-160 + Math.sin(((hour % 12) / 12) * Math.PI * 2 - Math.PI / 2) * 46}`} stroke={C.ink} strokeWidth={12} strokeLinecap="round" />
          <path d={`M0,-160 L${Math.cos((hf / 20) * Math.PI * 2 - Math.PI / 2) * 70},${-160 + Math.sin((hf / 20) * Math.PI * 2 - Math.PI / 2) * 70}`} stroke={C.brick} strokeWidth={7} strokeLinecap="round" />
          <circle cx={0} cy={-160} r={10} fill={C.ink} />
        </g>
        {ring && [-1, 1].map((s) => (
          <g key={s} stroke={C.ink} strokeWidth={8} strokeLinecap="round">
            {[0, 1, 2].map((k) => <path key={k} d={`M${s * (130 + (d % 2) * 8)},${-290 + k * 34} l${s * 40},${-14 + k * 14}`} />)}
          </g>
        ))}
      </g>
    </Svg>
  );
};

export const SampleTag: React.FC = () => (
  <div style={{ position: "absolute", left: 0, width: W, top: 1530, textAlign: "center", fontFamily: DECO, fontSize: 24, letterSpacing: 8, color: "#7a6448" }}>SAMPLE CONTENT</div>
);

// ---------------------------------------------------------------------------------------------------------------
// The character: Kip, a rubber-hose tea kettle
// ---------------------------------------------------------------------------------------------------------------

export type KipGesture = "rest" | "wave" | "point" | "shrug" | "toot";
export type KipLook = "camera" | "left" | "right" | "up";
export const KIP_GESTURES: KipGesture[] = ["rest", "wave", "point", "shrug", "toot"];

type P = { x: number; y: number };
type Glove = "open" | "point";
type Pose = { r: P; l: P; rBend: number; lBend: number; rGlove: Glove; lGlove: Glove; lift: number };
/** Hand targets (body space, before squash) per gesture. Rest hands hang loose so the hose arms bow. */
const POSES: Record<KipGesture, Pose> = {
  rest: { r: { x: 232, y: -168 }, l: { x: -232, y: -168 }, rBend: 1, lBend: -1, rGlove: "open", lGlove: "open", lift: 0 },
  wave: { r: { x: 280, y: -500 }, l: { x: -232, y: -168 }, rBend: -0.6, lBend: -1, rGlove: "open", lGlove: "open", lift: 0 },
  point: { r: { x: 392, y: -330 }, l: { x: -232, y: -168 }, rBend: -0.3, lBend: -1, rGlove: "point", lGlove: "open", lift: 0 },
  shrug: { r: { x: 300, y: -360 }, l: { x: -300, y: -360 }, rBend: 1, lBend: -1, rGlove: "open", lGlove: "open", lift: -12 },
  toot: { r: { x: 236, y: -600 }, l: { x: -236, y: -600 }, rBend: -0.5, lBend: 0.5, rGlove: "open", lGlove: "open", lift: 22 },
};
const ARM_LEN = 240;
const LEG_LEN = 215;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: P, b: P, t: number) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

/** Mouth per Rhubarb shape (drawn centred at the mouth point). `w` half width, `t` upper lip rise, `b` jaw drop. */
type MouthSpec = { kind: "line"; d: string } | { kind: "open"; w: number; t: number; b: number; teeth?: number; tongue?: "low" | "up"; lip?: boolean } | { kind: "pucker" };
export const KIP_MOUTHS: Record<Viseme, MouthSpec> = {
  X: { kind: "line", d: "M-60,-8 Q0,42 60,-8" },
  A: { kind: "line", d: "M-46,6 Q0,16 46,6" },
  B: { kind: "open", w: 46, t: 2, b: 18, teeth: 12 },
  C: { kind: "open", w: 52, t: 6, b: 38, teeth: 13, tongue: "low" },
  D: { kind: "open", w: 58, t: 8, b: 66, teeth: 14, tongue: "low" },
  E: { kind: "open", w: 38, t: 12, b: 44, tongue: "low" },
  F: { kind: "pucker" },
  G: { kind: "open", w: 46, t: 2, b: 22, teeth: 20, lip: true },
  H: { kind: "open", w: 50, t: 6, b: 40, teeth: 10, tongue: "up" },
};

const KipMouth: React.FC<{ shape: Viseme; clip: string }> = ({ shape, clip }) => {
  const m = KIP_MOUTHS[shape];
  const ink = C.ink;
  if (m.kind === "line") {
    return (
      <g>
        <path d={m.d} stroke={ink} strokeWidth={9} fill="none" strokeLinecap="round" />
        {shape === "X" && <path d="M-70,-18 Q-62,-6 -58,4 M70,-18 Q62,-6 58,4" stroke={ink} strokeWidth={6} fill="none" strokeLinecap="round" />}
        {shape === "A" && <path d="M-54,-2 L-44,12 M54,-2 L44,12" stroke={ink} strokeWidth={6} fill="none" strokeLinecap="round" />}
      </g>
    );
  }
  if (m.kind === "pucker") {
    return (
      <g>
        <ellipse cx={0} cy={10} rx={30} ry={30} fill={C.rose} stroke={ink} strokeWidth={8} />
        <ellipse cx={0} cy={10} rx={12} ry={14} fill={ink} />
      </g>
    );
  }
  const { w, t, b } = m;
  const d = `M${-w},0 C${-w * 0.5},${-t} ${w * 0.5},${-t} ${w},0 C${w * 0.9},${b * 1.25} ${-w * 0.9},${b * 1.25} ${-w},0 Z`;
  return (
    <g>
      <defs><clipPath id={clip}><path d={d} /></clipPath></defs>
      <path d={d} fill={ink} />
      <g clipPath={`url(#${clip})`}>
        {m.tongue === "low" && <ellipse cx={0} cy={b * 0.95} rx={w * 0.62} ry={b * 0.45} fill={C.tongue} />}
        {m.tongue === "up" && <ellipse cx={0} cy={m.teeth ? m.teeth + 6 : 6} rx={w * 0.4} ry={12} fill={C.tongue} />}
        {m.teeth ? <rect x={-w} y={-t - 2} width={w * 2} height={m.teeth + t} fill={C.glove} /> : null}
        {m.teeth ? <path d={`M0,${-t} V${m.teeth - 2}`} stroke={ink} strokeWidth={3} /> : null}
      </g>
      {m.lip && <path d={`M${-w * 0.8},${b * 0.7} Q0,${b * 0.2} ${w * 0.8},${b * 0.7}`} stroke={C.rose} strokeWidth={10} fill="none" strokeLinecap="round" />}
      <path d={d} fill="none" stroke={ink} strokeWidth={7} strokeLinejoin="round" />
    </g>
  );
};

/** White four-finger glove (three fingers and a thumb, rolled cuff, three stitch lines), wrist at 0,0 pointing +x. */
const GloveShape: React.FC<{ kind: Glove; flipY: boolean }> = ({ kind, flipY }) => {
  const st = { fill: C.glove, stroke: C.ink, strokeWidth: 6, strokeLinejoin: "round" as const };
  const finger = (x: number, y: number, a: number, len: number, key: string) => <rect key={key} x={0} y={-10} width={len} height={20} rx={10} transform={`translate(${x} ${y}) rotate(${a})`} {...st} />;
  return (
    <g transform={flipY ? "scale(1 -1)" : undefined}>
      {kind === "open" ? (
        <>
          {finger(44, -14, -30, 40, "f1")}
          {finger(50, 0, -4, 42, "f2")}
          {finger(46, 14, 22, 38, "f3")}
          {finger(30, -18, -78, 30, "th")}
        </>
      ) : (
        <>
          {finger(50, -6, 0, 54, "f1")}
          <circle cx={62} cy={10} r={11} {...st} />
          <circle cx={56} cy={22} r={10} {...st} />
          {finger(30, -18, -64, 30, "th")}
        </>
      )}
      <ellipse cx={36} cy={0} rx={27} ry={27} {...st} />
      <path d="M20,-9 H38 M20,0 H40 M20,9 H38" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />
      <path d="M-4,-20 Q4,-31 16,-30 L16,30 Q4,31 -4,20 Z" {...st} />
    </g>
  );
};

/** Big round period shoe, ankle at 0,0, toe pointing `dir` (+1 right, -1 left). */
const Shoe: React.FC<{ dir: number }> = ({ dir }) => (
  <g transform={`scale(${dir} 1)`}>
    <ellipse cx={26} cy={22} rx={60} ry={30} fill={C.ink} />
    <ellipse cx={44} cy={10} rx={18} ry={8} fill={C.glove} opacity={0.85} transform="rotate(-12 44 10)" />
    <path d="M-28,44 H74" stroke={C.umber} strokeWidth={5} strokeLinecap="round" />
  </g>
);

/**
 * Kip, an original rubber-hose tea kettle: cream enamel body with an ink lid, knob, bail handle and spout, pie-cut
 * eyes, noodle arms in white four-finger gloves and bow legs in round shoes. Bounces on the beat all the time.
 * (x, y) is the ground point between the feet; at scale 1 Kip is about 620 px tall and the face about 240 px wide.
 *
 * Rig (shared contract `../rig`): talks from `mouth`/`visemes` (`scenes/lipsync.ts`, one mouth per Rhubarb shape),
 * blinks on the shared rhythm (`seed`), gestures `wave` | `point` | `shrug` | `toot` from `gestureAt` (eased in;
 * `hold` frames later it eases back to rest), walks from `x` to `walkTo` during `walk` (a footfall at every multiple
 * of PI of the walk phase), and looks `camera` | `left` | `right` | `up`. Motion is on the held clock (12 drawings/s);
 * the mouth follows the real frame.
 */
export const Kip: React.FC<RigProps<KipGesture, KipLook> & {
  x: number; y: number; scale?: number; from?: number; walkTo?: number; flip?: boolean; hold?: number; bounce?: boolean;
}> = ({ x, y, scale = 1, from = 0, walkTo, flip = false, hold, bounce = true, mouth, visemes, talking, blink = true, gesture = "rest", gestureAt = 0, walk, look = "camera", seed = 0 }) => {
  const { frame, hf, fps } = useHeld();
  const uid = useId().replace(/:/g, "");
  const pop = usePop(from, 8);
  const w = walkAt(walk, hf, fps);
  const cx = walk && walkTo !== undefined ? x + (walkTo - x) * w.progress : x;
  const dir = walk && walkTo !== undefined && walkTo < x ? -1 : 1;
  const g = gesture === "rest" ? 0 : gestureT(hf, gestureAt) * (hold !== undefined ? 1 - gestureT(hf, gestureAt + hold) : 1);
  const pose = POSES[gesture];
  const rest = POSES.rest;

  // Body motion: the constant bounce (or the walk bob), squash and stretch, and the gesture lift.
  const b = w.active ? 1 - Math.abs(Math.cos(w.phase)) : bounce ? bounceAt(hf, fps) : 0.5;
  const sq = squash(b, gesture === "toot" ? 0.07 + 0.05 * g : 0.07);
  const lift = -b * (w.active ? 26 : 18) - pose.lift * g + (1 - pop) * 40;
  const T = (p: P): P => ({ x: p.x * sq.sx, y: -200 + (p.y + 200) * sq.sy + lift });

  // Hands: blend rest -> gesture; the wave wags, the walk swings the arms against the legs.
  const swing = w.active ? Math.cos(w.phase) * 60 : 0;
  const wag = gesture === "wave" ? Math.sin((hf - gestureAt) / 2.2) * 34 * g : 0;
  const rHand = T({ x: lerp(rest.r.x, pose.r.x, g) + wag, y: lerp(rest.r.y, pose.r.y, g) - swing * (1 - g) });
  const lHand = T({ x: lerp(rest.l.x, pose.l.x, g), y: lerp(rest.l.y, pose.l.y, g) + swing * (1 - g) });
  const rArm = hosePath(T({ x: 168, y: -282 }), rHand, ARM_LEN, lerp(rest.rBend, pose.rBend, g));
  const lArm = hosePath(T({ x: -168, y: -282 }), lHand, ARM_LEN, lerp(rest.lBend, pose.lBend, g));

  // Feet: standing apart; walking lifts the swinging foot (feet both down at multiples of PI).
  const stride = w.active ? Math.sin(w.phase) : 0;
  const rFoot = { x: 74 + stride * 34, y: -34 - Math.max(0, stride) * 56 };
  const lFoot = { x: -74 + stride * 34, y: -34 - Math.max(0, -stride) * 56 };
  const rLeg = hosePath(T({ x: 62, y: -206 }), rFoot, LEG_LEN, -1);
  const lLeg = hosePath(T({ x: -62, y: -206 }), lFoot, LEG_LEN, 1);

  // Face: blink, look, mouth (real frame), lid rattle and steam while tooting.
  const shut = blink ? blinkAt(hf, fps, seed) : 0;
  const eyeSy = 1 - 0.92 * shut;
  const gaze = { camera: { x: 0, y: 6 }, left: { x: -12, y: 4 }, right: { x: 12, y: 4 }, up: { x: 0, y: -14 } }[look];
  const shape = visemeAt({ mouth, visemes, talking }, frame);
  const tootT = gesture === "toot" ? g : 0;
  const rattle = tootT * Math.abs(Math.sin((hf - gestureAt) / 1.6)) * 26;
  const steamOn = tootT > 0.4;

  const ink = { stroke: C.ink, strokeLinecap: "round" as const, fill: "none" };
  const glove = (arm: { end: number }, hand: P, kind: Glove) => {
    const flipY = Math.cos((arm.end * Math.PI) / 180) < -0.05;
    return <g transform={`translate(${hand.x} ${hand.y}) rotate(${arm.end})`}><GloveShape kind={kind} flipY={flipY} /></g>;
  };
  const sb = `translate(0 ${lift}) translate(0 -200) scale(${sq.sx} ${sq.sy}) translate(0 200)`;
  if (pop <= 0.001) return null;
  return (
    <Svg>
      <g transform={`translate(${cx} ${y}) scale(${scale * dir * (flip ? -1 : 1)} ${scale})`}>
        <ellipse cx={0} cy={4} rx={150 * (1.1 - 0.15 * b)} ry={18} fill={C.ink} opacity={0.22} />
        <path d={lLeg.d} {...ink} strokeWidth={24} />
        <path d={rLeg.d} {...ink} strokeWidth={24} />
        <g transform={`translate(${lFoot.x} ${lFoot.y})`}><Shoe dir={-1} /></g>
        <g transform={`translate(${rFoot.x} ${rFoot.y})`}><Shoe dir={1} /></g>
        <g transform={sb}>
          {/* bail handle, then body, spout, base band, lid and knob */}
          <path d="M-118,-432 C-150,-610 150,-610 118,-432" {...ink} strokeWidth={22} />
          <path d="M-140,-374 C-196,-382 -228,-412 -246,-452 L-274,-438 C-252,-380 -216,-312 -166,-300 Z" fill={C.ink} />
          <path d="M-140,-205 Q-180,-205 -174,-262 C-166,-362 -140,-442 -80,-462 Q0,-484 80,-462 C140,-442 166,-362 174,-262 Q180,-205 140,-205 Z" fill={C.enamel} stroke={C.ink} strokeWidth={11} />
          <path d="M112,-420 Q148,-360 150,-290" stroke={C.glove} strokeWidth={12} fill="none" strokeLinecap="round" opacity={0.95} />
          <rect x={-170} y={-236} width={340} height={40} rx={20} fill={C.ink} />
          <g transform={`translate(0 ${-rattle}) rotate(${tootT * Math.sin(hf) * 8} 0 -460)`}>
            <path d="M-100,-456 Q0,-536 100,-456 Z" fill={C.ink} />
            <rect x={-108} y={-466} width={216} height={18} rx={9} fill={C.ink} />
            <circle cx={0} cy={-512} r={21} fill={C.ink} />
            <circle cx={-6} cy={-518} r={6} fill={C.glove} />
          </g>
          {/* face */}
          {[-46, 46].map((ex) => (
            <g key={ex} transform={`translate(${ex} -378) scale(1 ${eyeSy})`}>
              <ellipse rx={42} ry={60} fill={C.glove} stroke={C.ink} strokeWidth={8} />
              {shut < 0.6 && <path d={piePath(gaze.x, gaze.y + 10, 21, 34, -55, 58)} fill={C.ink} />}
            </g>
          ))}
          {shut >= 0.6 && [-46, 46].map((ex) => <path key={ex} d={`M${ex - 36},-376 Q${ex},-356 ${ex + 36},-376`} {...ink} strokeWidth={8} />)}
          <circle cx={-104} cy={-298} r={24} fill={C.rose} opacity={0.7} />
          <circle cx={104} cy={-298} r={24} fill={C.rose} opacity={0.7} />
          <ellipse cx={0} cy={-312} rx={17} ry={12} fill={C.ink} />
          <circle cx={-5} cy={-316} r={4} fill={C.glove} />
          <g transform="translate(0 -272)"><KipMouth shape={shape} clip={`kipm${uid}`} /></g>
        </g>
        {/* arms over the body edge, then gloves */}
        <path d={lArm.d} {...ink} strokeWidth={20} />
        <path d={rArm.d} {...ink} strokeWidth={20} />
        {glove(lArm, lHand, pose.lGlove)}
        {glove(rArm, rHand, g > 0.5 ? pose.rGlove : "open")}
        {steamOn && [0, 1, 2].map((k) => {
          const t = (((hf - gestureAt) / fps) * 1.6 + k / 3) % 1;
          const tip = T({ x: -262, y: -452 });
          return (
            <g key={k} transform={`translate(${tip.x - 70 * t} ${tip.y - 150 * t - rattle * 0.3}) scale(${0.4 + t})`} opacity={(1 - t) * Math.min(1, (tootT - 0.4) * 3)}>
              <circle cx={-14} cy={0} r={22} fill={C.enamel} stroke={C.ink} strokeWidth={5} />
              <circle cx={14} cy={-8} r={26} fill={C.enamel} stroke={C.ink} strokeWidth={5} />
              <ellipse cx={0} cy={2} rx={24} ry={14} fill={C.enamel} />
            </g>
          );
        })}
      </g>
    </Svg>
  );
};
