/**
 * Pop-art bundle hero: "Dot Dash", an ORIGINAL comic character (red bob with white shine streaks, yellow jacket with
 * big pointed lapels, cyan top, process-blue trousers, red boots). Drawn in code with thick ink outlines whose
 * weight varies with stroke direction, flat colour plates printed 3 px off register, and Ben-Day dot shading
 * (magenta on the face, cyan on the jacket, ink in the hair).
 *
 * Rig (shared contract `../rig`, timing only):
 *   - talks from `mouth`/`visemes` (`scenes/lipsync.ts`), one inked mouth per Rhubarb shape A-H and X;
 *   - blinks on `blinkAt(frame, fps, seed)`;
 *   - gestures `wave`, `point`, `fist` (raised fist, the "POW" pose) and `think` (hand to chin) from `gestureAt`;
 *   - walks from `x` to `walkTo` during `walk={{ from, to }}`: feet land at every multiple of PI of `walkAt().phase`.
 * Local units: ground point between the feet is (0, 0), the top of the hair is about y = -1000. `scale` 1 draws her
 * about 1000 px tall; 1.5 to 2.2 is a close-up (crop with a Panel).
 */
import React, { useId } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt, gestureT, mouthAt, visemeAt, walkAt } from "../rig";
import type { RigProps, Viseme } from "../rig";
import { C, MISREG, ik2 } from "./ink";

export type HeroGesture = "rest" | "wave" | "point" | "fist" | "think";
export type HeroLook = "camera" | "left" | "right" | "up" | "down";
export type HeroMood = "calm" | "shock" | "fierce";
export const HERO_GESTURES: HeroGesture[] = ["rest", "wave", "point", "fist", "think"];

type P = [number, number];
const INK = 6.5;
const SH_R: P = [118, -622];
const SH_L: P = [-118, -622];
const UPPER = 150;
const FORE = 145;
const THIGH = 172;
const SHIN = 172;

type MouthSpec = { closed?: "smile" | "press"; rx?: number; ry?: number; teeth?: boolean; tongue?: boolean; tongueUp?: boolean; tuck?: boolean; lip?: number };
/** One inked mouth per Rhubarb shape (see the rig header for what each letter means). */
export const HERO_MOUTHS: Record<Viseme, MouthSpec> = {
  X: { closed: "smile" },
  A: { closed: "press" },
  B: { rx: 22, ry: 5, teeth: true },
  C: { rx: 22, ry: 11, teeth: true, tongue: true },
  D: { rx: 23, ry: 19, teeth: true, tongue: true },
  E: { rx: 16, ry: 14, tongue: true },
  F: { rx: 9, ry: 8, lip: 10 },
  G: { rx: 21, ry: 5, teeth: true, tuck: true },
  H: { rx: 21, ry: 13, teeth: true, tongueUp: true },
};

/** Where each hand goes for a gesture (local units), before blending with the rest pose. */
export const gestureHands = (g: HeroGesture, t: number): { r?: P; l?: P } => {
  switch (g) {
    case "wave": return { r: [250 + 34 * Math.sin(t / 3), -935] };
    case "point": return { r: [395, -700] };
    case "fist": return { r: [150, -1045] };
    case "think": return { l: [-26, -668] };
    default: return {};
  }
};

/** Elbow on the outward and lower side, so arms never fold through the body. */
const arm = (sh: P, hand: P, side: 1 | -1) => {
  const a = ik2(sh, hand, UPPER, FORE, 1);
  const b = ik2(sh, hand, UPPER, FORE, -1);
  const score = (j: P) => side * j[0] + 0.5 * j[1];
  return score(a.joint) >= score(b.joint) ? a : b;
};
/** Knee bowed forward (+x; the whole figure mirrors when she faces left). */
const leg = (hip: P, foot: P) => {
  const a = ik2(hip, foot, THIGH, SHIN, 1);
  const b = ik2(hip, foot, THIGH, SHIN, -1);
  return a.joint[0] >= b.joint[0] ? a : b;
};
const lerp = (a: P, b: P, t: number): P => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const pts = (...p: P[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" L");

/** A shape printed as a colour plate (offset by MISREG) under an ink plate (outline, weight varies with angle). */
const Inked: React.FC<{ d: string; fill: string; mr: P; w?: number; shade?: string }> = ({ d, fill, mr, w = INK, shade }) => (
  <>
    <g transform={`translate(${mr[0]} ${mr[1]})`}>
      <path d={d} fill={fill} />
      {shade && <path d={d} fill={shade} />}
    </g>
    <path d={d} fill="none" stroke={C.ink} strokeWidth={w} strokeLinejoin="round" />
    <path d={d} fill="none" stroke={C.ink} strokeWidth={w * 0.5} strokeLinejoin="round" transform={`translate(${w * 0.35} ${w * 0.4})`} />
  </>
);

/** A limb as a fat round-capped stroke: ink plate first, colour plate (offset) on top. */
const Limb: React.FC<{ path: P[]; width: number; fill: string; mr: P }> = ({ path, width, fill, mr }) => (
  <>
    <path d={`M${pts(...path)}`} fill="none" stroke={C.ink} strokeWidth={width + INK * 2} strokeLinecap="round" strokeLinejoin="round" />
    <path d={`M${pts(...path)}`} fill="none" stroke={fill} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" transform={`translate(${mr[0]} ${mr[1]})`} />
  </>
);

const Hand: React.FC<{ at: P; from: P; kind: "open" | "fist" | "point"; mr: P }> = ({ at, from, kind, mr }) => {
  const ang = Math.atan2(at[1] - from[1], at[0] - from[0]);
  const deg = (ang * 180) / Math.PI;
  return (
    <g transform={`translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) rotate(${deg.toFixed(1)})`}>
      {kind === "point" && <Limb path={[[10, 0], [62, 0]]} width={17} fill={C.skin} mr={mr} />}
      <Inked d="M-24,0 A26,26 0 1 1 28,0 A26,26 0 1 1 -24,0 Z" fill={C.skin} mr={mr} w={INK * 0.9} />
      {kind === "fist" && [-12, 0, 12].map((y) => <path key={y} d={`M14,${y - 5} Q24,${y} 14,${y + 5}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />)}
      {kind === "open" && [-11, 0, 11].map((y) => <path key={y} d={`M18,${y} L30,${y * 1.3}`} fill="none" stroke={C.ink} strokeWidth={4} strokeLinecap="round" />)}
    </g>
  );
};

const Mouth: React.FC<{ shape: Viseme; mr: P; clip: string }> = ({ shape, mr, clip }) => {
  const m = HERO_MOUTHS[shape];
  if (m.closed === "smile") {
    return (
      <g>
        <Inked d="M-26,0 Q-13,-11 0,-6 Q13,-11 26,0 Q0,4 -26,0 Z" fill={C.red} mr={mr} w={4} />
        <Inked d="M-24,1 Q0,4 24,1 Q0,18 -24,1 Z" fill={C.red} mr={mr} w={4} />
        <path d="M-30,-3 Q0,6 30,-3" fill="none" stroke={C.ink} strokeWidth={5.5} strokeLinecap="round" />
      </g>
    );
  }
  if (m.closed === "press") {
    return (
      <g>
        <Inked d="M-25,0 Q0,-7 25,0 Q0,2 -25,0 Z" fill={C.red} mr={mr} w={4} />
        <Inked d="M-24,1 Q0,10 24,1 Z" fill={C.red} mr={mr} w={4} />
        <path d="M-28,0.5 L28,0.5" stroke={C.ink} strokeWidth={6.5} strokeLinecap="round" />
      </g>
    );
  }
  const rx = m.rx ?? 20;
  const ry = m.ry ?? 10;
  const lip = m.lip ?? 7;
  const outer = `M${-rx - lip},2 A${rx + lip},${ry + lip * 0.85} 0 1 1 ${rx + lip},2 A${rx + lip},${ry + lip * 0.85} 0 1 1 ${-rx - lip},2 Z`;
  return (
    <g>
      <Inked d={outer} fill={C.red} mr={mr} w={4} />
      <clipPath id={clip}><ellipse cx={0} cy={2} rx={rx} ry={ry} /></clipPath>
      <ellipse cx={0} cy={2} rx={rx} ry={ry} fill={C.mouth} />
      <g clipPath={`url(#${clip})`}>
        {m.teeth && <rect x={-rx} y={2 - ry} width={rx * 2} height={Math.min(7, ry * 0.9)} fill={C.white} />}
        {m.tongue && <ellipse cx={0} cy={2 + ry * 0.75} rx={rx * 0.62} ry={ry * 0.55} fill={C.tongue} />}
        {m.tongueUp && <ellipse cx={0} cy={2 - ry * 0.15} rx={rx * 0.42} ry={ry * 0.5} fill={C.tongue} />}
      </g>
      <ellipse cx={0} cy={2} rx={rx} ry={ry} fill="none" stroke={C.ink} strokeWidth={3} />
      {m.tuck && <rect x={-rx * 0.8} y={1} width={rx * 1.6} height={7} rx={2} fill={C.white} stroke={C.ink} strokeWidth={2.5} />}
    </g>
  );
};

const LOOK: Record<HeroLook, P> = { camera: [0, 0], left: [-8, 0], right: [8, 0], up: [0, -7], down: [0, 6] };
const BROWS: Record<HeroMood, [string, string]> = {
  calm: ["M-84,-858 Q-52,-878 -18,-864", "M84,-858 Q52,-878 18,-864"],
  shock: ["M-86,-878 Q-52,-906 -18,-886", "M86,-878 Q52,-906 18,-886"],
  fierce: ["M-86,-874 Q-50,-868 -14,-848", "M86,-874 Q50,-868 14,-848"],
};

const Eye: React.FC<{ cx: number; side: 1 | -1; shut: number; look: P; mood: HeroMood; mr: P; clip: string }> = ({ cx, side, shut, look, mood, mr, clip }) => {
  const top = mood === "fierce" ? -838 : mood === "shock" ? -856 : -849;
  const bot = mood === "shock" ? -800 : -806;
  const iris = mood === "shock" ? 10 : 15;
  const o = cx - 32 * side;
  const i = cx + 32 * side;
  const almond = `M${o},-822 Q${cx},${top} ${i},-822 Q${cx},${bot} ${o},-822 Z`;
  const k = 1 - 0.95 * shut;
  return (
    <g transform={`translate(0 -822) scale(1 ${k.toFixed(3)}) translate(0 822)`}>
      <clipPath id={clip}><path d={almond} /></clipPath>
      <path d={almond} fill={C.white} />
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(${mr[0]} ${mr[1]})`}><circle cx={cx + look[0]} cy={-823 + look[1]} r={iris} fill={C.cyan} /></g>
        <circle cx={cx + look[0]} cy={-823 + look[1]} r={iris} fill="none" stroke={C.ink} strokeWidth={3} />
        <circle cx={cx + look[0]} cy={-823 + look[1]} r={iris * 0.48} fill={C.ink} />
        <circle cx={cx + look[0] + 5} cy={-829 + look[1]} r={4} fill={C.white} />
      </g>
      <path d={almond} fill="none" stroke={C.ink} strokeWidth={3.5} />
      {/* heavy upper lid with an outer lash flick */}
      <path d={`M${o - 4 * side},-820 Q${cx},${top - 4} ${i},-824 M${o},-822 L${o - 16 * side},${-836}`} fill="none" stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
    </g>
  );
};

/**
 * The hero. (x, y) is the ground point between her feet in the parent's px. `mood` sets brows and eyes;
 * `look` aims the eyes. Props are plain numbers so scenes stay deterministic and the sound step can read
 * literal `gestureAt={n}` and `walk={{ from: a, to: b }}`.
 */
export const Hero: React.FC<RigProps<HeroGesture, HeroLook> & { x: number; y: number; scale?: number; from?: number; flip?: boolean; walkTo?: number; mood?: HeroMood }> = ({
  x, y, scale = 1, from = 0, flip, walkTo, mood = "calm", mouth, visemes, talking, blink = true, gesture = "rest", gestureAt = 0, walk, look = "camera", seed = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const pop = spring({ frame: frame - from, fps, config: { damping: 13, stiffness: 150 } });
  const rig = { mouth, visemes, talking };
  const shape = visemeAt(rig, frame);
  const open = mouthAt(rig, frame);
  const shut = blink ? blinkAt(frame, fps, seed) : 0;
  const w = walkAt(walk, frame, fps);
  const walking = w.active;
  const px = walk && walkTo !== undefined ? x + (walkTo - x) * w.progress : x;
  const facing = flip ?? (walk && walkTo !== undefined && walkTo < x);
  const mr: P = [MISREG[0] / scale, MISREG[1] / scale];

  // Body bob: a walk lifts the body mid-stride (|sin phase|); standing, she breathes.
  const bob = walking ? -10 * Math.abs(Math.sin(w.phase)) : Math.sin(frame / 22) * 3;
  const nod = open * 2.5;

  // Feet: widest stride at each footfall (cos phase), the swinging foot lifts.
  const stride = walking ? Math.cos(w.phase) : 0;
  const footL: P = [-56 + 82 * stride, walking ? -45 * Math.max(0, -Math.sin(w.phase)) : 0];
  const footR: P = [56 - 82 * stride, walking ? -45 * Math.max(0, Math.sin(w.phase)) : 0];
  const hipL: P = [-48, -330 + bob];
  const hipR: P = [48, -330 + bob];
  const legL = leg(hipL, footL);
  const legR = leg(hipR, footR);

  // Hands: rest pose (arms swing opposite the legs while walking), blended toward the gesture target.
  const g = gesture === "rest" ? 0 : gestureT(frame, gestureAt);
  const target = gestureHands(gesture, frame - gestureAt);
  const swing = walking ? 46 * stride : 0;
  const restR: P = [150 - swing + Math.sin(frame / 20) * 4, -360 + bob];
  const restL: P = [-150 + swing - Math.sin(frame / 20) * 4, -360 + bob];
  const handR = target.r ? lerp(restR, [target.r[0], target.r[1] + bob], g) : restR;
  const handL = target.l ? lerp(restL, [target.l[0], target.l[1] + bob], g) : restL;
  const shR: P = [SH_R[0], SH_R[1] + bob];
  const shL: P = [SH_L[0], SH_L[1] + bob];
  const armR = arm(shR, handR, 1);
  const armL = arm(shL, handL, -1);
  const kindR = g > 0.5 && gesture === "fist" ? "fist" : g > 0.5 && gesture === "point" ? "point" : "open";

  const id = (k: string) => `${uid}${k}`;
  const cell = 11 / scale;
  const pat = (k: string, color: string, r = 0.22) => (
    <pattern id={id(k)} width={cell} height={cell} patternUnits="userSpaceOnUse">
      <circle cx={cell * 0.25} cy={cell * 0.25} r={cell * r} fill={color} />
      <circle cx={cell * 0.75} cy={cell * 0.75} r={cell * r} fill={color} />
    </pattern>
  );
  const s = scale * (0.85 + 0.15 * Math.min(1, pop));

  return (
    <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible", opacity: Math.min(1, pop * 2) }}>
      <defs>
        {pat("m", C.magenta)}
        {pat("c", C.cyan, 0.24)}
        {pat("k", C.ink, 0.2)}
      </defs>
      <g transform={`translate(${px.toFixed(1)} ${y}) scale(${(facing ? -s : s).toFixed(4)} ${s.toFixed(4)})`}>
        {/* ground shadow: an ink-dot ellipse */}
        <ellipse cx={0} cy={4} rx={150} ry={18} fill={`url(#${id("k")})`} />
        <g transform={`translate(0 ${bob.toFixed(2)}) rotate(${nod.toFixed(2)} 0 -690)`}>
          {/* hair, back layer (the bob's sides frame the face) */}
          <Inked d="M-152,-700 C-176,-800 -166,-935 -100,-978 C-50,-1010 50,-1010 100,-978 C166,-935 176,-800 152,-700 C132,-688 112,-698 100,-718 L-100,-718 C-112,-698 -132,-688 -152,-700 Z" fill={C.red} shade={`url(#${id("k")})`} mr={mr} />
        </g>
        {/* legs and boots */}
        {[[hipL, legL], [hipR, legR]].map(([hip, l], i) => {
          const lg = l as ReturnType<typeof leg>;
          const e = lg.end;
          return (
            <g key={i}>
              <Limb path={[hip as P, lg.joint, e]} width={62} fill={C.blue} mr={mr} />
              <Inked d={`M${(e[0] - 34).toFixed(1)},${(e[1] - 42).toFixed(1)} L${(e[0] + 30).toFixed(1)},${(e[1] - 42).toFixed(1)} L${(e[0] + 58).toFixed(1)},${(e[1] - 8).toFixed(1)} Q${(e[0] + 60).toFixed(1)},${(e[1] + 6).toFixed(1)} ${(e[0] + 44).toFixed(1)},${(e[1] + 6).toFixed(1)} L${(e[0] - 36).toFixed(1)},${(e[1] + 6).toFixed(1)} Z`} fill={C.red} mr={mr} />
            </g>
          );
        })}
        <g transform={`translate(0 ${bob.toFixed(2)})`}>
          {/* torso: cyan top, yellow jacket halves, belt */}
          <Inked d="M-120,-628 C-132,-560 -120,-430 -100,-330 L100,-330 C120,-430 132,-560 120,-628 C70,-652 -70,-652 -120,-628 Z" fill={C.cyan} mr={mr} />
          <Inked d="M-120,-628 C-80,-648 -46,-650 -30,-644 L-4,-500 L-14,-330 L-100,-330 C-120,-430 -132,-560 -120,-628 Z" fill={C.yellow} mr={mr} />
          <Inked d="M120,-628 C80,-648 46,-650 30,-644 L4,-500 L14,-330 L100,-330 C120,-430 132,-560 120,-628 Z" fill={C.yellow} shade={`url(#${id("c")})`} mr={mr} />
          <Inked d="M-104,-352 L104,-352 L102,-326 L-102,-326 Z" fill={C.ink} mr={mr} />
          {/* neck with a dot shadow under the chin */}
          <Inked d="M-34,-712 L34,-712 L36,-640 Q0,-628 -36,-640 Z" fill={C.skin} shade={`url(#${id("m")})`} mr={mr} />
          {/* big pointed lapels */}
          <Inked d="M-32,-646 L-96,-620 L-64,-536 L-6,-512 Z" fill={C.yellow} mr={mr} />
          <Inked d="M32,-646 L96,-620 L64,-536 L6,-512 Z" fill={C.yellow} mr={mr} />
          {/* head (nods a little with the mouth) */}
          <g transform={`rotate(${nod.toFixed(2)} 0 -690)`}>
            <Inked d="M-108,-880 C-114,-820 -110,-760 -88,-728 C-62,-695 -30,-688 0,-688 C30,-688 62,-695 88,-728 C110,-760 114,-820 108,-880 C100,-960 -100,-960 -108,-880 Z" fill={C.skin} mr={mr} />
            {/* Ben-Day shading on the shadow side of the face, and dotted cheeks */}
            <path d="M58,-884 C100,-862 114,-800 102,-760 C92,-728 70,-704 40,-694 C82,-742 92,-806 58,-884 Z" fill={`url(#${id("m")})`} transform={`translate(${mr[0]} ${mr[1]})`} />
            <circle cx={-70} cy={-762} r={20} fill={`url(#${id("m")})`} />
            <circle cx={70} cy={-762} r={20} fill={`url(#${id("m")})`} />
            <Eye cx={-48} side={-1} shut={shut} look={LOOK[look]} mood={mood} mr={mr} clip={id("el")} />
            <Eye cx={48} side={1} shut={shut} look={LOOK[look]} mood={mood} mr={mr} clip={id("er")} />
            {BROWS[mood].map((d, i) => <path key={i} d={d} fill="none" stroke={C.ink} strokeWidth={9} strokeLinecap="round" />)}
            <path d="M6,-806 Q14,-776 0,-768" fill="none" stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
            <g transform="translate(0 -728)"><Mouth shape={shape} mr={mr} clip={id("mo")} /></g>
            {/* sweeping fringe with white shine streaks */}
            <Inked d="M-114,-846 C-128,-940 -60,-988 10,-982 C88,-976 128,-930 114,-850 C92,-902 40,-908 -12,-882 C-52,-862 -92,-844 -114,-846 Z" fill={C.red} mr={mr} />
            <path d="M-74,-948 Q-34,-972 8,-966 M34,-962 Q66,-952 86,-934" fill="none" stroke={C.white} strokeWidth={9} strokeLinecap="round" />
          </g>
        </g>
        {/* arms on top (sleeves are the jacket) */}
        <Limb path={[shL, armL.joint, armL.end]} width={46} fill={C.yellow} mr={mr} />
        <Hand at={armL.end} from={armL.joint} kind="open" mr={mr} />
        <Limb path={[shR, armR.joint, armR.end]} width={46} fill={C.yellow} mr={mr} />
        <Hand at={armR.end} from={armR.joint} kind={kindR} mr={mr} />
      </g>
    </svg>
  );
};
