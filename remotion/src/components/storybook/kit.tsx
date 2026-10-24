/**
 * Storybook style bundle kit: landscape (1280x720) illustrated films made of painted stills with slow camera moves,
 * dissolves, cutout layers and a title end card. Art files live in the project's `art/` folder (the project
 * directory is Remotion's public dir). See docs/storybook_video_style_guide.md.
 */
import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { cameraAt } from "./paint";
import type { Camera, Move } from "./paint";

const fraunces = loadFraunces("normal", { weights: ["600"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["600"], subsets: ["latin"] });
export const HEAD = fraunces.fontFamily;
export const UI = inter.fontFamily;

/** Design space. The kit scales to the composition's real size (the renderer may use 1920x1080), see `useScale`. */
export const W = 1280;
export const H = 720;
const useScale = () => useVideoConfig().width / W;
export const PAL = { paper: "#fbf1de", ink: "#3a2a20", terracotta: "#c8553d", teal: "#2f7d80", sky: "#bcd8e8" };

const ease = Easing.bezier(0.3, 0.1, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type { Move } from "./paint";

/** The camera of the enclosing `PaintedShot` (still file and current scale/drift), for layers glued to the still. */
const ShotContext = React.createContext<{ art: string; cam: Camera } | null>(null);
const camTransform = (cam: Camera, k: number) => `translateX(${cam.x * k}px) scale(${cam.scale})`;

/** A painted still with one slow camera move across `frames` (default: the whole scene). */
export const PaintedShot: React.FC<{ art: string; move?: Move; frames?: number; children?: React.ReactNode }> = ({
  art,
  move = "push-in",
  frames,
  children,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const k = useScale();
  const total = frames ?? durationInFrames;
  const t = interpolate(frame, [0, total], [0, 1], { ...clamp, easing: ease });
  const cam = cameraAt(move, t);
  const fade = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ background: PAL.paper, opacity: fade, overflow: "hidden" }}>
      <Img src={staticFile(art)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: camTransform(cam, k) }} />
      <ShotContext.Provider value={{ art, cam }}>{children}</ShotContext.Provider>
      <Grain />
    </AbsoluteFill>
  );
};

/**
 * A layer glued to the still inside `PaintedShot`: its children are SVG in still coordinates (1280x720, the still's
 * frame at scale 1) and follow the camera move, so a character drawn at a ground point stays on that ground.
 */
export const OnStill: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const shot = React.useContext(ShotContext);
  const k = useScale();
  const cam = shot?.cam ?? { scale: 1, x: 0 };
  return (
    <AbsoluteFill style={{ transform: camTransform(cam, k), pointerEvents: "none" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ overflow: "visible" }}>
        {children}
      </svg>
    </AbsoluteFill>
  );
};

/**
 * Foreground occlusion: a second copy of the still, masked to a polygon in still coordinates (a pot, a counter, a
 * door frame) and drawn over what came before it, so a character can stand behind it. Soft edge `feather` px.
 * Put it after the `OnStill` that holds the character. The mask is a static image, rasterised once.
 */
export const Foreground: React.FC<{ points: [number, number][]; feather?: number }> = ({ points, feather = 2 }) => {
  const shot = React.useContext(ShotContext);
  const k = useScale();
  const mask = React.useMemo(() => {
    const poly = points.map((p) => p.join(",")).join(" ");
    const svg =
      `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>` +
      `<filter id='f'><feGaussianBlur stdDeviation='${feather}'/></filter><polygon points='${poly}' fill='white' filter='url(#f)'/></svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
  }, [points, feather]);
  if (!shot) return null;
  return (
    <Img
      src={staticFile(shot.art)}
      style={{
        position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transform: camTransform(shot.cam, k),
        WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
      }}
    />
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
  const k = useScale();
  const t = interpolate(frame, [start, end], [0, 1], { ...clamp, easing: ease });
  const x = from[0] + (to[0] - from[0]) * t;
  const y = from[1] + (to[1] - from[1]) * t;
  const r = rotate[0] + (rotate[1] - rotate[0]) * t;
  return <Img src={staticFile(src)} style={{ position: "absolute", left: x * k, top: y * k, width: width * k, transform: `rotate(${r}deg)` }} />;
};

/** End card: title plus a pill button over the final still. */
export const EndCard: React.FC<{ art: string; title: string; button: string }> = ({ art, title, button }) => {
  const frame = useCurrentFrame();
  const k = useScale();
  const a = interpolate(frame, [10, 26], [0, 1], { ...clamp, easing: ease });
  const b = interpolate(frame, [24, 40], [0, 1], { ...clamp, easing: ease });
  return (
    <PaintedShot art={art} move="pull-out">
      <div style={{ position: "absolute", top: 70 * k, left: 0, right: 0, textAlign: "center", opacity: a, fontFamily: HEAD, fontSize: 76 * k, fontWeight: 600, color: PAL.ink }}>{title}</div>
      <div style={{ position: "absolute", bottom: 70 * k, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: b }}>
        <div style={{ background: PAL.terracotta, color: "#fff", fontFamily: UI, fontWeight: 600, fontSize: 30 * k, padding: `${16 * k}px ${36 * k}px`, borderRadius: 14 * k }}>{button}</div>
      </div>
    </PaintedShot>
  );
};
