/**
 * Tubo: the Neon style bundle's original character, a synth robot built entirely from glowing neon tubes
 * (a rounded CRT head with wedge sunglasses, an antenna bulb, a chest equaliser that pulses with the voice, tube
 * limbs and boots). Timing comes only from the shared rig contract (`../rig`): talk (`mouth`/`visemes`), blink
 * (`blinkAt`, the eye tubes flick off), gestures (`gestureAt`, eased over GESTURE_FRAMES) and walk (`walkAt`, a
 * foot lands at every multiple of PI).
 */
import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { blinkAt, gestureT, mouthAt, visemeAt, walkAt } from "../rig";
import type { RigProps, Viseme } from "../rig";
import { NEON, circlePath, ellipsePath, flickerAt, hash3, powerOn, rectPath } from "./core";
import { Neon } from "./glow";

export type TuboGesture = "rest" | "wave" | "point" | "cheer" | "shrug";
export type TuboLook = "camera" | "left" | "right" | "up";
export const TUBO_GESTURES: TuboGesture[] = ["rest", "wave", "point", "cheer", "shrug"];

type Pt = [number, number];
/** Right-arm elbow and hand per gesture (local units, ground at y 0; the left arm mirrors where both move). */
const ARM: Record<TuboGesture, { e: Pt; h: Pt; both: boolean }> = {
  rest: { e: [114, -282], h: [120, -200], both: true },
  wave: { e: [172, -392], h: [188, -492], both: false },
  point: { e: [182, -352], h: [278, -398], both: false },
  cheer: { e: [152, -452], h: [176, -548], both: true },
  shrug: { e: [152, -300], h: [206, -352], both: true },
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];

/** Mouth tube per Rhubarb shape, centred on (0, 0), about 70 px wide at scale 1. */
export const TUBO_MOUTH: Record<Viseme, string> = {
  X: "M-30 -4Q0 14 30 -4",
  A: "M-30 2L30 2",
  B: `${rectPath(-34, -9, 68, 18, 9)}M-24 0L24 0`,
  C: ellipsePath(0, 0, 34, 16),
  D: `${ellipsePath(0, 2, 36, 27)}M-16 18Q0 8 16 18`,
  E: ellipsePath(0, 0, 25, 20),
  F: `${circlePath(0, 0, 12)}M-20 -2Q-16 -8 -12 -4M20 -2Q16 -8 12 -4`,
  G: `M-32 -6Q0 -12 32 -6${rectPath(-22, -6, 44, 10, 3)}M-28 11Q0 4 28 11`,
  H: `${ellipsePath(0, 2, 30, 20)}M-15 -4Q0 -17 15 -4`,
};

const HEAD = rectPath(-125, -600, 250, 192, 58);
const TORSO = rectPath(-86, -382, 172, 192, 42);
const SHADES = "M-104 -546L-12 -546L-20 -500Q-62 -488 -98 -504ZM104 -546L12 -546L20 -500Q62 -488 98 -504ZM-12 -538L12 -538";
const GLINT = "M-84 -536L-70 -512M-66 -536L-58 -522M30 -536L44 -512M48 -536L56 -522";

/**
 * Tubo, drawn in its own full-frame SVG layer. (x, y) is the ground point between the boots; at scale 1 the robot is
 * about 690 px tall (antenna bulb included). Tubes switch on with a stutter at `from`. During `walk` it moves from
 * `x` to `walkTo`. `color` is the body tube, `accent` the mouth, eyes and antenna bulb.
 */
export const Tubo: React.FC<RigProps<TuboGesture, TuboLook> & {
  x: number; y: number; scale?: number; from?: number; walkTo?: number; gestureFrom?: TuboGesture; color?: string; accent?: string;
}> = ({
  x, y, scale = 1, from = 0, walkTo, gestureFrom = "rest", color = NEON.cyan, accent = NEON.pink,
  mouth, visemes, talking, blink = true, gesture = "rest", gestureAt = 0, walk, look = "camera", seed = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const on = powerOn(frame, from) * flickerAt(frame, seed + 40, 0.12);
  if (frame < from) return null;

  const w = walkAt(walk, frame, fps);
  const cx = walk && walkTo !== undefined ? lerp(x, walkTo, w.progress) : x;
  const dir = walkTo !== undefined && walkTo < x ? -1 : 1;
  const sinP = Math.sin(w.phase);
  const liftL = w.active ? Math.max(0, sinP) * 34 : 0;
  const liftR = w.active ? Math.max(0, -sinP) * 34 : 0;
  const stride = w.active ? Math.cos(w.phase) * 22 * dir : 0;
  const bob = w.active ? -Math.abs(sinP) * 12 : Math.sin(frame / 22) * 3;
  const lean = w.active ? 3 * dir : 0;

  const g = gesture === "rest" && gestureFrom === "rest" ? 0 : gestureT(frame, gestureAt);
  const gFrom = ARM[gestureFrom];
  const gTo = ARM[gesture];
  const tR = g;
  const eR = lerpPt(gFrom.e, gTo.e, tR);
  const hR = lerpPt(gFrom.h, gTo.h, tR);
  const leftFrom = gFrom.both ? gFrom : ARM.rest;
  const leftTo = gTo.both ? gTo : ARM.rest;
  const eL = lerpPt(leftFrom.e, leftTo.e, tR);
  const hL = lerpPt(leftFrom.h, leftTo.h, tR);
  const swing = w.active ? Math.cos(w.phase) * 16 : 0;
  const armIdle = gesture === "rest" ? (gestureFrom === "rest" ? 1 : g) : 1 - g; // arms swing on a walk only when they hang at rest
  const wag = gesture === "wave" ? Math.sin((frame - gestureAt) / 3.2) * 18 * g : 0;
  const headTilt = gesture === "shrug" ? 7 * g : gesture === "cheer" ? -3 * g : Math.sin(frame / 37) * 1.5;

  const rig = { mouth, visemes, talking };
  const open = mouthAt(rig, frame);
  const shape = visemeAt(rig, frame);
  const closed = blink ? blinkAt(frame, fps, seed) : 0;
  const eyeOn = on * (closed > 0.5 ? 0.1 : 1 - closed * 0.6);
  const gaze: Pt = ({ camera: [0, 0], left: [-14, 0], right: [14, 0], up: [0, -8] } as Record<TuboLook, Pt>)[look];

  // Legs and boots: a foot is planted whenever its lift is 0, so footfalls land at multiples of PI.
  const footL: Pt = [-44 - stride, -liftL];
  const footR: Pt = [44 + stride, -liftR];
  const leg = (side: number, f: Pt) => `M${side * 36} -190L${side * 40 + f[0] * 0.15} ${-100 + f[1] * 0.5}L${f[0]} ${f[1] - 26}`;
  const boot = (f: Pt, side: number) => rectPath(f[0] - 30 + side * 4, f[1] - 26, 60, 26, 12);

  const armR = `M92 -360L${eR[0]} ${eR[1] + swing * armIdle}L${hR[0]} ${hR[1] + swing * armIdle}`;
  const armL = `M-92 -360L${-eL[0]} ${eL[1] - swing * armIdle}L${-hL[0]} ${hL[1] - swing * armIdle}`;
  const pointDir = Math.atan2(hR[1] - eR[1], hR[0] - eR[0]);
  const finger = gesture === "point" && g > 0.3 ? `M${hR[0]} ${hR[1]}l${Math.cos(pointDir) * 34} ${Math.sin(pointDir) * 34}` : "";
  const handR = gesture === "wave" && g > 0.3 ? `${circlePath(0, 0, 16)}M-10 -14L-14 -34M0 -16L0 -38M10 -14L14 -34` : circlePath(0, 0, 16);

  // Chest equaliser: five bars that jump with the voice (idle pulse when silent).
  const step = Math.floor(frame / 2);
  const level = open > 0.02 ? open : 0.12 + 0.08 * Math.sin(frame / 9);
  const eq = [-48, -24, 0, 24, 48]
    .map((bx, i) => {
      const hgt = 10 + 82 * level * (0.45 + 0.55 * hash3(i, step, seed));
      return `M${bx} -232L${bx} ${(-232 - hgt).toFixed(1)}`;
    })
    .join("");

  const bulb = on * flickerAt(frame, seed + 7, 0.5, 60);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible", pointerEvents: "none" }}>
      <g transform={`translate(${cx} ${y}) scale(${scale}) rotate(${lean})`}>
        {/* floor reflection: a faint ellipse, no blur */}
        <ellipse cx={0} cy={6} rx={120} ry={14} fill={color} opacity={0.12 * on} />
        <g transform={`translate(0 ${bob})`}>
          <Neon d={leg(-1, footL)} color={color} w={9} on={on} />
          <Neon d={leg(1, footR)} color={color} w={9} on={on} />
          <Neon d={boot(footL, -1)} color={accent} w={7} on={on} fill={NEON.night} />
          <Neon d={boot(footR, 1)} color={accent} w={7} on={on} fill={NEON.night} />
          <Neon d={TORSO} color={color} w={8} on={on} fill={NEON.night} />
          <Neon d="M-86 -200L86 -200" color={NEON.purple} w={5} on={on} glow={0.6} />
          <Neon d={eq} color={NEON.orange} w={7} on={on} glow={0.8} />
          <Neon d={armL} color={color} w={9} on={on} />
          <Neon d={armR} color={color} w={9} on={on} />
          <g transform={`translate(${-hL[0]} ${hL[1] - swing * armIdle})`}>
            <Neon d={circlePath(0, 0, 16)} color={accent} w={6} on={on} fill={NEON.night} />
          </g>
          <g transform={`translate(${hR[0]} ${hR[1] + swing * armIdle}) rotate(${wag})`}>
            <Neon d={handR} color={accent} w={6} on={on} fill={NEON.night} />
          </g>
          {finger && <Neon d={finger} color={accent} w={7} on={on} />}
          <Neon d="M-16 -382L-16 -408M16 -382L16 -408" color={color} w={6} on={on} glow={0.6} />
          <g transform={`translate(0 ${-open * 5}) rotate(${headTilt} 0 -410)`}>
            <Neon d={HEAD} color={color} w={9} on={on} fill={NEON.night} />
            <Neon d={`${circlePath(-134, -500, 13)}${circlePath(134, -500, 13)}`} color={NEON.purple} w={5} on={on} glow={0.7} />
            <Neon d="M42 -600L62 -664" color={color} w={6} on={on} />
            <Neon d={circlePath(64, -676, 11)} color={accent} w={6} on={bulb} fill={NEON.night} />
            <g transform={`translate(${gaze[0]} ${gaze[1]})`}>
              <Neon d={closed > 0.5 ? "M-68 -514L-44 -514M44 -514L68 -514" : "M-62 -518L-50 -518M50 -518L62 -518"} color={accent} w={closed > 0.5 ? 4 : 9} on={eyeOn} />
            </g>
            <Neon d={SHADES} color={NEON.cyan === color ? NEON.purple : NEON.cyan} w={6} on={on} />
            <Neon d={GLINT} color={NEON.white} w={3} on={on * 0.6} glow={0} core={false} />
            <g transform="translate(0 -452)">
              <Neon d={TUBO_MOUTH[shape]} color={accent} w={6} on={on} />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
};
