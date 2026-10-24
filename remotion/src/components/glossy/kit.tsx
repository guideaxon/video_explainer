/**
 * Glossy style bundle kit: building blocks for vertical (1080x1920, 9:16, mobile-first) product explainers in a
 * glossy toy "3D look" drawn entirely in SVG and CSS: radial/linear gradients for volume, crisp white specular
 * shapes, a soft rim light, gradient contact shadows (no blur filters), saturated candy colours on a pastel
 * studio sweep, chunky rounded shapes and springy motion (overshoot pops, squash and stretch, wobble).
 * Star: `Toy`, an original round vinyl collectible ("Pomo", placeholder name) that talks, blinks, gestures and
 * walks on the shared rig contract. See docs/glossy_video_style_guide.md.
 *
 * Layout: eyebrow + headline in the top third (y 200 to 560), the visual below (y 600 to 1500).
 * Safe zone: y 160 to 1500, x 60 to 1020.
 * Gradient ids: every SVG component builds its own <defs> with ids from `useId` (made url-safe by `safeId`), so
 * two toys, pedestals or charts on one frame never share or clobber a gradient.
 */
import React, { createContext, useContext, useId } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { blinkAt, gestureT, hash01, mouthAt, visemeAt, walkAt } from "../rig";
import type { RigProps, Viseme } from "../rig";
import { alpha, armPose, dropHeight, feetAt, mix, safeId, shade, squashAt, tint } from "./gloss";
import type { ToyGesture } from "./gloss";

export { mix, tint, shade, alpha, squashAt, armPose, feetAt, TOY_GESTURES } from "./gloss";
export type { ToyGesture } from "./gloss";

const fredoka = loadFredoka("normal", { weights: ["600", "700"], subsets: ["latin"] });
const nunito = loadNunito("normal", { weights: ["600", "800"], subsets: ["latin"] });
export const HEAD = fredoka.fontFamily;
export const UI = nunito.fontFamily;

export const W = 1080;
export const H = 1920;

/** Candy palette: saturated, never neon. */
export const C = {
  cherry: "#ff4766", tangerine: "#ff8a2a", lemon: "#ffd23a", mint: "#2fd39b", sky: "#3c9dff", grape: "#8b5cff",
  bubblegum: "#ff74c4", cream: "#fff6ec", white: "#ffffff", plum: "#2a0c33",
};
const CANDY = [C.cherry, C.tangerine, C.lemon, C.mint, C.sky, C.grape, C.bubblegum];

/** Pastel studio sweeps. `accent` is dark enough to read as headline text on the wall colour. */
export const TONES = {
  peach: { wall: "#ffece3", floor: "#ffcdb9", ink: "#3b1640", accent: "#f2304f", dim: "#8a5866" },
  lilac: { wall: "#f2ecff", floor: "#d6c6ff", ink: "#2b1858", accent: "#7a45f5", dim: "#6c5e98" },
  mint: { wall: "#e4fbf1", floor: "#b9eed8", ink: "#0f3d38", accent: "#0f9e74", dim: "#4b7a70" },
  sky: { wall: "#e7f4ff", floor: "#bfdfff", ink: "#132a57", accent: "#2479f0", dim: "#57709a" },
  butter: { wall: "#fff7d9", floor: "#ffe39a", ink: "#45260c", accent: "#f06a0f", dim: "#86673e" },
} as const;
export type ToneName = keyof typeof TONES;
export type Tone = (typeof TONES)[ToneName];
const ToneCtx = createContext<Tone>(TONES.peach);
export const useTone = () => useContext(ToneCtx);

const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });
/** Springy entrance (overshoots about 15 percent, then settles). */
export const usePop = (delay: number, damping = 9) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 170, mass: 0.7 } });
};
/** Unique, url-safe gradient id prefix for one component instance. */
export const useGlossId = () => safeId(useId());

/* ------------------------------------------------------------------ surfaces and type */

/** Scene surface: a seamless pastel studio sweep (wall fading into a curved floor) with a soft key spot. */
export const GScene: React.FC<{ tone: ToneName; children?: React.ReactNode }> = ({ tone, children }) => {
  const T = TONES[tone];
  const fade = prog(useCurrentFrame(), 0, 5);
  return (
    <ToneCtx.Provider value={T}>
      <AbsoluteFill style={{ fontFamily: HEAD, opacity: fade, overflow: "hidden", background: `linear-gradient(180deg, ${tint(T.wall, 0.4)} 0%, ${T.wall} 42%, ${mix(T.wall, T.floor, 0.55)} 62%, ${T.floor} 80%, ${shade(T.floor, 0.06)} 100%)` }}>
        <AbsoluteFill style={{ background: "radial-gradient(ellipse 62% 34% at 50% 60%, rgba(255,255,255,0.6), rgba(255,255,255,0) 72%)" }} />
        <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 70% at 50% 45%, rgba(0,0,0,0) 62%, ${alpha(T.ink, 0.07)} 100%)` }} />
        {children}
      </AbsoluteFill>
    </ToneCtx.Provider>
  );
};

/** Glossy text: a darker "thickness" copy below, a gradient face and a crisp white gloss band on the top third. */
export const GlossText: React.FC<{ children: string; color: string; depth?: number }> = ({ children, color, depth = 8 }) => {
  const face: React.CSSProperties = { WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" };
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span aria-hidden style={{ position: "absolute", left: 0, top: depth, color: shade(color, 0.4) }}>{children}</span>
      <span style={{ position: "relative", ...face, backgroundImage: `linear-gradient(180deg, ${tint(color, 0.3)} 0%, ${color} 50%, ${shade(color, 0.14)} 100%)` }}>{children}</span>
      <span aria-hidden style={{ position: "absolute", left: 0, top: 0, ...face, backgroundImage: "linear-gradient(180deg, rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.4) 33%, rgba(255,255,255,0) 34%)" }}>{children}</span>
    </span>
  );
};

/** Small glossy pill label above the headline. */
export const Eyebrow: React.FC<{ children: string; y?: number; from?: number; color?: string }> = ({ children, y = 196, from = 2, color }) => {
  const T = useTone();
  const p = usePop(from, 11);
  const dot = color ?? T.accent;
  return (
    <div style={{ position: "absolute", left: 80, top: y, display: "flex", alignItems: "center", gap: 14, padding: "10px 26px 10px 14px", borderRadius: 40, background: "linear-gradient(180deg, #ffffff 0%, #fbf7ff 60%, #efe8f6 100%)", boxShadow: `0 10px 18px ${alpha(T.ink, 0.12)}, inset 0 -4px 0 rgba(0,0,0,0.05)`, transform: `scale(${p})`, transformOrigin: "left center", opacity: Math.min(1, p * 2) }}>
      <div style={{ width: 34, height: 34, borderRadius: 17, background: `radial-gradient(circle at 35% 30%, ${tint(dot, 0.65)} 0%, ${dot} 45%, ${shade(dot, 0.3)} 100%)` }} />
      <div style={{ fontFamily: UI, fontWeight: 800, fontSize: 28, letterSpacing: 4, color: T.ink, textTransform: "uppercase" }}>{children}</div>
    </div>
  );
};

/** Two-line headline in rounded bold type. Lines starting with `*` are glossy accent text. Each line pops in. */
export const Headline: React.FC<{ lines: string[]; y?: number; size?: number; from?: number }> = ({ lines, y = 272, size = 112, from = 4 }) => {
  const T = useTone();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", left: 80, width: 940, top: y, fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1.06, letterSpacing: -1 }}>
      {lines.map((line, i) => {
        const accent = line.startsWith("*");
        const p = spring({ frame: frame - from - i * 5, fps, config: { damping: 9, stiffness: 180, mass: 0.7 } });
        return (
          <div key={i} style={{ color: T.ink, opacity: Math.min(1, p * 2), transform: `translateY(${(1 - p) * 40}px) scale(${0.7 + 0.3 * p})`, transformOrigin: "left bottom", whiteSpace: "nowrap" }}>
            {accent ? <GlossText color={T.accent} depth={Math.round(size / 14)}>{line.slice(1)}</GlossText> : line}
          </div>
        );
      })}
    </div>
  );
};

export const Sub: React.FC<{ children: React.ReactNode; y: number; from?: number; size?: number; x?: number; w?: number; align?: "left" | "center" }> = ({ children, y, from = 22, size = 40, x = 80, w = 920, align = "left" }) => {
  const T = useTone();
  const p = prog(useCurrentFrame(), from, from + 10);
  return <div style={{ position: "absolute", left: x, width: w, top: y, fontFamily: UI, fontWeight: 600, fontSize: size, lineHeight: 1.3, color: T.dim, opacity: p, textAlign: align, transform: `translateY(${(1 - p) * 16}px)` }}>{children}</div>;
};

export const SampleTag: React.FC = () => (
  <div style={{ position: "absolute", left: 0, width: W, top: 1530, textAlign: "center", fontFamily: UI, fontWeight: 800, fontSize: 22, letterSpacing: 6, color: "rgba(60,30,60,0.45)" }}>SAMPLE CONTENT</div>
);

/** Full-frame SVG layer (1080x1920 user units) for the toy, pedestal, box, props and charts. */
export const Stage: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", fontFamily: HEAD }}>{children}</svg>
);

/* ------------------------------------------------------------------ SVG gloss pieces */

/** Volume gradient for a glossy solid: lit top-left, saturated middle, plum-shaded bottom-right. */
const Volume: React.FC<{ id: string; c: string; cx?: number; cy?: number }> = ({ id, c, cx = 0.36, cy = 0.3 }) => (
  <radialGradient id={id} cx={cx} cy={cy} r={0.8} fx={cx - 0.04} fy={cy - 0.06}>
    <stop offset="0" stopColor={tint(c, 0.55)} />
    <stop offset="0.35" stopColor={c} />
    <stop offset="0.82" stopColor={shade(c, 0.28)} />
    <stop offset="1" stopColor={shade(c, 0.45)} />
  </radialGradient>
);
/** Rim light: transparent on the lit side, a warm white band on the bottom-right edge (used as a stroke). */
const Rim: React.FC<{ id: string }> = ({ id }) => (
  <linearGradient id={id} x1="0.15" y1="0.1" x2="0.9" y2="1">
    <stop offset="0.5" stopColor="#fff4ea" stopOpacity={0} />
    <stop offset="0.86" stopColor="#fff4ea" stopOpacity={0.55} />
    <stop offset="1" stopColor="#ffffff" stopOpacity={0.9} />
  </linearGradient>
);
/** Soft contact shadow as a radial gradient (no blur filter: free to render). */
const ShadowGrad: React.FC<{ id: string; o?: number }> = ({ id, o = 0.34 }) => (
  <radialGradient id={id}>
    <stop offset="0" stopColor={C.plum} stopOpacity={o} />
    <stop offset="0.55" stopColor={C.plum} stopOpacity={o * 0.45} />
    <stop offset="1" stopColor={C.plum} stopOpacity={0} />
  </radialGradient>
);
const SheenGrad: React.FC<{ id: string }> = ({ id }) => (
  <radialGradient id={id}>
    <stop offset="0" stopColor="#fff" stopOpacity={0.75} />
    <stop offset="1" stopColor="#fff" stopOpacity={0} />
  </radialGradient>
);

/** A glossy sphere (gradient, rim, crisp highlight and glint). Plain SVG elements, needs ids from the caller. */
const Sphere: React.FC<{ cx: number; cy: number; r: number; fill: string; rim?: string }> = ({ cx, cy, r, fill, rim }) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={fill} />
    {rim && <circle cx={cx} cy={cy} r={r - 2} fill="none" stroke={rim} strokeWidth={Math.max(2, r * 0.12)} />}
    <ellipse cx={cx - r * 0.36} cy={cy - r * 0.42} rx={r * 0.34} ry={r * 0.2} fill="#fff" opacity={0.92} transform={`rotate(-32 ${cx - r * 0.36} ${cy - r * 0.42})`} />
    <circle cx={cx + r * 0.38} cy={cy + r * 0.34} r={r * 0.09} fill="#fff" opacity={0.7} />
  </g>
);

/* ------------------------------------------------------------------ the toy */

export type ToyLook = "camera" | "left" | "right" | "up";
type MouthShape = { line?: string; rx?: number; ry?: number; teeth?: number; tongue?: "low" | "up"; lip?: boolean; ring?: boolean };
/** One mouth decal per Rhubarb shape (see the rig header for the sounds). */
export const TOY_MOUTH: Record<Viseme, MouthShape> = {
  X: { line: "M-30,-8 Q0,18 30,-8" }, // rest: a smile
  A: { line: "M-24,2 Q0,7 24,2" }, // M B P: pressed lips
  B: { rx: 26, ry: 9, teeth: 0.7 }, // most consonants: slightly open, teeth
  C: { rx: 28, ry: 18, teeth: 0.4, tongue: "low" }, // EH AE: open
  D: { rx: 31, ry: 29, teeth: 0.28, tongue: "low" }, // AA: wide open
  E: { rx: 20, ry: 22, tongue: "low" }, // AO ER: rounded
  F: { rx: 11, ry: 13, ring: true }, // UW OW W: puckered
  G: { rx: 27, ry: 12, teeth: 0.9, lip: true }, // F V: teeth on the lower lip
  H: { rx: 27, ry: 18, tongue: "up" }, // L: tongue up
};
const GAZE: Record<ToyLook, [number, number]> = { camera: [0, 0], left: [-12, 2], right: [12, 2], up: [0, -10] };
const MOUTH_IN = "#4a0c24";
const TONGUE = "#ff6f8f";

/**
 * Pomo, the glossy vinyl toy (original placeholder character): an egg-shaped body with a face decal, stubby capsule
 * arms and legs, chunky cream sneakers and a gumball antenna. (x, y) is the ground point between the feet; at
 * scale 1 it is about 550 px tall. Use inside `<Stage>` (or `<ToyBox>`).
 * Entrances (`enter` at `from`): "pop" (spring overshoot), "drop" (falls in and squashes), "rise" (shoots up out of
 * a ToyBox and lands with a squash), "none".
 * Rig: talks from `mouth`/`visemes` (`scenes/lipsync.ts`, one mouth decal per Rhubarb shape), blinks on the shared
 * rhythm (`seed`), gestures `wave`/`cheer`/`point`/`shrug` from `gestureAt`, looks `camera`/`left`/`right`/`up`, and
 * walks from `x` to `walkTo` during `walk` (a footfall at every multiple of PI, squash on each step, waddle).
 */
export const Toy: React.FC<RigProps<ToyGesture, ToyLook> & {
  x: number; y: number; scale?: number; from?: number; enter?: "pop" | "drop" | "rise" | "none"; walkTo?: number;
  color?: string; accent?: string; shadow?: boolean;
}> = ({
  x, y, scale = 1, from = 0, enter = "pop", walkTo, color = C.cherry, accent = C.lemon, shadow = true,
  mouth, visemes, talking, blink = true, gesture = "rest", gestureAt = 0, walk, look = "camera", seed = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const id = useGlossId();
  const t = frame - from;
  const T = t / fps;

  // Entrance: lift (px above the ground), stretch while flying, squash on landing.
  let lift = 0;
  let k = 1;
  let stretch = 1;
  let landAt = Infinity;
  let visible = true;
  if (enter === "pop") {
    k = spring({ frame: t, fps, config: { damping: 8, stiffness: 170, mass: 0.7 } });
    visible = t >= 0;
  } else if (enter === "drop") {
    lift = dropHeight(T, 1100, 0.45);
    stretch = T < 0.45 ? 1 + 0.16 * Math.min(1, Math.max(0, T) / 0.45) : 1;
    landAt = from + 0.45 * fps;
    visible = t >= 0;
  } else if (enter === "rise") {
    if (T < 0.3) {
      const u = Math.max(0, T) / 0.3;
      lift = -460 + 640 * (1 - (1 - u) * (1 - u));
      stretch = 1 + 0.18 * (1 - u);
    } else lift = dropHeight(T - 0.3, 180, 0.28);
    landAt = from + 0.58 * fps;
    visible = t >= 0;
  }
  const land = squashAt((frame - landAt) / fps, 0.24);

  // Walk: moves from x to walkTo; feet land at multiples of PI; a small squash on each footfall.
  const wk = walkAt(walk, frame, fps);
  const cx = walk && walkTo !== undefined ? x + (walkTo - x) * wk.progress : x;
  const dir = walkTo !== undefined && walkTo < x ? -1 : 1;
  const ft = wk.active ? feetAt(wk.phase) : { lx: 0, rx: 0, ly: 0, ry: 0 };
  const bob = wk.active ? Math.abs(Math.sin(wk.phase)) * 18 : 0;
  const step = wk.active ? 1 - 0.05 * (1 - Math.abs(Math.sin(wk.phase))) : 1;
  const waddle = wk.active ? Math.sin(wk.phase) * 4 : 0;

  // Gesture, idle breathing and wobble, talk bounce.
  const g = gesture === "rest" ? 0 : gestureT(frame, gestureAt);
  const pose = armPose(gesture, g, frame - gestureAt);
  const hopLand = gesture === "cheer" ? squashAt((frame - gestureAt - 16) / fps, 0.14) : { sx: 1, sy: 1 };
  const rig = { mouth, visemes, talking };
  const open = mouthAt(rig, frame);
  const m = TOY_MOUTH[visemeAt(rig, frame)];
  const breathe = 1 + 0.012 * Math.sin(frame / 13 + seed);
  const sy = stretch * land.sy * hopLand.sy * step * breathe * (1 + 0.02 * open);
  const sx = (1 / stretch) * land.sx * hopLand.sx * (2 - step);
  const wobble = 1.3 * Math.sin(frame / 27 + seed * 1.7);
  const rot = wobble + waddle + pose.lean;
  const up = lift + bob + pose.hop;
  const closed = blink ? blinkAt(frame, fps, seed) : 0;
  const gaze = GAZE[look] ?? GAZE.camera;
  const swing = 7 * Math.sin(frame / 10 + seed) + rot * 1.6 + (1 - sy) * 90 - waddle * 2; // antenna lags behind
  const brow = gesture === "shrug" || gesture === "cheer" ? 14 * g : 0;

  const body = "M0,-432 C112,-432 172,-352 172,-246 C172,-140 106,-70 0,-70 C-106,-70 -172,-140 -172,-246 C-172,-352 -112,-432 0,-432 Z";
  const leg = (hx: number, fx: number, fy: number) => {
    const dx = fx - hx;
    const dy = fy - -104;
    const len = Math.hypot(dx, dy);
    const deg = (Math.atan2(-dx, dy) * 180) / Math.PI;
    return <rect x={-25} y={0} width={50} height={len} rx={25} fill={`url(#${id}-limb)`} transform={`translate(${hx} -104) rotate(${deg})`} />;
  };
  const arm = (side: 1 | -1, a: number) => (
    <g transform={`translate(${148 * side} -232) rotate(${-a * side})`}>
      <rect x={-27} y={-6} width={54} height={120} rx={27} fill={`url(#${id}-limb)`} />
      <rect x={-27} y={-6} width={54} height={120} rx={27} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={5} />
      <Sphere cx={0} cy={118} r={35} fill={`url(#${id}-body)`} rim={`url(#${id}-rim)`} />
    </g>
  );
  const fL = { x: -62 + ft.lx * dir, y: -28 - ft.ly };
  const fR = { x: 62 + ft.rx * dir, y: -28 - ft.ry };
  const shadowR = 150 * scale * (1 - Math.min(0.55, Math.max(0, up) / 700));

  return (
    <g transform={`translate(${cx} ${y})`} opacity={visible ? 1 : 0}>
      <defs>
        <Volume id={`${id}-body`} c={color} />
        <Volume id={`${id}-limb`} c={shade(color, 0.08)} cx={0.3} cy={0.25} />
        <Volume id={`${id}-ant`} c={accent} />
        <Volume id={`${id}-foot`} c={C.cream} cx={0.4} cy={0.25} />
        <radialGradient id={`${id}-eye`} cx={0.38} cy={0.32} r={0.75}>
          <stop offset="0" stopColor="#5a3a6a" />
          <stop offset="0.6" stopColor="#1c0b25" />
          <stop offset="1" stopColor="#0c0410" />
        </radialGradient>
        <Rim id={`${id}-rim`} />
        <ShadowGrad id={`${id}-shadow`} />
        <SheenGrad id={`${id}-sheen`} />
        {!m.line && (
          <clipPath id={`${id}-mouth`}>
            <ellipse rx={m.rx} ry={m.ry} />
          </clipPath>
        )}
      </defs>
      {shadow && up > -60 && <ellipse cx={0} cy={0} rx={shadowR} ry={shadowR * 0.17} fill={`url(#${id}-shadow)`} opacity={k} />}
      <g transform={`translate(0 ${-up}) rotate(${rot}) scale(${k * scale * sx} ${k * scale * sy})`}>
        {/* antenna (behind the body), lags and wobbles */}
        <g transform={`translate(0 -420) rotate(${swing})`}>
          <path d="M0,0 Q18,-48 8,-96" fill="none" stroke={shade(accent, 0.25)} strokeWidth={14} strokeLinecap="round" />
          <path d="M-3,-8 Q12,-48 4,-88" fill="none" stroke={tint(accent, 0.5)} strokeWidth={4} strokeLinecap="round" opacity={0.8} />
          <Sphere cx={8} cy={-106} r={30} fill={`url(#${id}-ant)`} rim={`url(#${id}-rim)`} />
        </g>
        {/* legs and sneakers */}
        {leg(-56, fL.x, fL.y)}
        {leg(56, fR.x, fR.y)}
        {[fL, fR].map((f, i) => (
          <g key={i}>
            <ellipse cx={f.x + (i ? 6 : -6)} cy={f.y} rx={58} ry={30} fill={`url(#${id}-foot)`} />
            <ellipse cx={f.x + (i ? 6 : -6)} cy={f.y} rx={56} ry={28} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={4} />
            <ellipse cx={f.x - 18} cy={f.y - 12} rx={18} ry={7} fill="#fff" opacity={0.95} />
            <path d={`M${f.x - 50},${f.y + 10} Q${f.x},${f.y + 26} ${f.x + 50},${f.y + 10}`} fill="none" stroke={accent} strokeWidth={7} strokeLinecap="round" />
          </g>
        ))}
        {/* body */}
        <path d={body} fill={`url(#${id}-body)`} />
        <path d={body} fill="none" stroke={`url(#${id}-rim)`} strokeWidth={8} />
        {/* belly star decal */}
        <path d="M0,-174 L9,-155 L30,-153 L14,-139 L19,-118 L0,-129 L-19,-118 L-14,-139 L-30,-153 L-9,-155 Z" fill={C.cream} opacity={0.92} />
        {/* face decal */}
        <g transform={`translate(${gaze[0]} ${gaze[1]})`}>
          {[-1, 1].map((s) => (
            <path key={`b${s}`} d={`M${s * 40},${-350 - brow} Q${s * 64},${-366 - brow} ${s * 88},${-352 - brow}`} fill="none" stroke={shade(color, 0.6)} strokeWidth={8} strokeLinecap="round" />
          ))}
          {[-1, 1].map((s) => {
            const ex = s * 64;
            const ry = 37 * (1 - 0.92 * closed);
            return closed > 0.6 ? (
              <path key={s} d={`M${ex - 26},-292 Q${ex},-278 ${ex + 26},-292`} fill="none" stroke="#1c0b25" strokeWidth={8} strokeLinecap="round" />
            ) : (
              <g key={s}>
                <ellipse cx={ex} cy={-292} rx={29} ry={ry} fill={`url(#${id}-eye)`} />
                <ellipse cx={ex - 9} cy={-292 - ry * 0.4} rx={10} ry={10 * (ry / 37)} fill="#fff" />
                <circle cx={ex + 10} cy={-292 + ry * 0.38} r={4.5} fill="#fff" opacity={0.85} />
              </g>
            );
          })}
          {[-1, 1].map((s) => <ellipse key={`c${s}`} cx={s * 112} cy={-234} rx={25} ry={14} fill={C.bubblegum} opacity={0.5} />)}
          <g transform="translate(0 -214)">
            {m.line ? (
              <path d={m.line} fill="none" stroke={MOUTH_IN} strokeWidth={9} strokeLinecap="round" />
            ) : (
              <>
                {m.ring && <ellipse rx={(m.rx ?? 0) + 6} ry={(m.ry ?? 0) + 6} fill={shade(color, 0.3)} />}
                <ellipse rx={m.rx} ry={m.ry} fill={MOUTH_IN} />
                <g clipPath={`url(#${id}-mouth)`}>
                  {m.tongue === "low" && <ellipse cy={(m.ry ?? 0) * 0.62} rx={(m.rx ?? 0) * 0.66} ry={(m.ry ?? 0) * 0.55} fill={TONGUE} />}
                  {m.tongue === "up" && <ellipse cy={-(m.ry ?? 0) * 0.3} rx={(m.rx ?? 0) * 0.42} ry={(m.ry ?? 0) * 0.5} fill={TONGUE} />}
                  {m.teeth && <rect x={-(m.rx ?? 0)} y={-(m.ry ?? 0)} width={(m.rx ?? 0) * 2} height={(m.ry ?? 0) * m.teeth} fill="#fff" />}
                  {m.lip && <ellipse cy={(m.ry ?? 0) * 1.05} rx={(m.rx ?? 0) * 0.95} ry={(m.ry ?? 0) * 0.62} fill={shade(color, 0.12)} />}
                </g>
              </>
            )}
          </g>
        </g>
        {/* gloss over the decal: broad sheen, crisp highlight, edge streak and glint */}
        <ellipse cx={-70} cy={-360} rx={78} ry={44} fill={`url(#${id}-sheen)`} transform="rotate(-32 -70 -360)" />
        <ellipse cx={-84} cy={-374} rx={34} ry={15} fill="#fff" opacity={0.95} transform="rotate(-34 -84 -374)" />
        <circle cx={-36} cy={-404} r={7} fill="#fff" opacity={0.9} />
        <path d="M-156,-292 Q-150,-344 -122,-376" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" opacity={0.45} />
        <path d="M150,-160 Q132,-112 92,-90" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" opacity={0.35} />
        {/* arms in front */}
        {arm(-1, pose.l)}
        {arm(1, pose.r)}
      </g>
    </g>
  );
};

/* ------------------------------------------------------------------ props */

/**
 * Turntable pedestal: a glossy cylinder whose top plate turns (a marker dot and a ring of lights move round).
 * (x, y) is the centre of the top surface: stand a Toy at the same (x, y). Rises in with a spring at `from`.
 */
export const Pedestal: React.FC<{ x: number; y: number; w?: number; h?: number; color?: string; from?: number; spin?: number }> = ({ x, y, w = 480, h = 86, color = C.sky, from = 0, spin = 1 }) => {
  const frame = useCurrentFrame();
  const id = useGlossId();
  const p = usePop(from, 11);
  const rx = w / 2;
  const ry = w * 0.12;
  const turn = frame * 0.045 * spin;
  const lights = Array.from({ length: 14 }, (_, i) => turn + (i / 14) * Math.PI * 2);
  return (
    <g transform={`translate(${x} ${y + (1 - p) * 260})`} opacity={Math.min(1, p * 2)}>
      <defs>
        <linearGradient id={`${id}-side`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(color, 0.45)} />
          <stop offset="0.18" stopColor={shade(color, 0.12)} />
          <stop offset="0.33" stopColor={tint(color, 0.4)} />
          <stop offset="0.5" stopColor={color} />
          <stop offset="0.85" stopColor={shade(color, 0.3)} />
          <stop offset="1" stopColor={shade(color, 0.5)} />
        </linearGradient>
        <radialGradient id={`${id}-top`} cx={0.38} cy={0.3} r={0.8}>
          <stop offset="0" stopColor={tint(color, 0.7)} />
          <stop offset="0.5" stopColor={tint(color, 0.35)} />
          <stop offset="1" stopColor={color} />
        </radialGradient>
        <ShadowGrad id={`${id}-shadow`} o={0.3} />
      </defs>
      <ellipse cx={0} cy={h + 8} rx={rx * 1.12} ry={ry * 1.3} fill={`url(#${id}-shadow)`} />
      <path d={`M${-rx},0 L${-rx},${h} A${rx},${ry} 0 0 0 ${rx},${h} L${rx},0 Z`} fill={`url(#${id}-side)`} />
      <path d={`M${-rx * 0.86},${h * 0.22} L${-rx * 0.86},${h * 0.8}`} stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.55} />
      {lights.map((a, i) => {
        const c = Math.cos(a);
        if (c <= 0.05) return null;
        return <circle key={i} cx={rx * 0.94 * Math.sin(a)} cy={h * 0.5 + ry * c} r={4 + 6 * c} fill={i % 2 ? C.white : C.lemon} opacity={0.5 + 0.5 * c} />;
      })}
      <ellipse cx={0} cy={0} rx={rx} ry={ry} fill={`url(#${id}-top)`} />
      <ellipse cx={0} cy={0} rx={rx - 4} ry={ry - 2} fill="none" stroke="#fff" strokeWidth={5} opacity={0.7} />
      <ellipse cx={0} cy={2} rx={rx * 0.74} ry={ry * 0.7} fill="none" stroke={shade(color, 0.1)} strokeWidth={3} opacity={0.5} />
      <circle cx={rx * 0.6 * Math.sin(turn * 2)} cy={ry * 0.6 * Math.cos(turn * 2)} r={9} fill={C.white} opacity={0.85} />
    </g>
  );
};

/**
 * Glossy gift box the toy pops out of. (x, y) is the centre of the box's top edge. The lid flies off at `openAt`.
 * Children (a `<Toy enter="rise" from={openAt} />` standing at about y + 140) are drawn between the inside and the
 * front panel and clipped at the box bottom, so the toy rises out of the box.
 */
export const ToyBox: React.FC<{ x: number; y: number; w?: number; h?: number; color?: string; ribbon?: string; label?: string; from?: number; openAt?: number; children?: React.ReactNode }> = ({
  x, y, w = 560, h = 400, color = C.sky, ribbon = C.lemon, label = "NEW!", from = 0, openAt = 18, children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const id = useGlossId();
  const p = usePop(from, 10);
  const q = squashAt((frame - openAt) / fps, 0.06); // the box jolts when the lid pops
  const u = prog(frame, openAt, openAt + 22);
  const shake = frame < openAt && frame > openAt - 12 ? Math.sin(frame * 2.2) * 4 : 0;
  const hw = w / 2;
  return (
    <g transform={`translate(${x} ${y + (1 - p) * 300}) rotate(${shake})`} opacity={Math.min(1, p * 2)}>
      <defs>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint(color, 0.35)} />
          <stop offset="0.45" stopColor={color} />
          <stop offset="1" stopColor={shade(color, 0.35)} />
        </linearGradient>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tint(color, 0.5)} />
          <stop offset="0.6" stopColor={tint(color, 0.1)} />
          <stop offset="1" stopColor={shade(color, 0.2)} />
        </linearGradient>
        <linearGradient id={`${id}-ribbon`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={shade(ribbon, 0.2)} />
          <stop offset="0.4" stopColor={tint(ribbon, 0.35)} />
          <stop offset="1" stopColor={shade(ribbon, 0.25)} />
        </linearGradient>
        <ShadowGrad id={`${id}-shadow`} o={0.3} />
        <clipPath id={`${id}-clip`}>
          <rect x={-2000} y={-3000} width={4000} height={3000 + h - 30} />
        </clipPath>
      </defs>
      <ellipse cx={0} cy={h + 4} rx={hw * 1.15} ry={44} fill={`url(#${id}-shadow)`} />
      {/* inside of the box, seen from slightly above */}
      <path d={`M${-hw + 34},-46 L${hw - 34},-46 L${hw},0 L${-hw},0 Z`} fill={shade(color, 0.55)} />
      <g clipPath={`url(#${id}-clip)`}>
        <g transform={`translate(${-x} ${-y})`}>{children}</g>
      </g>
      <g transform={`translate(0 ${h}) scale(${q.sx} ${q.sy}) translate(0 ${-h})`}>
        <rect x={-hw} y={0} width={w} height={h} rx={30} fill={`url(#${id}-front)`} />
        <rect x={-hw + 3} y={3} width={w - 6} height={h - 6} rx={28} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={5} />
        <rect x={-46} y={0} width={92} height={h} fill={`url(#${id}-ribbon)`} />
        <rect x={-hw + 28} y={30} width={34} height={h * 0.62} rx={17} fill="#fff" opacity={0.42} />
        <rect x={-hw + 74} y={30} width={12} height={h * 0.4} rx={6} fill="#fff" opacity={0.3} />
        <g transform={`translate(0 ${h * 0.58}) rotate(-6)`}>
          <rect x={-150} y={-56} width={300} height={112} rx={56} fill={C.white} />
          <rect x={-150} y={-56} width={300} height={56} rx={28} fill="#fff" opacity={0.6} />
          <text x={0} y={24} textAnchor="middle" fontFamily={HEAD} fontWeight={700} fontSize={70} fill={shade(color, 0.2)}>{label}</text>
        </g>
      </g>
      {/* lid: flies up, spins and leaves to the right */}
      <g transform={`translate(${u * 420} ${-u * 520 + u * u * 260}) rotate(${u * 42})`} opacity={1 - Math.max(0, (u - 0.75) / 0.25)}>
        <rect x={-hw - 16} y={-62} width={w + 32} height={70} rx={22} fill={`url(#${id}-lid)`} />
        <rect x={-46} y={-62} width={92} height={70} fill={`url(#${id}-ribbon)`} />
        <ellipse cx={-hw + 70} cy={-44} rx={60} ry={9} fill="#fff" opacity={0.7} />
        <g transform="translate(0 -66)">
          <ellipse cx={-48} cy={-18} rx={52} ry={28} fill={`url(#${id}-ribbon)`} transform="rotate(-20 -48 -18)" />
          <ellipse cx={48} cy={-18} rx={52} ry={28} fill={`url(#${id}-ribbon)`} transform="rotate(20 48 -18)" />
          <circle cx={0} cy={-8} r={22} fill={tint(ribbon, 0.2)} />
          <ellipse cx={-56} cy={-30} rx={18} ry={7} fill="#fff" opacity={0.8} transform="rotate(-20 -56 -30)" />
        </g>
      </g>
    </g>
  );
};

/** A floating glossy candy sphere (decor or a feature icon). Pops in at `from`, then bobs. */
export const Ball: React.FC<{ x: number; y: number; r?: number; color?: string; from?: number; float?: number; label?: string }> = ({ x, y, r = 60, color = C.mint, from = 0, float = 1, label }) => {
  const frame = useCurrentFrame();
  const id = useGlossId();
  const p = usePop(from, 8);
  const bob = Math.sin((frame + x) / 18) * 10 * float;
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${p})`} opacity={Math.min(1, p * 2)}>
      <defs>
        <Volume id={`${id}-v`} c={color} />
        <Rim id={`${id}-r`} />
      </defs>
      <Sphere cx={0} cy={0} r={r} fill={`url(#${id}-v)`} rim={`url(#${id}-r)`} />
      {label && <text x={0} y={r * 0.3} textAnchor="middle" fontFamily={HEAD} fontWeight={700} fontSize={r * 0.95} fill="#fff" stroke={shade(color, 0.3)} strokeWidth={3} paintOrder="stroke">{label}</text>}
    </g>
  );
};

/**
 * Confetti burst of glossy candy (spheres and capsules) from (x, y) at frame `at`: thrown upward in a fan, falls
 * under gravity, fades out after about 1.5 s. Deterministic (seeded hash).
 */
export const Sprinkles: React.FC<{ x: number; y: number; at?: number; count?: number; spread?: number; seed?: number }> = ({ x, y, at = 0, count = 26, spread = 1, seed = 3 }) => {
  const frame = useCurrentFrame();
  const id = useGlossId();
  const t = frame - at;
  if (t < 0 || t > 52) return null;
  return (
    <g>
      <defs>{CANDY.map((c, i) => <Volume key={i} id={`${id}-${i}`} c={c} />)}</defs>
      {Array.from({ length: count }, (_, i) => {
        const a = -Math.PI / 2 + (hash01(seed, i) - 0.5) * Math.PI * 1.3 * spread;
        const v = 16 + hash01(seed + 7, i) * 22;
        const px = x + Math.cos(a) * v * t;
        const py = y + Math.sin(a) * v * t + 0.75 * t * t;
        const s = 10 + hash01(seed + 13, i) * 14;
        const ci = Math.floor(hash01(seed + 21, i) * CANDY.length);
        const o = 1 - Math.max(0, (t - 34) / 18);
        const spin = t * (hash01(seed + 5, i) - 0.5) * 24;
        return i % 3 === 0 ? (
          <g key={i} transform={`translate(${px} ${py}) rotate(${spin})`} opacity={o}>
            <rect x={-s * 1.1} y={-s * 0.45} width={s * 2.2} height={s * 0.9} rx={s * 0.45} fill={`url(#${id}-${ci})`} />
            <rect x={-s * 0.8} y={-s * 0.3} width={s * 1.1} height={s * 0.22} rx={s * 0.11} fill="#fff" opacity={0.8} />
          </g>
        ) : (
          <g key={i} opacity={o}>
            <circle cx={px} cy={py} r={s * 0.7} fill={`url(#${id}-${ci})`} />
            <circle cx={px - s * 0.24} cy={py - s * 0.26} r={s * 0.2} fill="#fff" opacity={0.9} />
          </g>
        );
      })}
    </g>
  );
};

/**
 * Glossy capsule bar chart (SVG, inside `<Stage>`). Bars spring up with overshoot, staggered; values count up
 * above them. (x, y) is the top-left of the chart box; labels sit below the floor line at y + h.
 */
export const GlossBars: React.FC<{ x: number; y: number; w?: number; h?: number; bars: { label: string; value: number; color: string }[]; suffix?: string; from?: number }> = ({
  x, y, w = 920, h = 640, bars, suffix = "", from = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = useTone();
  const id = useGlossId();
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = 46;
  const bw = Math.min(180, (w - gap * (bars.length - 1)) / Math.max(1, bars.length));
  const left = x + (w - (bw * bars.length + gap * (bars.length - 1))) / 2;
  const floor = y + h;
  const top = 90; // room for the value label
  return (
    <g>
      <defs>
        {bars.map((b, i) => (
          <linearGradient key={i} id={`${id}-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={shade(b.color, 0.3)} />
            <stop offset="0.3" stopColor={tint(b.color, 0.35)} />
            <stop offset="0.55" stopColor={b.color} />
            <stop offset="1" stopColor={shade(b.color, 0.38)} />
          </linearGradient>
        ))}
        <ShadowGrad id={`${id}-sh`} o={0.28} />
      </defs>
      {bars.map((b, i) => {
        const s = spring({ frame: frame - from - i * 6, fps, config: { damping: 9, stiffness: 120, mass: 0.8 } });
        const full = Math.max(bw, ((h - top) * b.value) / max);
        const bh = Math.max(0, full * s);
        const bx = left + i * (bw + gap);
        const shown = interpolate(prog(frame, from + i * 6, from + i * 6 + 30), [0, 1], [0, b.value]);
        const dec = Number.isInteger(b.value) ? 0 : 1;
        return (
          <g key={i}>
            <ellipse cx={bx + bw / 2} cy={floor + 6} rx={bw * 0.75} ry={18} fill={`url(#${id}-sh)`} />
            {bh > 2 && (
              <g>
                <rect x={bx} y={floor - bh} width={bw} height={bh} rx={Math.min(bw / 2, bh / 2)} fill={`url(#${id}-${i})`} />
                <rect x={bx + bw * 0.18} y={floor - bh + Math.min(bh * 0.25, 30)} width={bw * 0.14} height={Math.max(0, bh - Math.min(bh * 0.25, 30) * 2)} rx={bw * 0.07} fill="#fff" opacity={0.55} />
                <ellipse cx={bx + bw * 0.42} cy={floor - bh + Math.min(bw * 0.24, bh * 0.3)} rx={bw * 0.2} ry={Math.min(bw * 0.08, bh * 0.1)} fill="#fff" opacity={0.85} />
              </g>
            )}
            <text x={bx + bw / 2} y={floor - bh - 24} textAnchor="middle" fontFamily={HEAD} fontWeight={700} fontSize={56} fill={T.ink} opacity={Math.min(1, s * 2)}>{`${shown.toFixed(dec)}${suffix}`}</text>
            <text x={bx + bw / 2} y={floor + 70} textAnchor="middle" fontFamily={UI} fontWeight={800} fontSize={34} fill={T.dim}>{b.label}</text>
          </g>
        );
      })}
    </g>
  );
};

/* ------------------------------------------------------------------ HTML building blocks */

const glossBg = (c: string) => `linear-gradient(180deg, ${tint(c, 0.4)} 0%, ${c} 52%, ${shade(c, 0.12)} 100%)`;
const sphereBg = (c: string) => `radial-gradient(circle at 34% 28%, ${tint(c, 0.7)} 0%, ${c} 42%, ${shade(c, 0.32)} 100%)`;

/**
 * Chunky 3D candy button: gradient face, a darker base for thickness, a crisp gloss band. Centred on `cx`.
 * `pressAt` pushes it down for a few frames (a click), then it springs back.
 */
export const GlossButton: React.FC<{ y: number; cx?: number; label: string; color?: string; from?: number; pressAt?: number; size?: number }> = ({ y, cx = W / 2, label, color = C.cherry, from = 10, pressAt, size = 60 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePop(from, 8);
  const tp = pressAt === undefined ? -1 : frame - pressAt;
  const press = tp < 0 ? 0 : tp < 4 ? tp / 4 : 1 - spring({ frame: tp - 4, fps, config: { damping: 8, stiffness: 200 } });
  const depth = Math.round(size * 0.22);
  const dy = Math.max(0, Math.min(1, press)) * depth * 0.8;
  return (
    <div style={{ position: "absolute", left: cx, top: y, transform: `translateX(-50%) scale(${p})`, opacity: Math.min(1, p * 2) }}>
      <div style={{ position: "relative", padding: `${size * 0.42}px ${size * 0.95}px`, borderRadius: size, background: glossBg(color), boxShadow: `0 ${depth - dy}px 0 ${shade(color, 0.38)}, 0 ${depth - dy + 22}px 34px ${alpha(C.plum, 0.25)}, inset 0 -6px 12px ${alpha(shade(color, 0.4), 0.5)}`, transform: `translateY(${dy}px)`, fontFamily: HEAD, fontWeight: 700, fontSize: size, color: "#fff", whiteSpace: "nowrap", textShadow: `0 3px 0 ${shade(color, 0.3)}` }}>
        <div style={{ position: "absolute", left: "6%", right: "6%", top: 6, height: "42%", borderRadius: size, background: "linear-gradient(180deg, rgba(255,255,255,0.75), rgba(255,255,255,0.12))" }} />
        <span style={{ position: "relative" }}>{label}</span>
      </div>
    </div>
  );
};

/** White glossy chip with a candy sphere dot. Bounces in with a little wobble, then floats. */
export const Chip: React.FC<{ x: number; y: number; label: string; color?: string; from?: number; size?: number }> = ({ x, y, label, color = C.mint, from = 12, size = 40 }) => {
  const frame = useCurrentFrame();
  const T = useTone();
  const p = usePop(from, 8);
  const float = Math.sin((frame + x * 0.7) / 20) * 7;
  return (
    <div style={{ position: "absolute", left: x, top: y + float, display: "flex", alignItems: "center", gap: 18, padding: `${size * 0.36}px ${size * 0.8}px ${size * 0.36}px ${size * 0.36}px`, borderRadius: size * 2, background: "linear-gradient(180deg, #ffffff 0%, #fbf8ff 55%, #ece4f3 100%)", boxShadow: `0 16px 28px ${alpha(T.ink, 0.16)}, inset 0 -5px 0 rgba(0,0,0,0.06), inset 0 3px 0 #fff`, transform: `scale(${p}) rotate(${(1 - p) * -14}deg)`, transformOrigin: "left center", opacity: Math.min(1, p * 2), whiteSpace: "nowrap" }}>
      <div style={{ position: "relative", width: size * 1.35, height: size * 1.35, borderRadius: size, background: sphereBg(color), boxShadow: `inset 0 -3px 6px ${alpha(shade(color, 0.4), 0.5)}` }}>
        <div style={{ position: "absolute", left: "20%", top: "14%", width: "36%", height: "22%", borderRadius: "50%", background: "rgba(255,255,255,0.9)", transform: "rotate(-30deg)" }} />
      </div>
      <div style={{ fontFamily: HEAD, fontWeight: 600, fontSize: size, color: T.ink }}>{label}</div>
    </div>
  );
};

/** Round glossy coin badge with a number or short text, e.g. a step number. Centred on (x, y). */
export const Badge: React.FC<{ x: number; y: number; text: string; color?: string; size?: number; from?: number }> = ({ x, y, text, color = C.grape, size = 150, from = 10 }) => {
  const p = usePop(from, 7);
  const frame = useCurrentFrame();
  const wob = Math.sin((frame - from) / 3) * 10 * Math.max(0, 1 - (frame - from) / 30) * (frame > from ? 1 : 0);
  return (
    <div style={{ position: "absolute", left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size, background: sphereBg(color), boxShadow: `0 ${size * 0.1}px 0 ${shade(color, 0.4)}, 0 ${size * 0.18}px ${size * 0.2}px ${alpha(C.plum, 0.22)}, inset 0 -${size * 0.06}px ${size * 0.08}px ${alpha(shade(color, 0.5), 0.6)}`, transform: `scale(${p}) rotate(${wob}deg)`, opacity: Math.min(1, p * 2), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", left: "18%", top: "10%", width: "46%", height: "26%", borderRadius: "50%", background: "linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.2))", transform: "rotate(-24deg)" }} />
      <div style={{ position: "relative", fontFamily: HEAD, fontWeight: 700, fontSize: size * 0.52, color: "#fff", textShadow: `0 ${size * 0.03}px 0 ${shade(color, 0.35)}` }}>{text}</div>
    </div>
  );
};

/** Big glossy number that counts up (about 36 frames) and pops when it lands, with a label pill. Centred on `cx`. */
export const Stat: React.FC<{ y: number; cx?: number; value: number; prefix?: string; suffix?: string; decimals?: number; label: string; color?: string; size?: number; from?: number }> = ({
  y, cx = W / 2, value, prefix = "", suffix = "", decimals = 0, label, color = C.grape, size = 230, from = 8,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const T = useTone();
  const p = usePop(from, 9);
  const v = interpolate(prog(frame, from + 4, from + 40), [0, 1], [0, value]);
  const land = spring({ frame: frame - from - 40, fps, config: { damping: 7, stiffness: 220, mass: 0.6 } });
  const thump = frame >= from + 40 ? 1 + 0.08 * Math.sin(land * Math.PI) : 1;
  return (
    <div style={{ position: "absolute", left: cx, top: y, transform: `translateX(-50%) scale(${p * thump})`, transformOrigin: "50% 60%", opacity: Math.min(1, p * 2), textAlign: "center", whiteSpace: "nowrap" }}>
      <div style={{ fontFamily: HEAD, fontWeight: 700, fontSize: size, lineHeight: 1.05, letterSpacing: -4, fontVariantNumeric: "tabular-nums" }}>
        <GlossText color={color} depth={Math.round(size / 18)}>{`${prefix}${v.toFixed(decimals)}${suffix}`}</GlossText>
      </div>
      <div style={{ display: "inline-block", marginTop: 18, padding: "12px 34px", borderRadius: 40, background: "linear-gradient(180deg, #ffffff 0%, #f6f0fb 100%)", boxShadow: `0 10px 20px ${alpha(T.ink, 0.12)}`, fontFamily: UI, fontWeight: 800, fontSize: 34, color: T.ink }}>{label}</div>
    </div>
  );
};
