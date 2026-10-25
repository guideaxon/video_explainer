/**
 * Neon style bundle kit: building blocks for vertical (1080x1920, 9:16, mobile-first) neon synthwave videos.
 * Stroke-only shapes in hot pink, cyan, purple and orange on a deep purple-black night, every stroke glowing
 * (cheap stacked copies, see ./glow.tsx), a moving perspective grid floor, a striped setting sun, wireframe
 * mountains, a starfield, scanlines, occasional deterministic tube flicker and chrome / neon-outline 80s type.
 * Star: Tubo, an original neon-tube synth robot (./character.tsx). See docs/neon_video_style_guide.md.
 *
 * Layout: eyebrow + headline in the top third (y 200 to 560), the visual below (y 600 to 1500).
 * Safe zone: y 160 to 1500, x 60 to 1020. Horizon default y 1180 (the floor below it is background only).
 */
import React, { createContext, useContext, useId } from "react";
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadOrbitron } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadVT } from "@remotion/google-fonts/VT323";
import { loadFont as loadTilt } from "@remotion/google-fonts/TiltNeon";
import { NEON, circlePath, flickerAt, gridRaysPath, gridRows, litSegments, mountainRange, powerOn, rectPath, starfield, sunStripes, vhsTime } from "./core";
import { Neon } from "./glow";

export { Neon } from "./glow";
export { Tubo, TUBO_GESTURES, TUBO_MOUTH } from "./character";
export type { TuboGesture, TuboLook } from "./character";
export { NEON, flickerAt, powerOn } from "./core";

const orbitron = loadOrbitron("normal", { weights: ["700", "900"], subsets: ["latin"] });
const vt = loadVT("normal", { weights: ["400"], subsets: ["latin"] });
const tilt = loadTilt("normal", { weights: ["400"], subsets: ["latin"] });
/** Chrome / outline headline and number face. */
export const DISPLAY = orbitron.fontFamily;
/** VHS on-screen-display and label face. */
export const OSD = vt.fontFamily;
/** Neon-sign face for sub lines and signs. */
export const SIGN = tilt.fontFamily;

export const W = 1080;
export const H = 1920;
export const C = NEON;

const ease = Easing.bezier(0.2, 0.7, 0.2, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const prog = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: ease });
export const usePop = (delay: number, damping = 14) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping, stiffness: 150 } });
};
const useSvgId = (name: string) => `${name}${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

const HorizonCtx = createContext(1180);

/**
 * Scene surface: the night sky (deep purple-black at the top warming to a magenta haze at the horizon), a twinkling
 * starfield above the horizon, then the children, then scanlines, a slow VHS roll band and a vignette on top.
 */
export const NScene: React.FC<{ horizon?: number; stars?: number; children?: React.ReactNode }> = ({ horizon = 1180, stars = 90, children }) => {
  const frame = useCurrentFrame();
  const fade = prog(frame, 0, 5);
  const field = React.useMemo(() => starfield(stars, W, horizon - 60, 5), [stars, horizon]);
  const roll = ((frame * 7) % (H + 400)) - 200;
  return (
    <HorizonCtx.Provider value={horizon}>
      <AbsoluteFill style={{ background: NEON.night, opacity: fade, overflow: "hidden", fontFamily: DISPLAY }}>
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${NEON.night} 0px, ${NEON.night} ${horizon * 0.3}px, ${NEON.dusk} ${horizon * 0.72}px, ${NEON.haze} ${horizon}px, ${NEON.night} ${horizon + 2}px)` }} />
        <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
          {field.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i % 7 === 0 ? NEON.cyan : NEON.white} opacity={0.35 + 0.55 * (1 - s.tw * (0.5 + 0.5 * Math.sin(frame / 8 + s.phase)))} />
          ))}
        </svg>
        {children}
        <AbsoluteFill style={{ backgroundImage: "repeating-linear-gradient(180deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 2px, transparent 2px, transparent 5px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", left: 0, top: roll, width: W, height: 140, background: "linear-gradient(180deg, transparent, rgba(255,240,255,0.05), transparent)", pointerEvents: "none" }} />
        <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(5,0,12,0.65) 100%)", pointerEvents: "none" }} />
      </AbsoluteFill>
    </HorizonCtx.Provider>
  );
};

/**
 * The synthwave horizon: striped sun (gaps scroll down), wireframe mountains, glowing horizon line and the
 * perspective grid floor sliding toward the viewer. `sunSet` sinks the sun below the horizon (outro): a fixed
 * 0..1 or `{ from, to }` scene frames to set over;
 * `speed` is floor depth units per frame (0.04 cruise, 0.12 driving); `sway` shifts the vanishing rays sideways.
 */
export const Horizon: React.FC<{
  y?: number; sun?: boolean; sunR?: number; sunX?: number; sunSet?: number | { from: number; to: number }; mountains?: boolean; speed?: number; sway?: number; from?: number;
}> = ({ y, sun = true, sunR = 250, sunX = W / 2, sunSet = 0, mountains = true, speed = 0.04, sway = 0, from = 0 }) => {
  const frame = useCurrentFrame();
  const ctxY = useContext(HorizonCtx);
  const hy = y ?? ctxY;
  const grad = useSvgId("sun");
  const halo = useSvgId("halo");
  const mask = useSvgId("stripes");
  const floor = useSvgId("floor");
  const fadeId = useSvgId("fade");
  const rise = prog(frame, from, from + 24);
  const set = typeof sunSet === "number" ? sunSet : interpolate(frame, [sunSet.from, sunSet.to], [0, 1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const cy = hy - sunR * 0.55 + (1 - rise) * sunR * 0.6 + set * sunR * 1.6;
  const stripes = sunStripes(frame);
  const range = React.useMemo(() => mountainRange(W, hy, 230, 3), [hy]);
  const rows = gridRows(frame - from, hy, H, speed);
  const rays = gridRaysPath(W / 2, hy, H, 150, W, sway);
  const hum = flickerAt(frame, 21, 0.25);
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={NEON.yellow} />
          <stop offset="0.45" stopColor={NEON.orange} />
          <stop offset="1" stopColor={NEON.pink} />
        </linearGradient>
        <radialGradient id={halo}>
          <stop offset="0.55" stopColor={NEON.pink} stopOpacity={0.35} />
          <stop offset="1" stopColor={NEON.pink} stopOpacity={0} />
        </radialGradient>
        <mask id={mask} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
          <circle cx={sunX} cy={cy} r={sunR} fill="#fff" />
          {stripes.map((s, i) => <rect key={i} x={sunX - sunR} y={cy + s.y * sunR} width={sunR * 2} height={s.h * sunR} fill="#000" />)}
        </mask>
        <linearGradient id={floor} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a0433" />
          <stop offset="1" stopColor={NEON.night} />
        </linearGradient>
        <linearGradient id={fadeId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a0640" stopOpacity={1} />
          <stop offset="1" stopColor="#2a0640" stopOpacity={0} />
        </linearGradient>
      </defs>
      {sun && (
        <g>
          <circle cx={sunX} cy={cy} r={sunR * 1.55} fill={`url(#${halo})`} />
          <circle cx={sunX} cy={cy} r={sunR} fill={`url(#${grad})`} mask={`url(#${mask})`} />
        </g>
      )}
      {mountains && (
        <g>
          <path d={range.fill} fill={NEON.night} />
          <Neon d={range.wires} color={NEON.purple} w={2} glow={0.5} core={false} />
          <Neon d={range.ridge} color={NEON.cyan} w={3.5} glow={0.8} />
        </g>
      )}
      <rect x={0} y={hy} width={W} height={H - hy} fill={`url(#${floor})`} />
      <Neon d={rays} color={NEON.pink} w={2.5} glow={0.7} core={false} on={0.85} />
      {rows.map((r, i) => (
        <Neon key={i} d={`M0 ${r.y.toFixed(1)}H${W}`} color={NEON.pink} w={1.2 + 3.4 / Math.pow(r.z, 0.7)} glow={0.8} core={r.z < 4} on={r.alpha} />
      ))}
      <rect x={0} y={hy} width={W} height={150} fill={`url(#${fadeId})`} />
      <Neon d={`M0 ${hy}H${W}`} color={NEON.orange} w={4} glow={1.2} on={0.7 + 0.3 * hum} />
    </svg>
  );
};

/** `> LABEL` in VHS on-screen-display type, cyan, with a rare tube flicker. */
export const Eyebrow: React.FC<{ children: React.ReactNode; y?: number; from?: number; color?: string }> = ({ children, y = 200, from = 2, color = NEON.cyan }) => {
  const frame = useCurrentFrame();
  const on = powerOn(frame, from) * flickerAt(frame, 11, 0.2);
  return (
    <div style={{ position: "absolute", left: 80, top: y, fontFamily: OSD, fontSize: 52, letterSpacing: 8, color, opacity: 0.25 + 0.75 * on, textTransform: "uppercase", textShadow: `3px 0 0 rgba(255,43,214,0.55), -3px 0 0 rgba(34,230,255,0.45)` }}>
      {`▶ ${children}`}
    </div>
  );
};

/**
 * Text drawn as a glowing neon outline: stacked copies of the glyph outline (wide faint, mid, tube, white core),
 * no blur filter. `on` dims it (flicker).
 */
export const NeonText: React.FC<{ children: string; size: number; color?: string; on?: number; font?: string; weight?: number; style?: React.CSSProperties }> = ({
  children, size, color = NEON.pink, on = 1, font = DISPLAY, weight = 900, style,
}) => {
  const t = Math.max(2, size * 0.03);
  const lit = Math.max(0, Math.min(1, on));
  const layer = (stroke: number, c: string, opacity: number): React.CSSProperties => ({
    position: "absolute", left: 0, top: 0, WebkitTextStroke: `${stroke}px ${c}`, color: "transparent", opacity, whiteSpace: "nowrap",
  });
  return (
    <span style={{ position: "relative", display: "inline-block", fontFamily: font, fontWeight: weight, fontSize: size, lineHeight: 1.1, whiteSpace: "nowrap", ...style }}>
      <span style={{ visibility: "hidden" }}>{children}</span>
      <span style={layer(t * 4.2, color, 0.13 * lit)}>{children}</span>
      <span style={layer(t * 2.2, color, 0.35 * lit)}>{children}</span>
      <span style={layer(t, color, 0.3 + 0.7 * lit)}>{children}</span>
      <span style={layer(Math.max(1, t * 0.35), "#ffffff", 0.85 * lit)}>{children}</span>
    </span>
  );
};

/** Orbitron 900 is about 0.92 em per caps character. */
const fitSize = (text: string, size: number, width: number) => Math.min(size, Math.floor(width / (Math.max(1, text.length) * 0.92)));

/**
 * 80s headline. Plain lines are CHROME (sky-to-pink gradient with a horizon line through the middle, a hard pink
 * extrusion); lines starting with `*` are NEON outline tubes (pink, with a rare flicker). Each line switches on
 * like a CRT (vertical squash) 6 frames after the last. Lines too long for 940 px shrink to fit.
 */
export const Headline: React.FC<{ lines: string[]; y?: number; size?: number; from?: number; color?: string; align?: "left" | "center" }> = ({
  lines, y = 270, size = 112, from = 4, color = NEON.pink, align = "left",
}) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 70, width: 940, top: y, textAlign: align, textTransform: "uppercase" }}>
      {lines.map((line, i) => {
        const neon = line.startsWith("*");
        const text = neon ? line.slice(1) : line;
        const fs = fitSize(text, size, 940);
        const p = prog(frame, from + i * 6, from + i * 6 + 8);
        const sweep = interpolate(frame, [from, from + 60], [-60, 160], clamp);
        return (
          <div key={i} style={{ position: "relative", height: fs * 1.18, opacity: p > 0 ? 1 : 0, transform: `scaleY(${0.05 + 0.95 * p}) skewX(-8deg)`, transformOrigin: "50% 50%" }}>
            {neon ? (
              <NeonText size={fs} color={color} on={powerOn(frame, from + i * 6) * flickerAt(frame, 3 + i, 0.3)}>{text}</NeonText>
            ) : (
              <span style={{ position: "relative", display: "inline-block", fontFamily: DISPLAY, fontWeight: 900, fontSize: fs, lineHeight: 1.1, whiteSpace: "nowrap" }}>
                <span style={{ position: "absolute", left: 0, top: 7, color: NEON.pink, opacity: 0.9 }}>{text}</span>
                <span style={{ position: "absolute", left: 0, top: 3, color: NEON.purple }}>{text}</span>
                <span style={{
                  position: "relative",
                  backgroundImage: `linear-gradient(100deg, transparent ${sweep - 12}%, rgba(255,255,255,0.9) ${sweep}%, transparent ${sweep + 12}%), linear-gradient(180deg, #f4fbff 0%, #8fd3ff 40%, #ffffff 50%, #3a145e 52%, #b0399a 70%, #ffc6ee 100%)`,
                  WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextStroke: "1.5px rgba(255,255,255,0.85)",
                }}>{text}</span>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const Sub: React.FC<{ children: React.ReactNode; y: number; from?: number; size?: number; color?: string; align?: "left" | "center" }> = ({ children, y, from = 22, size = 46, color = NEON.dim, align = "left" }) => {
  const p = prog(useCurrentFrame(), from, from + 10);
  return <div style={{ position: "absolute", left: 80, width: 920, top: y, fontFamily: SIGN, fontSize: size, lineHeight: 1.25, color, opacity: p, textAlign: align }}>{children}</div>;
};

/** Neon stat counter: a glowing frame, a VHS label and a big neon-outline number that counts up in about 36 frames. */
export const NeonCounter: React.FC<{ x: number; y: number; w?: number; label: string; value: number; prefix?: string; suffix?: string; decimals?: number; color?: string; from?: number }> = ({
  x, y, w = 920, label, value, prefix = "", suffix = "", decimals = 0, color = NEON.cyan, from = 6,
}) => {
  const frame = useCurrentFrame();
  const on = powerOn(frame, from);
  const v = interpolate(prog(frame, from + 4, from + 40), [0, 1], [0, value]);
  const text = `${prefix}${v.toFixed(decimals)}${suffix}`;
  const final = `${prefix}${value.toFixed(decimals)}${suffix}`;
  const h = 400;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: on > 0 ? 1 : 0 }}>
      <svg width={w + 40} height={h + 40} style={{ position: "absolute", left: -20, top: -20, overflow: "visible" }}>
        <Neon d={rectPath(20, 20, w, h, 36)} color={color} w={6} on={on} />
        <Neon d={`M${60} ${110}H${w - 20}`} color={NEON.purple} w={3} on={on} glow={0.6} core={false} />
      </svg>
      <div style={{ position: "absolute", left: 44, top: 22, fontFamily: OSD, fontSize: 50, letterSpacing: 6, color: NEON.white, opacity: on, textTransform: "uppercase" }}>{label}</div>
      <div style={{ position: "absolute", left: 0, width: w, top: 130, textAlign: "center" }}>
        <NeonText size={fitSize(final, 190, w - 80)} color={color} on={on}>{text}</NeonText>
      </div>
    </div>
  );
};

export type EqBar = { label: string; value: number; color?: string };
/**
 * Graphic-equaliser bar chart: each bar is a stack of neon segment outlines that light from the bottom (one per
 * frame-step, staggered), a peak cap that hovers just above, a VHS value label on top and the label below. The lit
 * count is exact (value / max of `rows`), so the chart reads as data, not decoration.
 */
export const EqBars: React.FC<{ x: number; y: number; w?: number; h?: number; bars: EqBar[]; from?: number; rows?: number; unit?: string }> = ({
  x, y, w = 920, h = 760, bars, from = 6, rows = 14, unit = "",
}) => {
  const frame = useCurrentFrame();
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = 34;
  const bw = (w - gap * (bars.length - 1)) / bars.length;
  const top = 70;
  const base = h - 80;
  const seg = (base - top) / rows;
  const palette = [NEON.cyan, NEON.purple, NEON.pink, NEON.orange, NEON.yellow];
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h }}>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <Neon d={`M-10 ${base + 10}H${w + 10}`} color={NEON.purple} w={3} glow={0.6} core={false} />
        {bars.map((b, i) => {
          const t = prog(frame, from + i * 5, from + i * 5 + 30);
          const n = litSegments(b.value, max, rows, t);
          const color = b.color ?? palette[i % palette.length];
          const bx = i * (bw + gap);
          let lit = "";
          let dark = "";
          for (let k = 0; k < rows; k++) {
            const d = rectPath(bx + 6, base - (k + 1) * seg + 4, bw - 12, seg - 8, 5);
            if (k < n) lit += d;
            else dark += d;
          }
          const capY = base - n * seg - 10 - 6 * Math.abs(Math.sin((frame - from) / 7 + i));
          return (
            <g key={i}>
              <path d={dark} fill="none" stroke={color} strokeWidth={1.5} opacity={0.12} />
              {n > 0 && <Neon d={lit} color={color} w={3.5} glow={0.8} />}
              {n > 0 && <Neon d={`M${bx + 10} ${capY}H${bx + bw - 10}`} color={NEON.white} w={3} glow={0.7} core={false} />}
            </g>
          );
        })}
      </svg>
      {bars.map((b, i) => {
        const t = prog(frame, from + i * 5, from + i * 5 + 30);
        const n = litSegments(b.value, max, rows, t);
        const bx = i * (bw + gap);
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: bx, width: bw, top: base - n * seg - 74, textAlign: "center", fontFamily: OSD, fontSize: 46, color: NEON.white, opacity: t }}>{`${Number((b.value * t).toFixed(1))}${unit}`}</div>
            <div style={{ position: "absolute", left: bx - 10, width: bw + 20, top: base + 22, textAlign: "center", fontFamily: OSD, fontSize: 42, letterSpacing: 2, color: NEON.dim, textTransform: "uppercase" }}>{b.label}</div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** Neon outline cassette tape: two reels that spin, a tape window and a label you write on. (x, y) top-left. */
export const Cassette: React.FC<{ x: number; y: number; w?: number; label: string; side?: string; color?: string; from?: number }> = ({
  x, y, w = 760, label, side = "A", color = NEON.pink, from = 6,
}) => {
  const frame = useCurrentFrame();
  const on = powerOn(frame, from);
  const pop = usePop(from);
  const s = w / 760;
  const spin = (frame - from) * 6;
  const reel = (cx: number) => (
    <g transform={`translate(${cx} 268) rotate(${spin})`}>
      <Neon d={`${circlePath(0, 0, 46)}${circlePath(0, 0, 18)}M0 -18V-46M15.6 9L39.8 23M-15.6 9L-39.8 23`} color={NEON.cyan} w={4} on={on} />
    </g>
  );
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: 480 * s, transform: `scale(${0.85 + 0.15 * pop})`, transformOrigin: "50% 50%", opacity: on > 0 ? 1 : 0 }}>
      <svg width={w} height={480 * s} viewBox="0 0 760 480" style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <Neon d={rectPath(10, 10, 740, 460, 30)} color={color} w={6} on={on} fill={NEON.night} />
        <Neon d={rectPath(60, 50, 640, 290, 18)} color={NEON.purple} w={3.5} on={on} glow={0.7} core={false} />
        <Neon d={rectPath(190, 218, 380, 100, 50)} color={NEON.white} w={3} on={on} glow={0.5} core={false} />
        <Neon d="M232 314Q380 296 528 314" color={NEON.orange} w={3} on={on} glow={0.6} core={false} />
        {reel(262)}
        {reel(498)}
        <Neon d="M150 470L190 380H570L610 470" color={color} w={4.5} on={on} glow={0.8} />
        <Neon d={`${circlePath(250, 425, 9)}${circlePath(510, 425, 9)}${circlePath(40, 40, 7)}${circlePath(720, 40, 7)}${circlePath(40, 440, 7)}${circlePath(720, 440, 7)}`} color={NEON.purple} w={3} on={on} glow={0.5} core={false} />
      </svg>
      <div style={{ position: "absolute", left: 90 * s, top: 70 * s, width: 580 * s, display: "flex", alignItems: "baseline", justifyContent: "space-between", opacity: on }}>
        <span style={{ fontFamily: SIGN, fontSize: 64 * s, color: NEON.white, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "clip", maxWidth: 470 * s }}>{label}</span>
        <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 70 * s, color: NEON.yellow }}>{side}</span>
      </div>
      <div style={{ position: "absolute", left: 90 * s, top: 154 * s, width: 580 * s, height: 3, background: NEON.dim, opacity: 0.35 * on }} />
    </div>
  );
};

/**
 * VHS on-screen-display chip: blinking `▶ PLAY` (or REC / REW / FF), tape speed and a running counter, in VT323
 * with a red/cyan colour fringe (offset copies, no blur). (x, y) top-left.
 */
export const VhsChip: React.FC<{ x: number; y: number; mode?: "PLAY" | "REC" | "REW" | "FF" | "PAUSE"; startSeconds?: number; from?: number }> = ({
  x, y, mode = "PLAY", startSeconds = 0, from = 4,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = prog(frame, from, from + 6);
  const icon = { PLAY: "▶", REC: "●", REW: "◀◀", FF: "▶▶", PAUSE: "❚❚" }[mode];
  const blinkOn = Math.floor((frame - from) / 15) % 2 === 0;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity: p, fontFamily: OSD, fontSize: 58, lineHeight: 1, color: NEON.white, textShadow: "3px 0 0 rgba(255,43,214,0.7), -3px 0 0 rgba(34,230,255,0.6)", display: "flex", gap: 28, alignItems: "center", padding: "14px 26px", border: `3px solid rgba(255,246,255,0.6)`, borderRadius: 14, background: "rgba(11,1,24,0.55)" }}>
      <span style={{ color: mode === "REC" ? "#ff4b6e" : NEON.white, opacity: blinkOn ? 1 : 0.15 }}>{`${icon} ${mode}`}</span>
      <span style={{ color: NEON.dim }}>SP</span>
      <span>{vhsTime(Math.max(0, frame - from), fps, startSeconds)}</span>
    </div>
  );
};

/** Neon sign: a glowing rounded frame around a line of Tilt Neon text (quotes, the pitch, the takeaway). */
export const Sign: React.FC<{ x: number; y: number; w?: number; children: string; color?: string; from?: number; size?: number }> = ({
  x, y, w = 920, children, color = NEON.cyan, from = 8, size = 64,
}) => {
  const frame = useCurrentFrame();
  const on = powerOn(frame, from) * flickerAt(frame, 31, 0.25);
  const lines = Math.max(1, Math.ceil((children.length * size * 0.5) / (w - 100)));
  const h = Math.round(lines * size * 1.25 + 100);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: frame >= from ? 1 : 0 }}>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <Neon d={rectPath(4, 4, w - 8, h - 8, 40)} color={color} w={6} on={on} fill="rgba(11,1,24,0.82)" />
      </svg>
      <div style={{ position: "absolute", left: 50, top: 50, width: w - 100, fontFamily: SIGN, fontSize: size, lineHeight: 1.25, color: NEON.white, opacity: 0.3 + 0.7 * on, textShadow: `0 0 2px #fff, 0 0 12px ${color}` }}>{children}</div>
    </div>
  );
};

/**
 * Rear view of an original neon wedge sports car, driving toward the horizon: between `from` and `to` it climbs
 * from the bottom of the frame toward the vanishing point and shrinks. Taillights flicker on.
 */
export const Car: React.FC<{ from?: number; to?: number; x?: number; y0?: number; y1?: number; scale0?: number; scale1?: number; color?: string }> = ({
  from = 0, to = 90, x = W / 2, y0 = 1700, y1, scale0 = 1.25, scale1 = 0.35, color = NEON.cyan,
}) => {
  const frame = useCurrentFrame();
  const hy = useContext(HorizonCtx);
  const t = interpolate(frame, [from, to], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) });
  const cy = interpolate(t, [0, 1], [y0, y1 ?? hy + 60]);
  const s = interpolate(t, [0, 1], [scale0, scale1]);
  const on = powerOn(frame, from);
  const shake = Math.sin(frame * 1.7) * 1.5 * (1 - t);
  const tail = on * flickerAt(frame, 51, 0.3);
  return (
    <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
      <g transform={`translate(${x + shake} ${cy}) scale(${s})`}>
        <ellipse cx={0} cy={6} rx={260} ry={20} fill={NEON.pink} opacity={0.18} />
        <Neon d={`${rectPath(-220, -66, 70, 72, 14)}${rectPath(150, -66, 70, 72, 14)}`} color={NEON.purple} w={5} on={on} fill={NEON.night} />
        <Neon d="M-250 -60L-236 -150L-150 -176L150 -176L236 -150L250 -60Z" color={color} w={6} on={on} fill={NEON.night} />
        <Neon d="M-150 -176L-112 -246L112 -246L150 -176" color={color} w={5} on={on} fill={NEON.night} />
        <Neon d="M-96 -236L96 -236L124 -184L-124 -184Z" color={NEON.purple} w={3} on={on} glow={0.6} core={false} />
        <Neon d="M-226 -128H-70M70 -128H226" color={NEON.pink} w={10} on={tail} glow={1.3} />
        <Neon d={rectPath(-52, -112, 104, 36, 6)} color={NEON.white} w={3} on={on} glow={0.5} core={false} />
        <Neon d="M-250 -72H250" color={NEON.orange} w={3} on={on} glow={0.6} core={false} />
      </g>
    </svg>
  );
};

export const SampleTag: React.FC = () => (
  <div style={{ position: "absolute", left: 0, width: W, top: 1530, textAlign: "center", fontFamily: OSD, fontSize: 30, letterSpacing: 8, color: "#9b86b8" }}>SAMPLE CONTENT</div>
);
