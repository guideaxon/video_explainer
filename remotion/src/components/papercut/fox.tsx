import React from "react";
import { Cut, P, darken, lighten } from "./paper";
import { pokeAge, pokeKick, useUi } from "./ui";
import { useVoice } from "./voice";
import { blinkAt, mouthAt, visemeAt, VISEME_WIDTH } from "../rig";
import type { Viseme } from "../rig";

const OR = "#e4571c";
const OR_D = "#bd3f12";
const OR_L = "#f68a3c";
const CREAM = "#fff1dc";
const DARK = "#2b1812";

const T = (p: P[], dx: number, dy: number): P[] => p.map(([a, b]) => [a + dx, b + dy] as P);

const Leg: React.FC<{ x: number; ang: number; far?: boolean }> = ({ x, ang, far }) => {
  const o = far ? darken(OR, 0.18) : OR;
  const s = far ? "#1c100c" : DARK;
  return (
    <g transform={`translate(${x} -56) rotate(${ang})`}>
      <Cut p={[[-7, 0], [7, 0], [5, 30], [-4, 30]]} fill={o} />
      <Cut p={[[-4, 30], [5, 30], [6, 54], [-6, 54]]} fill={s} />
      <Cut p={[[-6, 54], [6, 54], [13, 58], [-7, 58]]} fill={s} />
    </g>
  );
};

/** Lip-sync data for one character: `mouth` openness and/or Rhubarb `visemes` per frame, starting at scene second `at`. */
export type FoxTalk = { mouth?: number[]; visemes?: string; at?: number; fps?: number };

/** Muzzle mouth: the lower jaw swings down about the mouth corner; rounded shapes (E, F) shorten the mouth. */
const Mouth: React.FC<{ open: number; shape: Viseme }> = ({ open, shape }) => {
  const fx = 78, fy = 9; // front of the mouth, under the nose
  const cx = fx - 28 * VISEME_WIDTH[shape], cy = 12; // corner
  const a = (open * 17 * Math.PI) / 180;
  const rot = ([px, py]: P): P => [cx + (px - cx) * Math.cos(a) - (py - cy) * Math.sin(a), cy + (px - cx) * Math.sin(a) + (py - cy) * Math.cos(a)];
  const lip = rot([fx, fy]);
  const tongue = "CDEH".includes(shape) && open > 0.3;
  return (
    <g>
      <Cut p={[[cx, cy], [fx, fy], lip]} fill={DARK} edge={false} />
      {tongue && <Cut p={[[cx + 6, cy + 1], rot([fx - 6, fy + 1]), rot([fx - 12, fy - 1]), [cx + 10, cy]]} fill="#c2453a" edge={false} />}
      {shape === "G" && <Cut p={[[fx - 8, fy + 0.4], [fx - 1, fy], [fx - 2, fy + 2], [fx - 7, fy + 2.2]]} fill={CREAM} edge={false} />}
      <Cut p={[[cx, cy], lip, rot([fx - 3, fy + 5]), rot([cx + 12, cy + 7]), rot([cx + 1, cy + 4])]} fill={CREAM} />
    </g>
  );
};

/**
 * Paper-cut fox facing right; the origin is the ground between the feet. It blinks on the shared rig rhythm (`blink`,
 * `seed`) and talks from `talk`, or else from the scene's embedded voice (`useVoice()`); `talk={false}` keeps it quiet.
 */
export const Fox: React.FC<{
  x: number; y: number; s?: number; flip?: boolean; t: number; walk?: number; look?: number; tailUp?: number;
  blink?: boolean; seed?: number; talk?: FoxTalk | false;
}> = ({ x, y, s = 1.2, flip = false, t, walk = 0, look = -8, tailUp = 0, blink = true, seed = 0, talk }) => {
  const ui = useUi();
  const voice = useVoice();
  const tf = talk ? Math.floor((t - (talk.at ?? 0)) * (talk.fps ?? 30)) : -1;
  const open = talk ? mouthAt(talk, tf) : talk === false ? 0 : voice?.open ?? 0;
  const shape = talk ? visemeAt(talk, tf) : voice?.viseme ?? "X";
  const talking = talk ? tf >= 0 : talk !== false && !!voice?.talking;
  const shut = blink ? blinkAt(t * 30, 30, seed) : 0;
  const age = pokeAge(ui, "fox", "fox");
  const kick = pokeKick(age, 1.5);
  const wig = (k: number) => (kick ? Math.sin(age * k) : 0); // age is Infinity before any poke: sin(Infinity) is NaN
  const ph = t * walk * 6.5;
  const sw = walk ? 1 : 0;
  const bob = (walk ? Math.abs(Math.sin(ph)) * -3 : Math.sin(t * 1.6) * -0.8) - (age < 0.7 ? Math.abs(Math.sin(age * 9)) * 12 * (1 - age / 0.7) : 0);
  const tail = Math.sin(t * 1.9) * 5 + (walk ? Math.sin(ph) * 4 : 0) + tailUp + wig(20) * 16 * kick;
  const headTilt = look + Math.sin(t * 0.9) * 2 + (walk ? Math.sin(ph * 2) * 1.5 : 0) - 12 * kick;
  const ear = Math.max(0, Math.sin(t * 0.7 + 1)) ** 12 * 14 + Math.abs(wig(22)) * 16 * kick;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} filter="url(#sh-s)" data-poke="fox" data-id="fox" style={{ cursor: "pointer" }}>
      <ellipse cx={-5} cy={2} rx={95} ry={6} fill="#000" opacity={0.28} />
      <rect x={-150} y={-135} width={245} height={140} fill="transparent" pointerEvents="all" />
      <g transform={`translate(0 ${bob})`}>
        {/* far legs */}
        <Leg x={-34} ang={-Math.sin(ph) * 24 * sw} far />
        <Leg x={28} ang={Math.sin(ph) * 24 * sw} far />
        {/* tail */}
        <g transform={`translate(-62 -78) rotate(${tail})`}>
          <Cut p={[[0, 4], [-26, -26], [-72, -44], [-118, -34], [-146, -10], [-124, 12], [-80, 16], [-38, 22], [-4, 14]]} fill={OR} />
          <Cut p={[[-4, 4], [-26, -22], [-72, -38], [-112, -28], [-84, -12], [-40, -4]]} fill={OR_L} />
          <Cut p={[[-84, 14], [-40, 22], [-6, 14], [-30, 2], [-70, 4]]} fill={OR_D} />
          <Cut p={[[-104, -36], [-118, -34], [-146, -10], [-124, 12], [-100, 15], [-112, -10]]} fill={CREAM} />
        </g>
        {/* body */}
        <Cut p={[[-72, -70], [-52, -102], [0, -112], [48, -102], [70, -80], [52, -50], [-4, -45], [-56, -48]]} fill={OR} />
        <Cut p={[[-72, -70], [-52, -102], [0, -112], [48, -102], [14, -92], [-36, -84]]} fill={OR_L} />
        <Cut p={[[-72, -70], [-56, -48], [-4, -45], [-30, -62]]} fill={OR_D} />
        <Cut p={[[-4, -45], [52, -50], [44, -62], [8, -62]]} fill={CREAM} />
        <Cut p={[[44, -100], [70, -80], [52, -50], [34, -56], [48, -80]]} fill={CREAM} />
        {/* near legs */}
        <Leg x={-46} ang={Math.sin(ph) * 24 * sw} />
        <Leg x={42} ang={-Math.sin(ph) * 24 * sw} />
        {/* head */}
        <g transform={`translate(56 -92) rotate(${headTilt})`}>
          <g transform={`rotate(${-ear * 0.4} 8 -20)`}>
            <Cut p={[[2, -20], [6, -62], [30, -28]]} fill={OR_D} />
          </g>
          <Cut p={[[0, -18], [32, -28], [64, -8], [82, 6], [62, 14], [30, 26], [0, 22]]} fill={OR} />
          <Cut p={[[0, -18], [32, -28], [64, -8], [30, -6], [6, 0]]} fill={OR_L} />
          <Cut p={[[0, 22], [30, 26], [62, 14], [82, 6], [44, 2], [14, 4]]} fill={CREAM} />
          <Cut p={[[10, 2], [44, 2], [30, -6]]} fill={lighten(OR_L, 0.25)} />
          <g transform={`rotate(${ear} 28 -26)`}>
            <Cut p={[[16, -26], [30, -70], [50, -30]]} fill={OR} />
            <Cut p={[[22, -30], [31, -60], [43, -33]]} fill={DARK} />
            <Cut p={[[27, -31], [31, -52], [38, -34]]} fill="#6b2f1d" />
          </g>
          <Cut p={[[74, 1], [86, 5], [77, 12]]} fill={DARK} />
          {talking && <Mouth open={open} shape={shape} />}
          <g transform={shut ? `translate(0 -4) scale(1 ${1 - 0.86 * shut}) translate(0 4)` : undefined}>
            <Cut p={[[36, -8], [50, -10], [46, -1], [38, -2]]} fill={DARK} />
            {shut < 0.3 && <circle cx={44} cy={-7} r={1.6} fill="#fff" />}
          </g>
        </g>
      </g>
    </g>
  );
};
