/**
 * Clay style bundle kit: vertical (1080x1920, 9:16) claymation explainers on a cosy table-top set. Matte, soft-shaded
 * plasticine shapes with lumpy outlines and a baked fingerprint texture, felt and cardboard set pieces, warm lamp
 * light and soft drop shadows. Stop-motion feel: everything animates on a held-frame clock at 12 poses per second
 * ("on twos" at the fixed 30 fps) and every pose change "boils" (outline points and positions shift 1-2 px).
 * Star: Tuck, an original clay figure (a teal bean in a mustard bobble hat) with replacement mouths per Rhubarb shape.
 * See docs/clay_video_style_guide.md.
 *
 * Everything is one full-frame SVG (`ClayScene`); kit pieces are SVG groups placed in its 1080x1920 user space.
 * Layout: eyebrow y 160, headline y 250 to 560, wall visual y 560 to 1240, table top y 1240 to 1520 (characters and
 * props stand on `TABLE_Y`). Safe zone: y 160 to 1500, x 60 to 1020.
 */
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadFredoka } from "@remotion/google-fonts/Fredoka";
import { blinkAt, gestureT, mouthAt, visemeAt, walkAt } from "../rig";
import type { RigProps, Viseme } from "../rig";
import { TEX_SIZE, bakeTexture } from "./textures";
import { blobPath, boil, countAt, ellipsePts, heldFrame, jitter, poseOf, ramp, sausagePts, shade, slabPts } from "./geom";
import type { Pt } from "./geom";
import { STROKE, fitUnit, layoutLine } from "./letters";

export { heldFrame, poseOf } from "./geom";

const fredoka = loadFredoka("normal", { weights: ["500", "600"], subsets: ["latin"] });
export const ROUND = fredoka.fontFamily;

export const W = 1080;
export const H = 1920;
/** Where the wall meets the felt table, and the ground line characters and props stand on. */
export const WALL_Y = 1240;
export const TABLE_Y = 1420;

/** Plasticine colours (matte, warm). Every one gets a soft-shading gradient `cg-<name>` in `ClayScene`. */
export const CLAY = {
  teal: "#3d9a91", mustard: "#e2a42b", coral: "#e5674b", red: "#c94434", cream: "#f1e1c2", white: "#f9f1e2",
  brown: "#8c5b3b", choc: "#4e3123", green: "#68a64c", blue: "#4d7cc0", purple: "#8a6ab4", pink: "#ec97a6",
  gold: "#e8b636", mouth: "#5b2321",
} as const;
export type ClayColor = keyof typeof CLAY;
export const C = { ...CLAY, ink: "#3a2418", card: "#c79c66", shadow: "rgba(46,22,10,0.22)" } as const;

type Tone = { wall: string; wallTex: "card" | "felt"; table: string; title: ClayColor; accent: ClayColor; tag: string; tagInk: string };
export const TONES = {
  /** Corrugated cardboard backdrop, green felt table. Hook and data scenes. */
  card: { wall: "#c4935b", wallTex: "card", table: "#4e7b58", title: "white", accent: "coral", tag: "#efdcb8", tagInk: "#4e3123" },
  /** Deep blue felt backdrop, mustard felt table: the evening scenes, the lamp glows more. */
  night: { wall: "#33506c", wallTex: "felt", table: "#c58a35", title: "cream", accent: "mustard", tag: "#f1e1c2", tagInk: "#3a2418" },
  /** Dusty rose felt backdrop, teal felt table. Numbers and the wrap-up. */
  rose: { wall: "#c4837d", wallTex: "felt", table: "#3f8580", title: "white", accent: "mustard", tag: "#f6e6c8", tagInk: "#4e3123" },
} satisfies Record<string, Tone>;
export type ToneName = keyof typeof TONES;
const ToneCtx = React.createContext<Tone>(TONES.card);
export const useTone = () => React.useContext(ToneCtx);

/** The stop-motion clock: real frame, the held frame to animate at (12 poses per second) and the pose index. */
export const useClayClock = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return { frame, fps, hf: heldFrame(frame, fps), pose: poseOf(frame, fps) };
};
/** Spring pop evaluated on held frames, so it lands in a few distinct poses. */
const popAt = (hf: number, fps: number, from: number, damping = 11) =>
  spring({ frame: hf - from, fps, config: { damping, stiffness: 150 } });

// ---------------------------------------------------------------------------------------------------------------
// Defs: shading gradients and the baked textures (once per scene; same ids everywhere, same content).

const BakedDefs: React.FC = () => {
  const urls = useMemo(() => ({ clay: bakeTexture("clay", 7), felt: bakeTexture("felt", 11), card: bakeTexture("card", 5) }), []);
  const [handle] = useState(() => delayRender("Baking clay textures"));
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    Promise.all(
      Object.values(urls).filter(Boolean).map((u) => {
        const im = new Image();
        im.src = u;
        return im.decode().catch(() => undefined);
      }),
    ).then(finish, finish);
  }, [handle, urls]);
  const S = TEX_SIZE;
  return (
    <defs>
      {(Object.keys(CLAY) as ClayColor[]).map((k) => (
        <radialGradient key={k} id={`cg-${k}`} cx="0.42" cy="0.36" r="0.78" fx="0.36" fy="0.28">
          <stop offset="0%" stopColor={shade(CLAY[k], 0.2)} />
          <stop offset="52%" stopColor={CLAY[k]} />
          <stop offset="100%" stopColor={shade(CLAY[k], -0.3)} />
        </radialGradient>
      ))}
      <radialGradient id="soft-shadow">
        <stop offset="0%" stopColor="rgba(40,18,8,0.42)" />
        <stop offset="60%" stopColor="rgba(40,18,8,0.2)" />
        <stop offset="100%" stopColor="rgba(40,18,8,0)" />
      </radialGradient>
      <radialGradient id="warm-glow">
        <stop offset="0%" stopColor="rgba(255,206,130,0.55)" />
        <stop offset="45%" stopColor="rgba(255,180,100,0.18)" />
        <stop offset="100%" stopColor="rgba(255,170,90,0)" />
      </radialGradient>
      <radialGradient id="vignette" cx="0.5" cy="0.42" r="0.75">
        <stop offset="55%" stopColor="rgba(30,14,6,0)" />
        <stop offset="100%" stopColor="rgba(30,14,6,0.5)" />
      </radialGradient>
      <linearGradient id="table-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(30,14,6,0.28)" />
        <stop offset="25%" stopColor="rgba(30,14,6,0)" />
        <stop offset="100%" stopColor="rgba(255,240,210,0.08)" />
      </linearGradient>
      <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,214,140,0.42)" />
        <stop offset="100%" stopColor="rgba(255,214,140,0)" />
      </linearGradient>
      <pattern id="tex-clay" patternUnits="userSpaceOnUse" width={S} height={S}>
        <image href={urls.clay} width={S + 1} height={S + 1} />
      </pattern>
      <pattern id="tex-clay-b" patternUnits="userSpaceOnUse" width={S} height={S} patternTransform="rotate(57) scale(0.85)">
        <image href={urls.clay} width={S + 1} height={S + 1} />
      </pattern>
      {/* For glyph space (letters are drawn in 6-unit glyphs scaled ~17x): one tile spans 15 units. */}
      <pattern id="tex-clay-u" patternUnits="userSpaceOnUse" width={15} height={15}>
        <image href={urls.clay} width={15} height={15} />
      </pattern>
      <pattern id="tex-felt" patternUnits="userSpaceOnUse" width={S} height={S}>
        <image href={urls.felt} width={S + 1} height={S + 1} />
      </pattern>
      <pattern id="tex-card" patternUnits="userSpaceOnUse" width={S * 1.5} height={S * 1.5}>
        <image href={urls.card} width={S * 1.5} height={S * 1.5} />
      </pattern>
    </defs>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Primitives

/**
 * One piece of plasticine: matte radial shading, the baked fingerprint texture over it, a soft darker rim, and an
 * optional two-step soft drop shadow (light comes from the upper left, so shadows fall down-right).
 */
export const Clay: React.FC<{ d: string; color: ClayColor; shadow?: number; rim?: boolean; tex?: "a" | "b"; opacity?: number }> = ({ d, color, shadow = 0, rim = true, tex = "a", opacity = 1 }) => (
  <g opacity={opacity}>
    {shadow > 0 && (
      <>
        <path d={d} fill="rgba(46,22,10,0.1)" transform={`translate(${shadow} ${shadow * 1.3})`} />
        <path d={d} fill="rgba(46,22,10,0.13)" transform={`translate(${shadow * 0.5} ${shadow * 0.65})`} />
      </>
    )}
    <path d={d} fill={`url(#cg-${color})`} />
    <path d={d} fill={`url(#tex-clay${tex === "b" ? "-b" : ""})`} />
    {rim && <path d={d} fill="none" stroke={shade(CLAY[color], -0.42)} strokeOpacity={0.45} strokeWidth={2.5} />}
  </g>
);

/** A rolled clay snake along an open path (brows, smiles, handles, stems): rim, body, matte highlight, texture. */
export const Snake: React.FC<{ d: string; color: ClayColor; width: number; shadow?: boolean }> = ({ d, color, width, shadow = true }) => {
  const s = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g>
      {shadow && <path d={d} {...s} stroke="rgba(46,22,10,0.16)" strokeWidth={width} transform={`translate(${width * 0.3} ${width * 0.42})`} />}
      <path d={d} {...s} stroke={shade(CLAY[color], -0.3)} strokeWidth={width} />
      <path d={d} {...s} stroke={CLAY[color]} strokeWidth={width * 0.78} transform={`translate(${-width * 0.05} ${-width * 0.07})`} />
      <path d={d} {...s} stroke={shade(CLAY[color], 0.3)} strokeOpacity={0.55} strokeWidth={width * 0.28} transform={`translate(${-width * 0.16} ${-width * 0.2})`} />
      <path d={d} {...s} stroke="url(#tex-clay)" strokeWidth={width} />
    </g>
  );
};

/** Soft contact shadow on the table (radial gradient, no blur filter). */
export const ContactShadow: React.FC<{ x: number; y: number; rx: number; ry?: number; opacity?: number }> = ({ x, y, rx, ry = rx * 0.18, opacity = 1 }) => (
  <ellipse cx={x} cy={y} rx={rx} ry={ry} fill="url(#soft-shadow)" opacity={opacity} />
);

/** A lumpy ellipse / slab path for quick props. `pose` drives the boil (-1 = none). */
export const lumpEllipse = (cx: number, cy: number, rx: number, ry: number, seed: number, pose: number, lump = 0.035, n = 12) =>
  blobPath(ellipsePts(cx, cy, rx, ry, n), seed, pose, lump);
export const lumpSlab = (x: number, y: number, w: number, h: number, r: number, seed: number, pose: number, lump = 0.02) =>
  blobPath(slabPts(x, y, w, h, r), seed, pose, lump);

// ---------------------------------------------------------------------------------------------------------------
// Set: cardboard or felt wall, felt table with stitched edge, warm practical light, vignette.

/**
 * Scene surface: the table-top set in one SVG. `lamp` adds the clay desk lamp at that x on the table (it switches on
 * at `lampOn`) and pools warm light around it; without a lamp the warm light comes from the upper left.
 */
export const ClayScene: React.FC<{ tone: ToneName; lamp?: number; lampOn?: number; children?: React.ReactNode }> = ({ tone, lamp, lampOn = 0, children }) => {
  const T = TONES[tone];
  const { hf, pose } = useClayClock();
  const lit = lamp === undefined ? 1 : ramp(hf, lampOn, lampOn + 3);
  const flicker = lamp === undefined ? 1 : 0.94 + 0.06 * Math.abs(jitter(pose, 5));
  const glowX = lamp ?? 160;
  const glowY = lamp === undefined ? 300 : TABLE_Y - 330;
  return (
    <ToneCtx.Provider value={T}>
      <AbsoluteFill style={{ background: T.wall, overflow: "hidden" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          <BakedDefs />
          {/* wall */}
          <rect width={W} height={WALL_Y + 20} fill={T.wall} />
          <rect width={W} height={WALL_Y + 20} fill={`url(#tex-${T.wallTex})`} />
          {T.wallTex === "felt" && <path d={`M0 ${WALL_Y - 26} H${W}`} stroke={shade(T.wall, 0.45)} strokeWidth={4} strokeDasharray="16 12" opacity={0.6} />}
          {/* table top, front apron and the stitched felt edge */}
          <path d={`M0 ${WALL_Y} H${W} V1530 H0 Z`} fill={T.table} />
          <path d={`M0 ${WALL_Y} H${W} V1530 H0 Z`} fill="url(#tex-felt)" />
          <path d={`M0 ${WALL_Y} H${W} V1530 H0 Z`} fill="url(#table-shade)" />
          <rect x={0} y={1530} width={W} height={H - 1530} fill={shade(T.table, -0.38)} />
          <rect x={0} y={1530} width={W} height={H - 1530} fill="url(#tex-felt)" />
          <path d={`M0 1530 H${W}`} stroke={shade(T.table, -0.55)} strokeWidth={6} />
          <path d="M0 1548 H1080" stroke={shade(T.table, 0.5)} strokeWidth={4} strokeDasharray="18 12" opacity={0.75} />
          {lamp !== undefined && <Lamp x={lamp} on={lit} />}
          {children}
          {/* warm practical light, then the vignette: cheap gradients over everything */}
          <rect x={glowX - 950} y={glowY - 950} width={1900} height={1900} fill="url(#warm-glow)" opacity={(lamp === undefined ? 0.75 : 1) * lit * flicker} />
          <rect width={W} height={H} fill="url(#vignette)" />
        </svg>
      </AbsoluteFill>
    </ToneCtx.Provider>
  );
};

/** Clay desk lamp standing on the table at x; `on` 0..1 lights the bulb and the beam. Placed by `ClayScene lamp`. */
export const Lamp: React.FC<{ x: number; on?: number }> = ({ x, on = 1 }) => {
  const { pose } = useClayClock();
  const y = TABLE_Y - 40;
  return (
    <g>
      <path d={`M${x - 150} ${y - 175} L${x - 40} ${y - 175} L${x + 120} ${y + 40} L${x - 300} ${y + 40} Z`} fill="url(#beam)" opacity={on * 0.9} />
      <ContactShadow x={x + 14} y={y + 6} rx={120} />
      <Clay d={lumpEllipse(x, y - 10, 92, 30, 401, pose)} color="choc" shadow={6} />
      <Snake d={`M${x + 10} ${y - 30} L${x + 40} ${y - 210} L${x - 60} ${y - 300}`} color="mustard" width={26} />
      <Clay d={lumpEllipse(x + 40, y - 210, 22, 22, 402, pose)} color="choc" />
      <g transform={`rotate(-28 ${x - 90} ${y - 290})`}>
        <ellipse cx={x - 100} cy={y - 222} rx={46} ry={22} fill={`rgba(255,226,150,${0.25 + 0.75 * on})`} />
        <Clay d={blobPath([[x - 150, y - 230], [x - 120, y - 330], [x - 70, y - 345], [x - 40, y - 320], [x - 30, y - 230], [x - 90, y - 215]], 403, pose, 0.02)} color="red" shadow={6} />
      </g>
    </g>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Type: clay letters (headline, numbers), felt eyebrow tag, cardboard sub tag.

type Word = { text: string; x: number; y: number; cap: number; color: ClayColor | "rainbow"; from: number; seed: number; sagAt?: number; maxW?: number; align?: "left" | "center" };
const RAINBOW: ClayColor[] = ["coral", "mustard", "teal", "blue", "pink", "green", "purple"];

/** One line of chunky plasticine letters; each letter presses in (squash, then settles) one pose after the last. */
const ClayLine: React.FC<Word> = ({ text, x, y, cap, color, from, seed, sagAt, maxW = 920, align = "left" }) => {
  const { hf, pose, fps } = useClayClock();
  const u = fitUnit(text, cap, maxW);
  const { glyphs, width } = layoutLine(text);
  const x0 = align === "center" ? x - (width * u) / 2 : x;
  const sag = sagAt === undefined ? 0 : ramp(hf, sagAt, sagAt + 20);
  const s = { fill: "none", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <g>
      {glyphs.map((g) => {
        const p = popAt(hf, fps, from + g.index * 2, 9);
        if (p <= 0.01) return null;
        const k = seed * 97 + g.index;
        const col: ClayColor = color === "rainbow" ? RAINBOW[(g.index + seed) % RAINBOW.length] : color;
        const rot = jitter(k, 1) * 3 + boil(k, pose, 0, 0.7) + sag * jitter(k, 2) * 14;
        const dx = jitter(k, 3) * 2 + boil(k, pose, 1, 1.2) + sag * jitter(k, 4) * 10;
        const dy = jitter(k, 5) * 3 + boil(k, pose, 2, 1.2) + sag * (0.5 + 0.5 * hash01(k)) * cap * 0.35;
        const cx = (g.x + g.w / 2) * u;
        const sx = (1 + 0.3 * (1 - p)) * (1 + 0.28 * sag);
        const sy = Math.max(0.05, p) * (1 - 0.42 * sag);
        const tf = `translate(${x0 + cx + dx} ${y + 6 * u + dy}) rotate(${rot}) scale(${sx} ${sy}) translate(${-cx} ${-6 * u}) scale(${u}) translate(${g.x} 0)`;
        return (
          <g key={g.index} transform={tf}>
            <path d={g.d} {...s} stroke="rgba(46,22,10,0.13)" strokeWidth={STROKE + 0.4} transform="translate(0.45 0.62)" />
            <path d={g.d} {...s} stroke="rgba(46,22,10,0.16)" strokeWidth={STROKE + 0.1} transform="translate(0.22 0.3)" />
            <path d={g.d} {...s} stroke={shade(CLAY[col], -0.3)} strokeWidth={STROKE} />
            <path d={g.d} {...s} stroke={CLAY[col]} strokeWidth={STROKE * 0.8} transform="translate(-0.05 -0.07)" />
            <path d={g.d} {...s} stroke={shade(CLAY[col], 0.32)} strokeOpacity={0.55} strokeWidth={STROKE * 0.3} transform="translate(-0.19 -0.22)" />
            <path d={g.d} {...s} stroke="url(#tex-clay-u)" strokeWidth={STROKE} />
          </g>
        );
      })}
    </g>
  );
};
const hash01 = (k: number) => (jitter(k, 9) + 1) / 2;

/**
 * Headline in clay letters. Lines starting with `*` use the tone's accent clay; `rainbow` gives every letter its own
 * colour (title cards). Lines shrink to fit 920 px. `sagAt` makes the whole headline droop and squish (the gag).
 */
export const Title: React.FC<{ lines: string[]; y?: number; cap?: number; from?: number; rainbow?: boolean; sagAt?: number; align?: "left" | "center" }> = ({
  lines, y = 260, cap = 118, from = 4, rainbow = false, sagAt, align = "left",
}) => {
  const T = useTone();
  let start = from;
  return (
    <g>
      {lines.map((line, i) => {
        const accent = line.startsWith("*");
        const text = accent ? line.slice(1) : line;
        const el = (
          <ClayLine key={i} text={text} x={align === "center" ? W / 2 : 80} y={y + i * cap * 1.42} cap={cap} color={rainbow ? "rainbow" : accent ? T.accent : T.title} from={start} seed={i * 13 + 3} sagAt={sagAt === undefined ? undefined : sagAt + i * 4} align={align} />
        );
        start += text.replace(/\s/g, "").length * 2 + 2;
        return el;
      })}
    </g>
  );
};

/** Big clay number that counts up one step per pose (prefix/suffix stay put). `sagAt` droops it. */
export const ClayNumber: React.FC<{ value: number; x: number; y: number; cap?: number; prefix?: string; suffix?: string; decimals?: number; from?: number; dur?: number; color?: ClayColor; sagAt?: number; align?: "left" | "center"; maxW?: number }> = ({
  value, x, y, cap = 260, prefix = "", suffix = "", decimals = 0, from = 8, dur = 36, color = "mustard", sagAt, align = "center", maxW = 900,
}) => {
  const { hf } = useClayClock();
  const v = countAt(hf, from, dur, value, decimals);
  // Lay out at the final width so the number does not jump about while it counts.
  const finalText = `${prefix}${value.toFixed(decimals)}${suffix}`;
  const u = fitUnit(finalText, cap, maxW);
  const text = `${prefix}${v.toFixed(decimals)}${suffix}`;
  return <ClayLine text={text} x={x} y={y} cap={u * 6} maxW={maxW} color={color} from={from - 4} seed={41} sagAt={sagAt} align={align} />;
};

/** Felt ribbon tag with stitches: the eyebrow above the headline. */
export const Eyebrow: React.FC<{ children: string; y?: number; x?: number; from?: number }> = ({ children, y = 168, x = 80, from = 0 }) => {
  const T = useTone();
  const { hf, pose, fps } = useClayClock();
  const p = popAt(hf, fps, from, 12);
  const w = 60 + children.length * 21;
  return (
    <g opacity={Math.min(1, p * 2)} transform={`translate(${x + boil(3, pose, 0, 1)} ${y + boil(3, pose, 1, 1)}) rotate(-2) scale(${0.7 + 0.3 * p})`}>
      <path d={lumpSlab(0, 0, w, 62, 10, 21, -1)} fill="rgba(46,22,10,0.18)" transform="translate(5 7)" />
      <path d={lumpSlab(0, 0, w, 62, 10, 21, -1)} fill={CLAY[T.accent]} />
      <path d={lumpSlab(0, 0, w, 62, 10, 21, -1)} fill="url(#tex-felt)" />
      <rect x={10} y={10} width={w - 20} height={42} rx={6} fill="none" stroke={C.white} strokeOpacity={0.7} strokeWidth={3} strokeDasharray="10 8" />
      <text x={w / 2} y={42} textAnchor="middle" fontFamily={ROUND} fontWeight={600} fontSize={30} letterSpacing={4} fill={C.white}>{children.toUpperCase()}</text>
    </g>
  );
};

/** Lines a text of `size` px wraps to in `w` px (Fredoka averages about 0.52 em per character). */
const wrapLines = (text: string, size: number, w: number) => {
  const per = Math.max(4, Math.floor(w / (size * 0.52)));
  const out: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && (line + " " + word).length > per) {
      out.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) out.push(line);
  return out;
};

/** Cardboard tag with a rounded line of text (sub lines, labels). Wraps to `w`. */
export const Sub: React.FC<{ children: string; x?: number; y: number; w?: number; size?: number; from?: number; rot?: number }> = ({ children, x = 80, y, w = 920, size = 44, from = 18, rot = -1 }) => {
  const T = useTone();
  const { hf, pose, fps } = useClayClock();
  const p = popAt(hf, fps, from, 12);
  const lines = wrapLines(children, size, w - 70);
  const h = lines.length * size * 1.25 + 46;
  return (
    <g opacity={Math.min(1, p * 2)} transform={`translate(${x + boil(5, pose, 0, 1)} ${y + boil(5, pose, 1, 1) + (1 - p) * 30}) rotate(${rot})`}>
      <path d={lumpSlab(0, 0, w, h, 16, 31, -1)} fill="rgba(46,22,10,0.2)" transform="translate(7 9)" />
      <path d={lumpSlab(0, 0, w, h, 16, 31, -1)} fill={T.tag} />
      <path d={lumpSlab(0, 0, w, h, 16, 31, -1)} fill="url(#tex-card)" />
      {lines.map((l, i) => (
        <text key={i} x={35} y={23 + size * 0.95 + i * size * 1.25} fontFamily={ROUND} fontWeight={500} fontSize={size} fill={T.tagInk}>{l}</text>
      ))}
    </g>
  );
};

/** Cardboard speech bubble cut with scissors; the tail points down-left at the speaker. */
export const Bubble: React.FC<{ children: string; x: number; y: number; w?: number; size?: number; from?: number; tail?: "left" | "right" }> = ({ children, x, y, w = 560, size = 44, from = 12, tail = "left" }) => {
  const T = useTone();
  const { hf, pose, fps } = useClayClock();
  const p = popAt(hf, fps, from, 10);
  const lines = wrapLines(children, size, w - 70);
  const h = lines.length * size * 1.25 + 50;
  const tx = tail === "left" ? 70 : w - 70;
  const d = blobPath([...slabPts(0, 0, w, h, 40)], 61, pose, 0.012, 1);
  const tailD = `M${tx - 26} ${h - 6} L${tx + (tail === "left" ? -40 : 40)} ${h + 70} L${tx + 34} ${h - 6} Z`;
  return (
    <g opacity={Math.min(1, p * 2)} transform={`translate(${x} ${y}) scale(${0.6 + 0.4 * p})`}>
      <g transform="translate(7 9)" fill="rgba(46,22,10,0.2)"><path d={d} /><path d={tailD} /></g>
      <g fill={T.tag}><path d={d} /><path d={tailD} /></g>
      <g fill="url(#tex-card)"><path d={d} /><path d={tailD} /></g>
      {lines.map((l, i) => (
        <text key={i} x={35} y={25 + size * 0.95 + i * size * 1.25} fontFamily={ROUND} fontWeight={600} fontSize={size} fill={T.tagInk}>{l}</text>
      ))}
    </g>
  );
};

/** Cardboard stat card: felt label strip, then a big clay number counting up. */
export const StatCard: React.FC<{ x: number; y: number; w?: number; h?: number; label: string; value: number; prefix?: string; suffix?: string; decimals?: number; from?: number; color?: ClayColor; sagAt?: number }> = ({
  x, y, w = 920, h = 420, label, value, prefix = "", suffix = "", decimals = 0, from = 8, color = "mustard", sagAt,
}) => {
  const T = useTone();
  const { hf, pose, fps } = useClayClock();
  const p = popAt(hf, fps, from, 12);
  const card = lumpSlab(0, 0, w, h, 26, 71, -1);
  return (
    <g>
      <g opacity={Math.min(1, p * 2)} transform={`translate(${x + boil(7, pose, 0, 1)} ${y + boil(7, pose, 1, 1)}) rotate(-1.2) scale(${0.85 + 0.15 * p})`}>
        <path d={card} fill="rgba(46,22,10,0.22)" transform="translate(9 12)" />
        <path d={card} fill={C.card} />
        <path d={card} fill="url(#tex-card)" />
        <path d={lumpSlab(30, 30, w - 60, 78, 12, 72, -1)} fill={CLAY[T.accent]} />
        <path d={lumpSlab(30, 30, w - 60, 78, 12, 72, -1)} fill="url(#tex-felt)" />
        <rect x={42} y={42} width={w - 84} height={54} rx={8} fill="none" stroke={C.white} strokeOpacity={0.65} strokeWidth={3} strokeDasharray="10 8" />
        <text x={w / 2} y={82} textAnchor="middle" fontFamily={ROUND} fontWeight={600} fontSize={36} letterSpacing={3} fill={C.white}>{label.toUpperCase()}</text>
      </g>
      {p > 0.3 && <ClayNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} x={x + w / 2} y={y + 150} cap={Math.min(220, h - 190)} maxW={w - 80} from={from + 6} color={color} sagAt={sagAt} />}
    </g>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Props: mug with cotton-wool steam, potted plant, coin pot, coins, stacks of clay pucks.

/** Clay mug on the table, with cotton-wool steam puffs that boil. */
export const Mug: React.FC<{ x: number; y?: number; color?: ClayColor; scale?: number }> = ({ x, y = TABLE_Y, color = "blue", scale = 1 }) => {
  const { hf, pose } = useClayClock();
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ContactShadow x={14} y={2} rx={90} />
      <Snake d="M50 -110 Q105 -110 100 -70 Q95 -36 50 -40" color={color} width={20} />
      <Clay d={lumpSlab(-60, -150, 120, 150, 26, 81, pose)} color={color} shadow={6} />
      <Clay d={lumpEllipse(0, -148, 58, 14, 82, pose)} color="choc" rim={false} />
      {[0, 1, 2].map((i) => {
        const t = ((hf / 30 + i / 3) % 1);
        return <path key={i} d={lumpEllipse(jitter(i, 3) * 12 + Math.sin(t * 6 + i) * 10, -180 - t * 150, 26 - t * 10, 20 - t * 8, 90 + i, pose, 0.12)} fill={C.white} opacity={0.75 * (1 - t)} />;
      })}
    </g>
  );
};

/** Terracotta pot with clay leaves. */
export const Plant: React.FC<{ x: number; y?: number; scale?: number }> = ({ x, y = TABLE_Y, scale = 1 }) => {
  const { pose, hf } = useClayClock();
  const sway = Math.sin(hf / 20) * 2;
  const leaves: [number, number, number][] = [[-48, -250, -38], [44, -265, 34], [-8, -320, -4], [-70, -200, -62], [72, -205, 58]];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ContactShadow x={16} y={2} rx={100} />
      <g transform={`rotate(${sway} 0 -150)`}>
        {leaves.map(([lx, ly, r], i) => (
          <g key={i} transform={`rotate(${r} ${lx} ${ly})`}>
            <Clay d={lumpEllipse(lx, ly, 30, 70, 110 + i, pose, 0.05)} color="green" tex="b" />
            <path d={`M${lx} ${ly + 60} Q${lx + 4} ${ly} ${lx} ${ly - 50}`} stroke={shade(CLAY.green, -0.35)} strokeWidth={4} fill="none" opacity={0.6} />
          </g>
        ))}
      </g>
      <Clay d={blobPath([[-80, -150], [80, -150], [62, 0], [-62, 0]], 120, pose, 0.02)} color="coral" shadow={7} />
      <Clay d={lumpSlab(-92, -175, 184, 42, 14, 121, pose)} color="coral" tex="b" />
    </g>
  );
};

/** Round clay money pot with a coin slot on top. */
export const Pot: React.FC<{ x: number; y?: number; color?: ClayColor; scale?: number; from?: number }> = ({ x, y = TABLE_Y, color = "pink", scale = 1, from = 0 }) => {
  const { hf, pose, fps } = useClayClock();
  const p = from > 0 ? popAt(hf, fps, from, 10) : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * (1 + 0.2 * (1 - p))} ${scale * p})`}>
      <ContactShadow x={16} y={2} rx={150} />
      <Clay d={lumpEllipse(0, -130, 150, 135, 130, pose, 0.03, 14)} color={color} shadow={9} />
      <Clay d={lumpEllipse(0, -250, 70, 22, 131, pose)} color={color} tex="b" />
      <path d={lumpSlab(-42, -262, 84, 18, 9, 132, pose)} fill={C.choc} />
      <Clay d={lumpEllipse(-58, -120, 13, 13, 133, pose)} color="choc" rim={false} />
      <Clay d={lumpEllipse(58, -120, 13, 13, 134, pose)} color="choc" rim={false} />
      <Snake d="M-30 -70 Q0 -48 30 -70" color="choc" width={10} shadow={false} />
    </g>
  );
};

/** A clay coin seen face on. `dropAt` lets it fall (gravity, held poses) to `dropTo`; `hide` makes it vanish there (into a slot). */
export const Coin: React.FC<{ x: number; y: number; r?: number; from?: number; dropAt?: number; dropTo?: number; dur?: number; hide?: boolean }> = ({ x, y, r = 44, from = 0, dropAt, dropTo, dur = 12, hide = false }) => {
  const { hf, pose, fps } = useClayClock();
  const p = from > 0 ? popAt(hf, fps, from, 10) : 1;
  let cy = y;
  if (dropAt !== undefined && dropTo !== undefined) {
    const t = Math.max(0, Math.min(1, (hf - dropAt) / dur));
    cy = y + (dropTo - y) * t * t;
    if (hide && hf >= dropAt + dur) return null;
  }
  return (
    <g transform={`translate(${x} ${cy}) scale(${p})`}>
      <Clay d={lumpEllipse(0, 0, r, r, 140, pose, 0.025)} color="gold" shadow={6} />
      <path d={lumpEllipse(0, 0, r * 0.66, r * 0.66, 141, pose, 0.03)} fill="none" stroke={shade(CLAY.gold, -0.35)} strokeWidth={5} opacity={0.6} />
    </g>
  );
};

/**
 * A column of hand-stacked clay pucks standing on the table at x (the bar of a clay chart). Pucks drop in one per
 * pose from `from`. `toppleAt` knocks the column over: the pucks tumble to the table, top first (the mishap gag).
 */
export const Stack: React.FC<{ x: number; count: number; color?: ClayColor; y?: number; w?: number; from?: number; toppleAt?: number; dir?: 1 | -1; seed?: number }> = ({
  x, count, color = "coral", y = TABLE_Y, w = 130, from = 6, toppleAt, dir = 1, seed = 1,
}) => {
  const { hf, pose } = useClayClock();
  const step = 34;
  return (
    <g>
      <ContactShadow x={x + 16} y={y + 2} rx={w * 0.85} />
      {Array.from({ length: count }, (_, i) => {
        const at = from + i * 3;
        if (hf < at) return null;
        const k = seed * 131 + i;
        const land = Math.min(1, (hf - at) / 5);
        let px = x + jitter(k, 1) * 7;
        let py = y - i * step - (1 - land) * 46;
        let rot = jitter(k, 2) * 2.5;
        if (toppleAt !== undefined && hf > toppleAt) {
          const t = Math.max(0, Math.min(1, (hf - toppleAt - (count - 1 - i) * 1.2) / 14));
          const tx = x + dir * (80 + i * 28 + jitter(k, 3) * 20);
          const ty = y + jitter(k, 4) * 30 + 10;
          px = px + (tx - px) * t;
          py = py + (ty - py) * t * t;
          rot = rot + dir * t * (40 + i * 9 + jitter(k, 5) * 30);
        }
        const squash = land < 1 ? 1 + 0.15 * (1 - land) : 1;
        return (
          <g key={i} transform={`translate(${px} ${py}) rotate(${rot}) scale(${squash} ${1 / squash})`}>
            <Clay d={lumpSlab(-w / 2, -30, w, 30, 14, k, pose)} color={color} shadow={4} />
            <Clay d={lumpEllipse(0, -30, w / 2 - 2, 11, k + 500, pose, 0.02)} color={color} tex="b" rim={false} />
          </g>
        );
      })}
    </g>
  );
};

/** Clay chart: one `Stack` per bar on the table between x0 and x1, with cardboard labels in front. */
export const Bars: React.FC<{ x0?: number; x1?: number; bars: { label: string; value: number; color: ClayColor }[]; from?: number }> = ({ x0 = 380, x1 = 1000, bars, from = 8 }) => {
  const T = useTone();
  const { pose } = useClayClock();
  const gap = (x1 - x0) / bars.length;
  return (
    <g>
      {bars.map((b, i) => {
        const cx = x0 + gap * (i + 0.5);
        return (
          <g key={i}>
            <Stack x={cx} count={b.value} color={b.color} w={Math.min(130, gap - 24)} from={from + i * 5} seed={i + 3} />
            <g transform={`translate(${cx} ${TABLE_Y + 50}) rotate(${jitter(i, 8) * 3})`}>
              <path d={lumpSlab(-62, -26, 124, 54, 10, 150 + i, pose)} fill={T.tag} />
              <path d={lumpSlab(-62, -26, 124, 54, 10, 150 + i, pose)} fill="url(#tex-card)" />
              <text y={13} textAnchor="middle" fontFamily={ROUND} fontWeight={600} fontSize={32} fill={T.tagInk}>{b.label}</text>
            </g>
          </g>
        );
      })}
    </g>
  );
};

// ---------------------------------------------------------------------------------------------------------------
// Tuck: the original clay character.

export type TuckGesture = "rest" | "wave" | "point" | "shrug" | "cheer";
export type TuckLook = "camera" | "left" | "right" | "up" | "down";

/** Hand targets (character space, ground at y 0) for [right (+x), left (-x)] per gesture. */
const HANDS: Record<TuckGesture, [Pt, Pt]> = {
  rest: [[205, -185], [-205, -185]],
  wave: [[255, -560], [-205, -185]],
  point: [[375, -380], [-205, -190]],
  shrug: [[285, -420], [-285, -420]],
  cheer: [[215, -650], [-215, -650]],
};
const BROW_LIFT: Record<TuckGesture, [number, number]> = { rest: [0, 0], wave: [6, 6], point: [12, -2], shrug: [16, 16], cheer: [12, 12] };
const BODY: Pt[] = [
  [0, -560], [80, -548], [138, -508], [164, -440], [172, -360], [185, -280], [200, -200], [195, -130], [160, -95], [80, -80],
  [0, -78], [-80, -80], [-160, -95], [-195, -130], [-200, -200], [-185, -280], [-172, -360], [-164, -440], [-138, -508], [-80, -548],
];
const HAT: Pt[] = [[-150, -515], [-160, -565], [-136, -615], [-80, -648], [0, -660], [80, -648], [136, -615], [160, -565], [150, -515], [75, -506], [0, -503], [-75, -506]];

type MouthPiece = { cavity?: [number, number]; teeth?: number; tongue?: [number, number, number]; lip?: boolean; ring?: [number, number]; snake?: string };
/**
 * Replacement mouths, one clay piece per Rhubarb shape (as real claymation swaps a sculpted mouth per sound). Units
 * are px around the mouth centre: cavity (rx, ry), a teeth band height on top, a tongue (y, rx, ry), a lower-lip
 * roll over the teeth (G), a puckered lip ring (F), or a closed snake path (A, X).
 */
const MOUTHS: Record<Viseme, MouthPiece> = {
  X: { snake: "M-36,-6 Q0,20 36,-6" },
  A: { snake: "M-32,0 Q0,5 32,0" },
  B: { cavity: [34, 10], teeth: 8 },
  C: { cavity: [37, 21], teeth: 9, tongue: [12, 20, 8] },
  D: { cavity: [41, 34], teeth: 10, tongue: [20, 26, 13] },
  E: { cavity: [27, 25], tongue: [12, 16, 9] },
  F: { ring: [26, 24], cavity: [11, 12] },
  G: { cavity: [34, 14], teeth: 14, lip: true },
  H: { cavity: [35, 23], teeth: 8, tongue: [-4, 18, 9] },
};

const Mouth: React.FC<{ shape: Viseme; pose: number }> = ({ shape, pose }) => {
  const m = MOUTHS[shape];
  const lipColor: ClayColor = "teal";
  if (m.snake) {
    return (
      <g>
        <Snake d={m.snake} color="choc" width={shape === "A" ? 12 : 10} shadow={false} />
        {shape === "A" && [-36, 36].map((x) => <circle key={x} cx={x} cy={1} r={4} fill={shade(CLAY.teal, -0.4)} opacity={0.7} />)}
      </g>
    );
  }
  const [rx, ry] = m.cavity ?? [10, 10];
  const cav = lumpEllipse(0, 0, rx, ry, 300 + shape.charCodeAt(0), pose, 0.05, 10);
  return (
    <g>
      {m.ring && <Clay d={lumpEllipse(0, 0, m.ring[0], m.ring[1], 310, pose, 0.06, 10)} color={lipColor} />}
      <path d={cav} fill={CLAY.mouth} />
      {m.tongue && <Clay d={lumpEllipse(0, m.tongue[0], m.tongue[1], m.tongue[2], 320, pose, 0.05, 10)} color="pink" rim={false} />}
      {m.teeth && <path d={lumpSlab(-rx * 0.72, -ry - 1, rx * 1.44, m.teeth + 2, 4, 330, pose, 0.03)} fill={C.white} />}
      {m.lip && <Snake d={`M${-rx * 0.8},${ry * 0.35} Q0,${ry * 0.9} ${rx * 0.8},${ry * 0.35}`} color="coral" width={11} shadow={false} />}
      <path d={cav} fill="none" stroke={shade(CLAY.teal, -0.38)} strokeWidth={5} opacity={0.85} />
    </g>
  );
};

/** Upper eyelid as a clay cap over the eye: covers the eye from its top down to `c` (0 open .. 1 shut). */
const lidPath = (ex: number, ey: number, r: number, c: number) => {
  const B = ey - r + 2 * r * Math.min(1, Math.max(0, c));
  const half = Math.sqrt(Math.max(0, r * r - (B - ey) * (B - ey)));
  if (half < 1) return "";
  const large = B > ey ? 1 : 0;
  return `M${ex - half},${B} A${r},${r} 0 ${large} 1 ${ex + half},${B} Q${ex},${B + half * 0.35} ${ex - half},${B} Z`;
};

/**
 * Tuck: an original plasticine figure, a teal bean with a mustard bobble hat, bead eyes under heavy clay lids, a
 * coral nose, cream belly and red shoes. About 700 px tall at scale 1, (x, y) is the ground point between the feet.
 * Rig (shared contract, all on the held 12-poses-per-second clock): talks from `mouth`/`visemes` (`scenes/lipsync.ts`,
 * indexed with the real 30 fps frame at the start of each held pose) with one replacement mouth per Rhubarb shape;
 * blinks on the shared rhythm; `gesture` wave / point / shrug / cheer from `gestureAt` (and back from
 * `gestureFrom`); walks from `x` to `walkTo` during `walk` (feet land at multiples of PI). `from` squash-pops it in.
 */
export const Tuck: React.FC<RigProps<TuckGesture, TuckLook> & { x: number; y?: number; scale?: number; from?: number; walkTo?: number; gestureFrom?: TuckGesture; hat?: ClayColor }> = ({
  x, y = TABLE_Y, scale = 1, from, walkTo, mouth, visemes, talking, blink = true, gesture = "rest", gestureAt = 0, gestureFrom = "rest", walk, look, seed = 0, hat = "mustard",
}) => {
  const { hf, pose, fps } = useClayClock();
  const pop = from === undefined ? 1 : popAt(hf, fps, from, 9);
  const w = walkAt(walk, hf, fps);
  const cx = walk && walkTo !== undefined ? x + (walkTo - x) * w.progress : x;
  const dir = walk && walkTo !== undefined && walkTo !== x ? Math.sign(walkTo - x) : 0;
  const walking = w.active;
  const stride = walking ? Math.cos(w.phase) : 0;
  const liftR = walking ? Math.max(0, Math.sin(w.phase)) * 28 : 0;
  const liftL = walking ? Math.max(0, -Math.sin(w.phase)) * 28 : 0;
  const bob = walking ? -Math.abs(Math.sin(w.phase)) * 12 : 0;
  const rig = { mouth, visemes, talking };
  const open = mouthAt(rig, hf);
  const shape = visemeAt(rig, hf);
  const g = gesture === "rest" && gestureFrom === "rest" ? 0 : gestureT(hf, gestureAt);
  const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const [hr0, hl0] = HANDS[gestureFrom];
  const [hr1, hl1] = HANDS[gesture];
  let handR = lerp(hr0, hr1, g);
  let handL = lerp(hl0, hl1, g);
  if (gesture === "wave") handR = [handR[0] + Math.sin((hf - gestureAt) / 3) * 34 * g, handR[1]];
  if (gesture === "cheer") handR = [handR[0], handR[1] + Math.sin((hf - gestureAt) / 4) * 14 * g], handL = [handL[0], handL[1] + Math.cos((hf - gestureAt) / 4) * 14 * g];
  const restR = gesture === "rest" || (gesture !== "shrug" && gesture !== "cheer" && gesture !== "wave" && gesture !== "point");
  if (walking) {
    if (restR || gesture === "point" ? false : true) handR = [handR[0], handR[1]];
    handR = gesture === "rest" ? [handR[0] - stride * 30, handR[1] - Math.abs(stride) * 6] : handR;
    handL = gesture === "rest" || gesture === "wave" || gesture === "point" ? [handL[0] + stride * 30, handL[1] - Math.abs(stride) * 6] : handL;
  }
  const lookDir: TuckLook = look ?? (walking ? (dir > 0 ? "right" : dir < 0 ? "left" : "camera") : gesture === "point" && g > 0.5 ? "right" : "camera");
  const gaze = { camera: [0, 3], left: [-12, 2], right: [12, 2], up: [0, -11], down: [0, 11] }[lookDir];
  const shut = blink ? blinkAt(hf, fps, seed) : 0;
  const lid = 0.1 + 0.9 * shut;
  const lean = walking ? dir * 3 : 0;
  const talkTilt = Math.sin(hf / 37 + seed) * 1.2 + open * 1.5;
  const breathe = 1 + 0.012 * Math.sin(hf / 14 + seed);
  const [bl, br] = BROW_LIFT[gesture].map((v) => v * g + 4 * open);
  const sd = seed * 1000;
  const b = (i: number) => boil(sd + 9, pose, i, 1.5);

  const shoulderR: Pt = [140, -320];
  const shoulderL: Pt = [-140, -320];
  const elbow = (s: Pt, h: Pt, side: number): Pt => [(s[0] + h[0]) / 2 + side * 22, (s[1] + h[1]) / 2 + 14];
  const arm = (s: Pt, h: Pt, side: number, k: number) => blobPath(sausagePts([s, elbow(s, h, side), h], 27), sd + k, pose, 0.03);
  const footR: Pt = [62 + stride * 46, -26 - liftR];
  const footL: Pt = [-62 - stride * 46, -26 - liftL];
  const hand = (h: Pt, side: number, k: number, pointing: boolean) => (
    <g>
      <Clay d={lumpEllipse(h[0], h[1], 32, 29, sd + k, pose, 0.05, 10)} color="cream" />
      <Clay d={lumpEllipse(h[0] - side * 22, h[1] - 18, 12, 15, sd + k + 1, pose, 0.05, 8)} color="cream" />
      {pointing && <Clay d={blobPath(sausagePts([[h[0] + 18, h[1] - 4], [h[0] + 66, h[1] - 10]], 11), sd + k + 2, pose, 0.03)} color="cream" />}
    </g>
  );
  return (
    <g transform={`translate(${cx} ${y}) scale(${scale})`}>
      <ContactShadow x={18} y={0} rx={240 * (1 - 0.1 * Math.abs(Math.sin(w.phase)) * (walking ? 1 : 0))} ry={34} />
      <g transform={`scale(${1 + 0.25 * (1 - pop)} ${pop})`}>
        {/* legs and shoes */}
        {[[footL, -1, 10] as const, [footR, 1, 20] as const].map(([f, side, k]) => (
          <g key={k}>
            <Clay d={blobPath(sausagePts([[side * 62, -110], [f[0], f[1] - 16]], 30), sd + k, pose, 0.03)} color="teal" tex="b" />
            <Clay d={lumpEllipse(f[0] + side * 12 + dir * 14, f[1] + 2, 54, 27, sd + k + 3, pose, 0.04)} color="red" shadow={4} />
          </g>
        ))}
        <g transform={`translate(0 ${bob + b(0)}) rotate(${lean + talkTilt} 0 -90) scale(1 ${breathe})`} style={{ transformBox: "view-box" }}>
          {/* body, belly, cheeks */}
          <Clay d={blobPath(BODY, sd + 1, pose, 0.018)} color="teal" shadow={8} />
          <Clay d={lumpEllipse(0, -190, 108, 82, sd + 2, pose, 0.04)} color="cream" tex="b" />
          <ellipse cx={-96} cy={-362} rx={20} ry={12} fill={CLAY.pink} opacity={0.6} />
          <ellipse cx={96} cy={-362} rx={20} ry={12} fill={CLAY.pink} opacity={0.6} />
          {[[-104, -350], [-90, -342], [-112, -340], [104, -350], [90, -342], [112, -340]].map(([fx, fy], i) => (
            <circle key={i} cx={fx + b(30 + i) * 0.3} cy={fy} r={2.6} fill={CLAY.brown} opacity={0.7} />
          ))}
          {/* eyes: bead eyes under clay lids */}
          {[-46, 46].map((ex, i) => (
            <g key={ex}>
              <Clay d={lumpEllipse(ex, -432, 38, 38, sd + 40 + i, pose, 0.025)} color="white" />
              <circle cx={ex + gaze[0] + b(50 + i) * 0.4} cy={-432 + gaze[1]} r={15} fill={C.ink} />
              <circle cx={ex + gaze[0] - 5} cy={-438 + gaze[1]} r={4} fill={C.white} opacity={0.6} />
              <Clay d={lidPath(ex, -432, 40, lid)} color="teal" rim={false} />
              <path d={lidPath(ex, -432, 40, lid)} fill="none" stroke={shade(CLAY.teal, -0.45)} strokeWidth={4} opacity={0.7} />
            </g>
          ))}
          {/* brows */}
          <Snake d={`M-72,${-488 - bl} Q-46,${-500 - bl} -20,${-490 - bl}`} color="choc" width={12} shadow={false} />
          <Snake d={`M20,${-490 - br} Q46,${-500 - br} 72,${-488 - br}`} color="choc" width={12} shadow={false} />
          {/* nose and replacement mouth */}
          <g transform="translate(0 -322)">
            <Mouth shape={shape} pose={pose} />
          </g>
          <Clay d={lumpEllipse(0, -380, 24, 20, sd + 60, pose, 0.05, 10)} color="coral" shadow={4} />
          {/* hat: dome, ribbed cuff, pom-pom */}
          <Clay d={blobPath(HAT, sd + 70, pose, 0.02)} color={hat} shadow={6} />
          <Clay d={lumpSlab(-168, -566, 336, 64, 28, sd + 71, pose, 0.015)} color={hat} tex="b" />
          {Array.from({ length: 13 }, (_, i) => -144 + i * 24).map((rx) => (
            <path key={rx} d={`M${rx} -556 L${rx + 1} -512`} stroke={shade(CLAY[hat], -0.4)} strokeWidth={5} strokeLinecap="round" opacity={0.45} />
          ))}
          <Clay d={lumpEllipse(0, -690, 42, 40, sd + 72, pose, 0.12, 16)} color="coral" shadow={5} />
          {/* arms (in front of the body) and mitten hands */}
          <Clay d={arm(shoulderL, handL, -1, 80)} color="teal" />
          {hand(handL, -1, 82, false)}
          <Clay d={arm(shoulderR, handR, 1, 90)} color="teal" />
          {hand(handR, 1, 92, gesture === "point" && g > 0.6)}
        </g>
      </g>
    </g>
  );
};

/** "SAMPLE CONTENT" note under the safe zone. */
export const SampleTag: React.FC = () => (
  <text x={W / 2} y={1600} textAnchor="middle" fontFamily={ROUND} fontWeight={500} fontSize={24} letterSpacing={6} fill={C.white} opacity={0.75}>SAMPLE CONTENT</text>
);
