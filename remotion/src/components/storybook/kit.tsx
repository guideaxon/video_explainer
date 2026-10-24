/**
 * Storybook style bundle kit: landscape (1280x720) illustrated films made of painted stills with slow camera moves,
 * dissolves, cutout layers and a title end card. Art files live in the project's `art/` folder (the project
 * directory is Remotion's public dir). See docs/storybook_video_style_guide.md.
 */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const fraunces = loadFraunces("normal", { weights: ["600"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["600"], subsets: ["latin"] });
export const HEAD = fraunces.fontFamily;
export const UI = inter.fontFamily;

export const W = 1280;
export const H = 720;
export const PAL = { paper: "#fbf1de", ink: "#3a2a20", terracotta: "#c8553d", teal: "#2f7d80", sky: "#bcd8e8" };

const ease = Easing.bezier(0.3, 0.1, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Move = "push-in" | "pull-out" | "pan-left" | "pan-right";

/** Where a move starts and ends: scale and horizontal drift in px. */
const MOVES: Record<Move, { s: [number, number]; x: [number, number] }> = {
  "push-in": { s: [1.0, 1.08], x: [0, -20] },
  "pull-out": { s: [1.08, 1.0], x: [-20, 0] },
  "pan-left": { s: [1.06, 1.06], x: [30, -30] },
  "pan-right": { s: [1.06, 1.06], x: [-30, 30] },
};

/** A painted still with one slow camera move across `frames` (default: the whole scene). */
export const PaintedShot: React.FC<{ art: string; move?: Move; frames?: number; children?: React.ReactNode }> = ({
  art,
  move = "push-in",
  frames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const total = frames ?? durationInFrames;
  const m = MOVES[move];
  const t = interpolate(frame, [0, total], [0, 1], { ...clamp, easing: ease });
  const scale = m.s[0] + (m.s[1] - m.s[0]) * t;
  const x = m.x[0] + (m.x[1] - m.x[0]) * t;
  const fade = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: PAL.paper, opacity: fade, overflow: "hidden" }}>
      <Img src={staticFile(art)} style={{ width: W, height: H, objectFit: "cover", transform: `translateX(${x}px) scale(${scale})` }} />
      {children}
      <Grain />
    </AbsoluteFill>
  );
};

const GRAIN_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>" +
  "<feColorMatrix values='0 0 0 0 0.23  0 0 0 0 0.16  0 0 0 0 0.12  0 0 0 1 0'/></filter><rect width='256' height='256' filter='url(#g)'/></svg>";

/** Paper grain overlay, about 8 percent. A tiled background image, so the browser rasterises it once, not every frame. */
export const Grain: React.FC = () => (
  <AbsoluteFill
    style={{ opacity: 0.08, mixBlendMode: "multiply", pointerEvents: "none", backgroundImage: `url("data:image/svg+xml;utf8,${encodeURIComponent(GRAIN_SVG)}")` }}
  />
);

/** A transparent PNG layer (hand, note, cassette) that travels from one point to another between two frames. */
export const Cutout: React.FC<{
  src: string;
  from: [number, number];
  to: [number, number];
  start?: number;
  end?: number;
  width?: number;
  rotate?: [number, number];
}> = ({ src, from, to, start = 0, end = 40, width = 300, rotate = [0, 0] }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [start, end], [0, 1], { ...clamp, easing: ease });
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t;
  const r = rotate[0] + (rotate[1] - rotate[0]) * t;
  return <Img src={staticFile(src)} style={{ position: "absolute", left: x, top: y, width, transform: `rotate(${r}deg)` }} />;
};

/** End card: title plus a pill button over the final still. */
export const EndCard: React.FC<{ art: string; title: string; button: string }> = ({ art, title, button }) => {
  const frame = useCurrentFrame();
  const a = interpolate(frame, [10, 26], [0, 1], { ...clamp, easing: ease });
  const b = interpolate(frame, [24, 40], [0, 1], { ...clamp, easing: ease });
  return (
    <PaintedShot art={art} move="pull-out">
      <div style={{ position: "absolute", top: 70, width: W, textAlign: "center", opacity: a, fontFamily: HEAD, fontSize: 76, fontWeight: 600, color: PAL.ink }}>{title}</div>
      <div style={{ position: "absolute", bottom: 70, width: W, display: "flex", justifyContent: "center", opacity: b }}>
        <div style={{ background: PAL.terracotta, color: "#fff", fontFamily: UI, fontWeight: 600, fontSize: 30, padding: "16px 36px", borderRadius: 14 }}>{button}</div>
      </div>
    </PaintedShot>
  );
};
