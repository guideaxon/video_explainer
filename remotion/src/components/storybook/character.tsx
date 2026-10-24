/**
 * Storybook style bundle: Wren, the code-drawn storybook child that stands, talks, blinks, gestures and walks over a
 * painted plate (a still generated without the character). Painted, not vector: every shape is a wash (base paint,
 * light and shadow glaze, pigment grain, darker pooled edge, slightly off-register), and the whole figure goes
 * through one small filter that wobbles its edges with a static noise map and softens them. The grain and wobble
 * textures are generated ONCE per seed in code (seeded value noise -> canvas -> data URL) and used as an SVG pattern
 * and an feImage; nothing is turbulence-generated per frame. Motion comes only from the shared rig contract
 * (`../rig`): `mouth`/`visemes`, `blinkAt` with `seed`, `gestureAt`, `walk` + `walkTo`.
 * Use inside `<OnStill>` (kit.tsx) so it follows the camera move. See docs/storybook_video_style_guide.md, section 7.
 */
import React from "react";
import { continueRender, delayRender, useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt, gestureT, mouthAt, visemeAt, walkAt } from "../rig";
import type { RigProps, Viseme } from "../rig";
import { DEFAULT_LIGHT, edgeColor, feetAt, grainTile, groundAt, litColor, mixHex, shadowColor, wobbleTile } from "./paint";
import type { Light } from "./paint";

/** Wren's paints: the guide's palette plus skin, hair, cap and boots, all warm earth tones. */
export const WREN_PAINT = {
  ink: "#3a2a20",
  paper: "#fbf1de",
  scarf: "#c8553d", // terracotta
  overalls: "#2f7d80", // teal
  lens: "#bcd8e8", // sky
  shirt: "#f1e2c4",
  skin: "#f0c6a2",
  hair: "#5b3524",
  cap: "#7a4b2e",
  boots: "#4e3326",
};
export type WrenPaint = typeof WREN_PAINT;

export type WrenGesture = "rest" | "wave" | "point" | "think" | "open" | "cheer";
export const WREN_GESTURES: WrenGesture[] = ["rest", "wave", "point", "think", "open", "cheer"];
export type WrenLook = "camera" | "left" | "right" | "up";

type Pt = [number, number];
/** Elbow and hand relative to the shoulder, right arm (+x is screen right); the left arm mirrors. */
const ARM: Record<WrenGesture, { e: Pt; h: Pt }> = {
  rest: { e: [5, 31], h: [7, 62] },
  wave: { e: [27, -14], h: [33, -50] },
  point: { e: [30, 12], h: [64, 4] },
  think: { e: [14, 28], h: [-20, -12] },
  open: { e: [24, 24], h: [50, 20] },
  cheer: { e: [20, -22], h: [22, -58] },
};
/** Which gestures also move the left arm (mirrored). */
const BOTH: Partial<Record<WrenGesture, boolean>> = { open: true, cheer: true };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Mouth per Rhubarb shape: a stroke for rest/closed, else an opening (rx, ry) with teeth or tongue. */
const MOUTH: Record<Viseme, { d?: string; rx?: number; ry?: number; teeth?: boolean; tongue?: boolean }> = {
  X: { d: "M-7,-1 Q0,4.5 7,-1" },
  A: { d: "M-6,0.5 Q0,1.5 6,0.5" },
  B: { rx: 6, ry: 2.4, teeth: true },
  C: { rx: 6.5, ry: 4.2, teeth: true },
  D: { rx: 7, ry: 6.6, teeth: true, tongue: true },
  E: { rx: 5, ry: 4.6 },
  F: { rx: 3, ry: 3.6 },
  G: { rx: 6, ry: 1.9, teeth: true },
  H: { rx: 6, ry: 4.6, tongue: true },
};

/* ---------- textures: generated once per seed, decoded before the first frame ---------- */

const TILE = 128;
type Textures = { grain: string; wobble: string; decoded: Promise<unknown> };
const TEXTURES = new Map<number, Textures>();

const toDataUrl = (px: Uint8ClampedArray, size: number): string => {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  c.getContext("2d")!.putImageData(new ImageData(px, size, size), 0, 0);
  return c.toDataURL("image/png");
};

const texturesFor = (seed: number): Textures | null => {
  if (typeof document === "undefined") return null;
  let t = TEXTURES.get(seed);
  if (!t) {
    const grain = toDataUrl(grainTile(TILE, seed, WREN_PAINT.ink), TILE);
    const wobble = toDataUrl(wobbleTile(TILE, seed), TILE);
    const decode = (src: string) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    };
    t = { grain, wobble, decoded: Promise.all([decode(grain), decode(wobble)]) };
    TEXTURES.set(seed, t);
  }
  return t;
};

/** The paper-grain and edge-wobble data URLs for a seed; holds the render until they are decoded. */
const usePaintTextures = (seed: number) => {
  const tex = React.useMemo(() => texturesFor(seed), [seed]);
  const [handle] = React.useState(() => (tex ? delayRender("storybook paint textures") : null));
  React.useEffect(() => {
    if (handle === null || !tex) return;
    tex.decoded.then(() => continueRender(handle));
  }, [handle, tex]);
  return tex;
};

/* ---------- painted primitives ---------- */

type Ids = { grain: string; glaze: string; glazeLimb: string };
const PaintIds = React.createContext<Ids>({ grain: "", glaze: "", glazeLimb: "" });

/**
 * One watercolour wash: base paint slightly off-register, a light/shadow glaze, pigment grain and a darker pooled
 * edge that doubles as the soft ink line of the picture-book style.
 */
/** Pooled pigment plus the picture-book ink line: the paint's own dark, half way to ink. */
const lineColor = (paint: string) => mixHex(edgeColor(paint), WREN_PAINT.ink, 0.5);

const Wash: React.FC<{ d: string; paint: string; edge?: number; grain?: number }> = ({ d, paint, edge = 2, grain = 0.45 }) => {
  const ids = React.useContext(PaintIds);
  return (
    <g>
      <path d={d} fill={paint} transform="translate(0.7 0.5)" />
      <path d={d} fill={`url(#${ids.glaze})`} />
      <path d={d} fill={`url(#${ids.grain})`} opacity={grain} />
      <path d={d} fill="none" stroke={lineColor(paint)} strokeWidth={edge} strokeLinejoin="round" opacity={0.8} />
    </g>
  );
};

/** A limb (sleeve, leg): a round-capped stroke painted the same way as a wash. */
const Limb: React.FC<{ d: string; paint: string; w: number }> = ({ d, paint, w }) => {
  const ids = React.useContext(PaintIds);
  const common = { d, fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g>
      <path {...common} stroke={lineColor(paint)} strokeWidth={w + 3.2} opacity={0.8} />
      <path {...common} stroke={paint} strokeWidth={w} />
      <path {...common} stroke={`url(#${ids.glazeLimb})`} strokeWidth={w} />
      <path {...common} stroke={`url(#${ids.grain})`} strokeWidth={w} opacity={0.4} />
    </g>
  );
};

/* ---------- Wren ---------- */

export type WrenProps = RigProps<WrenGesture, WrenLook> & {
  /** Ground point between the feet, in still coordinates (inside `OnStill`) or SVG units. */
  x: number;
  y: number;
  /** 1 = about 270 units tall. Smaller further back in the painting. */
  scale?: number;
  /** Walk target (ground x, optional ground y) reached at `walk.to`. */
  walkTo?: number;
  walkToY?: number;
  /** Scale at the walk target (walking into depth). */
  walkToScale?: number;
  /** Mirror the figure. Default: face the walk direction. */
  flip?: boolean;
  gestureFrom?: WrenGesture;
  /** Match the still's light: direction, warmth, tint, strength. */
  light?: Light;
  /** Override paints (keep to the palette). */
  paint?: Partial<WrenPaint>;
};

/**
 * Wren: a small girl with a brown cap, round glasses, terracotta scarf and teal overalls (matches the template's
 * cast line, so plates and baked-in shots agree). (x, y) is the ground point; the contact shadow sits there.
 */
export const Wren: React.FC<WrenProps> = ({
  x, y, scale = 1, walkTo, walkToY, walkToScale, flip, gestureFrom = "rest", light = {}, paint,
  mouth, visemes, talking, blink = true, gesture = "rest", gestureAt = 0, walk, look = "camera", seed = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tex = usePaintTextures(seed % 4);
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, "");
  const ids: Ids = { grain: `wg${uid}`, glaze: `wz${uid}`, glazeLimb: `wl${uid}` };
  const filt = `wf${uid}`;
  const blur = `wb${uid}`;

  const L = { ...DEFAULT_LIGHT, ...light };
  const P = Object.fromEntries(Object.entries({ ...WREN_PAINT, ...paint }).map(([k, v]) => [k, litColor(v, light)])) as WrenPaint;
  const shade = shadowColor(WREN_PAINT.ink, light);
  const glow = litColor("#fff6e2", { ...light, warmth: L.warmth });

  const w = walkAt(walk, frame, fps);
  const g0 = groundAt(x, y, w.progress, walk ? walkTo : undefined, walk ? walkToY : undefined);
  const s = walk && walkToScale !== undefined ? lerp(scale, walkToScale, w.progress) : scale;
  const mirror = flip ?? (w.active && g0.faceLeft);
  const feet = feetAt(w.phase, w.active);
  const bob = w.active ? -Math.abs(Math.sin(w.phase)) * 4 : 0;
  const breathe = Math.sin(frame / 22) * 0.9;
  const lean = w.active ? 3 : 0;

  const rig = { mouth, visemes, talking };
  const open = mouthAt(rig, frame);
  const m = MOUTH[visemeAt(rig, frame)];
  const closed = blink ? blinkAt(frame, fps, seed) : 0;
  const gt = gestureT(frame, gestureAt);
  const armR = { e: lerpPt(ARM[gestureFrom].e, ARM[gesture].e, gt), h: lerpPt(ARM[gestureFrom].h, ARM[gesture].h, gt) };
  const leftT = BOTH[gesture] ? gt : BOTH[gestureFrom] ? 1 - gt : 0;
  const leftG = BOTH[gesture] ? gesture : BOTH[gestureFrom] ? gestureFrom : "rest";
  const armL = { e: lerpPt(ARM.rest.e, ARM[leftG].e, leftT), h: lerpPt(ARM.rest.h, ARM[leftG].h, leftT) };
  const swing = w.active ? Math.cos(w.phase) * 9 : 0;
  const waveRot = gesture === "wave" ? Math.sin((frame - gestureAt) / 3.5) * 18 * gt : 0;
  const gaze = { camera: [0, 0], left: [-3.5, 0], right: [3.5, 0], up: [0, -3] }[look];
  const tilt = (gesture === "think" ? -7 * gt : Math.sin(frame / 37) * 1.4) + open * 1.2;
  const flutter = Math.sin(frame / 6) * (w.active ? 5 : 2);

  const hipY = -76 + bob;
  const shY = -146 + bob + breathe * 0.3;
  const head: Pt = [lean, -198 + bob + breathe * 0.5 + open * 1.2];
  const legPath = (side: -1 | 1, f: { x: number; lift: number }) => {
    const hx = side * 11;
    const fx = side * 12 + f.x;
    const ky = (hipY - f.lift) / 2 - 6;
    return `M${hx},${hipY} Q${(hx + fx) / 2 + side * 2},${ky} ${fx},${-12 - f.lift}`;
  };
  const boot = (side: -1 | 1, f: { x: number; lift: number }) => {
    const fx = side * 12 + f.x;
    const by = -f.lift;
    return `M${fx - 11},${by} Q${fx - 12},${by - 15} ${fx},${by - 15} Q${fx + 13},${by - 14} ${fx + 15},${by} Z`;
  };
  const armPath = (side: -1 | 1, a: { e: Pt; h: Pt }, sw: number) => {
    const sx = side * 29;
    const e: Pt = [sx + side * a.e[0], shY + a.e[1]];
    const h: Pt = [sx + side * a.h[0], shY + a.h[1] + sw];
    return { d: `M${sx},${shY + 4} Q${(sx + e[0]) / 2 + side * 3},${(shY + e[1]) / 2} ${e[0]},${e[1]} L${h[0]},${h[1]}`, h };
  };
  const rArm = armPath(1, armR, gesture === "rest" ? -swing : 0);
  const lArm = armPath(-1, armL, leftT === 0 ? swing : 0);

  const lx = L.x;
  const glazeStops = (
    <>
      <stop offset="0" stopColor={glow} stopOpacity={0.18 + 0.25 * L.strength} />
      <stop offset="0.42" stopColor={glow} stopOpacity={0} />
      <stop offset="0.6" stopColor={shade} stopOpacity={0} />
      <stop offset="1" stopColor={shade} stopOpacity={0.12 + 0.28 * L.strength} />
    </>
  );
  const hand = (p: Pt, rot = 0) => (
    <g transform={`translate(${p[0]} ${p[1]}) rotate(${rot})`}>
      <Wash d="M-6.5,0 a6.5,7 0 1,0 13,0 a6.5,7 0 1,0 -13,0 Z" paint={P.skin} edge={1.4} grain={0.15} />
    </g>
  );
  const flipX = mirror ? -1 : 1;

  return (
    <g transform={`translate(${g0.x} ${g0.y}) scale(${s})`}>
      <defs>
        {tex && (
          <pattern id={ids.grain} patternUnits="userSpaceOnUse" width={64} height={64}>
            <image href={tex.grain} width={64} height={64} />
          </pattern>
        )}
        <linearGradient id={ids.glaze} x1={0.5 + lx * flipX * 0.5} y1={0.15} x2={0.5 - lx * flipX * 0.5} y2={0.85}>
          {glazeStops}
        </linearGradient>
        <linearGradient id={ids.glazeLimb} gradientUnits="userSpaceOnUse" x1={lx * 55 * flipX} y1={-260} x2={lx * -55 * flipX} y2={0}>
          {glazeStops}
        </linearGradient>
        <filter id={filt} filterUnits="userSpaceOnUse" x={-110} y={-300} width={220} height={320} colorInterpolationFilters="sRGB">
          {tex && <feImage href={tex.wobble} x={-110} y={-300} width={220} height={320} preserveAspectRatio="none" result="wob" />}
          <feDisplacementMap in="SourceGraphic" in2="wob" scale={tex ? 3.2 : 0} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur in="d" stdDeviation={0.55} />
        </filter>
        <filter id={blur} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation={3.2} />
        </filter>
      </defs>

      {/* contact shadow: a soft pool thrown away from the light, darker cores under planted feet */}
      <g filter={`url(#${blur})`}>
        <ellipse cx={-lx * 14} cy={1} rx={40 + Math.abs(lx) * 16} ry={7} fill={shade} opacity={0.22 + 0.3 * L.strength} />
        {(["l", "r"] as const).map((k, i) => (
          <ellipse key={k} cx={(i ? 12 : -12) * flipX + feet[k].x * flipX} cy={0} rx={13 - feet[k].lift * 0.6} ry={3.4} fill={shade} opacity={(0.35 + 0.3 * L.strength) * (1 - feet[k].lift / 14)} />
        ))}
      </g>

      <g filter={`url(#${filt})`}>
        <PaintIds.Provider value={ids}>
          <g transform={`scale(${flipX} 1)`}>
            {/* legs and boots */}
            <Limb d={legPath(-1, feet.l)} paint={P.overalls} w={15} />
            <Limb d={legPath(1, feet.r)} paint={P.overalls} w={15} />
            <Wash d={boot(-1, feet.l)} paint={P.boots} />
            <Wash d={boot(1, feet.r)} paint={P.boots} />
            {/* back arm (left), behind the body */}
            <Limb d={lArm.d} paint={P.shirt} w={12} />
            {hand(lArm.h)}
            {/* shirt, then overalls with bib and straps */}
            <Wash d={`M-31,${shY - 2} Q0,${shY - 12} 31,${shY - 2} L30,${shY + 46} L-30,${shY + 46} Z`} paint={P.shirt} />
            <Wash d={`M-17,${shY + 10} L17,${shY + 10} L19,${shY + 40} L33,${hipY + 4} Q0,${hipY + 12} -33,${hipY + 4} L-19,${shY + 40} Z`} paint={P.overalls} />
            <Wash d={`M-8,${shY + 20} h16 v10 q-8,4 -16,0 Z`} paint={litColor("#286b6e", light)} edge={1.1} grain={0.3} />
            <path d={`M-15,${shY + 12} L-24,${shY - 4} M15,${shY + 12} L24,${shY - 4}`} stroke={edgeColor(P.overalls)} strokeWidth={4.5} strokeLinecap="round" fill="none" />
            <circle cx={-14} cy={shY + 14} r={2} fill={P.paper} opacity={0.8} />
            <circle cx={14} cy={shY + 14} r={2} fill={P.paper} opacity={0.8} />
            {/* head: hair behind, face, fringe, features, cap */}
            <g transform={`translate(${head[0]} ${head[1]}) rotate(${tilt} 0 22)`}>
              <Wash d="M-47,6 Q-50,-36 0,-40 Q50,-36 47,6 Q46,22 30,24 L-30,24 Q-46,22 -47,6 Z" paint={P.hair} />
              <Wash d="M-39,2 a39,38 0 1,0 78,0 a39,38 0 1,0 -78,0 Z" paint={P.skin} grain={0.15} />
              <Wash d="M-38,-6 Q-30,-24 -4,-22 Q-14,-14 -10,-6 Q-2,-18 18,-20 Q34,-18 38,-6 Q30,-30 0,-32 Q-32,-30 -38,-6 Z" paint={P.hair} edge={1.2} />
              {/* cheeks */}
              <circle cx={-24} cy={14} r={7} fill={P.scarf} opacity={0.28} />
              <circle cx={24} cy={14} r={7} fill={P.scarf} opacity={0.28} />
              <g transform={`translate(${gaze[0]} ${gaze[1]})`}>
                {/* eyes and lids */}
                {[-15, 15].map((ex) => (
                  <g key={ex}>
                    <ellipse cx={ex} cy={2} rx={3.4} ry={Math.max(0.5, 4.4 * (1 - closed))} fill={P.ink} />
                    {closed > 0.6 && <path d={`M${ex - 5},2 Q${ex},5 ${ex + 5},2`} stroke={P.ink} strokeWidth={1.6} fill="none" strokeLinecap="round" />}
                  </g>
                ))}
                {/* round glasses */}
                {[-15, 15].map((ex) => (
                  <circle key={ex} cx={ex} cy={2} r={11.5} fill={P.lens} fillOpacity={0.22} stroke={P.ink} strokeWidth={2.3} />
                ))}
                <path d="M-3.5,1 Q0,-2 3.5,1" stroke={P.ink} strokeWidth={2} fill="none" />
                <path d={`M${-15 - 6 + lx * flipX * 4},-4 q3,-3 6,-3`} stroke={P.paper} strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.75} />
                <path d={`M${15 - 6 + lx * flipX * 4},-4 q3,-3 6,-3`} stroke={P.paper} strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.75} />
                {/* nose */}
                <path d="M-1,12 q3,3 6,0" stroke={edgeColor(P.skin)} strokeWidth={1.6} fill="none" strokeLinecap="round" />
                {/* mouth */}
                <g transform="translate(0 23)">
                  {m.d ? (
                    <path d={m.d} stroke={P.ink} strokeWidth={2} strokeLinecap="round" fill="none" />
                  ) : (
                    <>
                      <ellipse rx={m.rx} ry={m.ry} fill={edgeColor(P.scarf)} stroke={P.ink} strokeWidth={1.2} />
                      {m.tongue && <ellipse cy={(m.ry ?? 0) * 0.45} rx={(m.rx ?? 0) * 0.55} ry={(m.ry ?? 0) * 0.4} fill={P.scarf} />}
                      {m.teeth && <rect x={-(m.rx ?? 0) * 0.65} y={-(m.ry ?? 0) + 0.6} width={(m.rx ?? 0) * 1.3} height={Math.min(2.4, (m.ry ?? 0) * 0.7)} rx={1} fill={P.paper} />}
                    </>
                  )}
                </g>
              </g>
              {/* cap with a brim and a button; rim light on the lit side */}
              <Wash d="M-42,-14 Q-42,-54 0,-56 Q42,-54 42,-14 Q0,-24 -42,-14 Z" paint={P.cap} />
              <Wash d="M-4,-18 Q30,-28 60,-14 Q34,-8 -4,-12 Z" paint={litColor("#6a3f26", light)} edge={1.3} />
              <circle cx={0} cy={-55} r={4} fill={P.scarf} />
              <path d={lx <= 0 ? "M-38,-10 Q-46,16 -26,34" : "M38,-10 Q46,16 26,34"} transform={`scale(${flipX} 1)`} stroke={glow} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.25 + 0.4 * L.strength} />
            </g>
            {/* scarf: a wrap and a fluttering tail */}
            <Wash d={`M-22,${shY - 10} Q0,${shY + 2} 22,${shY - 10} L23,${shY + 1} Q0,${shY + 13} -23,${shY + 1} Z`} paint={P.scarf} />
            <Wash d={`M8,${shY + 4} Q${14 - flutter * 0.3},${shY + 22} ${20 + flutter},${shY + 36} L${30 + flutter},${shY + 32} Q${24},${shY + 18} 20,${shY + 2} Z`} paint={P.scarf} />
            {/* front arm (right) and its hand */}
            <Limb d={rArm.d} paint={P.shirt} w={12} />
            {hand(rArm.h, waveRot)}
          </g>
        </PaintIds.Provider>
      </g>
    </g>
  );
};

/** A one-off SVG stage for Wren outside a painted shot (character sheets, tests): viewBox in design units. */
export const WrenStage: React.FC<{ width: number; height: number; children: React.ReactNode }> = ({ width, height, children }) => (
  <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
    {children}
  </svg>
);
