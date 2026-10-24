/**
 * Lowpoly style bundle kit: landscape (1280x720 design space) explainer films with a flat-shaded low-poly 3D
 * presenter in a calm room, slow camera pushes and a caption pill. Built on @remotion/three; no model or image files.
 * Lip sync (openness and Rhubarb mouth shapes) and captions come from `scenes/lipsync.ts`, written by scripts/_lipsync.py
 * (called by scripts/lowpoly_finalize_storyboard.py).
 * See docs/lowpoly_video_style_guide.md.
 */
import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { Presenter, PresenterProps } from "./character";
import { Room } from "./room";

export { Presenter } from "./character";
export type { Gesture, Mood, Look, PresenterProps } from "./character";
export { Room } from "./room";

const fraunces = loadFraunces("normal", { weights: ["500", "600"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["600"], subsets: ["latin"] });
export const HEAD = fraunces.fontFamily;
export const UI = inter.fontFamily;

/** Design space. The kit scales to the composition's real size (the renderer may use 1920x1080). */
export const W = 1280;
export const H = 720;
export const useScale = () => useVideoConfig().width / W;
export const PAL = { wall: "#a9ad93", ink: "#2a2622", clay: "#b4531f", sage: "#6f8a6b", cream: "#f3ecd9", caption: "rgba(28,26,24,0.72)" };

const ease = Easing.bezier(0.3, 0.1, 0.2, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export type Shot = "wide" | "medium" | "close";
export type Move = "push-in" | "pull-out" | "hold" | "drift-left" | "drift-right";

/** Camera framing presets: z is the distance, y the camera height, ty the look-at height. */
const SHOTS: Record<Shot, { z: number; y: number; ty: number }> = {
  wide: { z: 4.1, y: 0.62, ty: 0.42 },
  medium: { z: 3.45, y: 0.62, ty: 0.52 },
  close: { z: 2.25, y: 0.8, ty: 0.82 },
};

const Rig: React.FC<{ shot: Shot; move: Move; xOffset: number }> = ({ shot, move, xOffset }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { camera } = useThree();
  const s = SHOTS[shot];
  const t = interpolate(frame, [0, durationInFrames], [0, 1], { ...clamp, easing: ease });
  const dz = move === "push-in" ? -0.28 * t : move === "pull-out" ? -0.28 + 0.28 * t : 0;
  const dx = move === "drift-left" ? -0.18 * t : move === "drift-right" ? 0.18 * t : 0;
  camera.position.set(xOffset + dx, s.y, s.z + dz);
  camera.lookAt(xOffset + dx * 0.6, s.ty, 0);
  camera.updateProjectionMatrix();
  return null;
};

/** The 3D stage: canvas, camera rig and flat lighting. Children render in world space. */
export const Stage: React.FC<{ shot?: Shot; move?: Move; xOffset?: number; children: React.ReactNode }> = ({ shot = "medium", move = "push-in", xOffset = 0, children }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas width={width} height={height} camera={{ fov: 35, position: [0, 0.6, 3.2], near: 0.1, far: 40 }} style={{ background: "#9da187" }}>
      <Rig shot={shot} move={move} xOffset={xOffset} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#f3f1e4", "#8a6a4a", 0.35]} />
      <directionalLight position={[2.5, 4, 4]} intensity={1.15} />
      <directionalLight position={[-3, 2, 2]} intensity={0.3} color="#ffe9cc" />
      {children}
    </ThreeCanvas>
  );
};

/** Split narration into caption phrases (at punctuation, at most 7 words each). */
const phrases = (text: string): string[] => {
  const out: string[] = [];
  for (const part of text.split(/(?<=[,.;:!?])\s+/)) {
    const words = part.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length; i += 7) out.push(words.slice(i, i + 7).join(" "));
  }
  return out;
};

/** Caption pill: one phrase at a time, timed across the spoken part of the scene by character count. */
export const Captions: React.FC<{ text?: string; speechFrames?: number }> = ({ text, speechFrames }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const k = useScale();
  if (!text) return null;
  const list = phrases(text);
  const total = speechFrames ?? Math.round(durationInFrames * 0.9);
  const weights = list.map((p) => p.length + 6);
  const sum = weights.reduce((a, b) => a + b, 0);
  let start = 0;
  let current = list[list.length - 1];
  let at = 0;
  for (let i = 0; i < list.length; i++) {
    const end = start + (weights[i] / sum) * total;
    if (frame < end || i === list.length - 1) {
      current = list[i];
      at = frame - start;
      break;
    }
    start = end;
  }
  const a = interpolate(at, [0, 5], [0, 1], clamp);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 38 * k, display: "flex", justifyContent: "center", opacity: a }}>
      <div style={{ background: PAL.caption, color: "#fff", fontFamily: HEAD, fontWeight: 500, fontSize: 34 * k, padding: `${8 * k}px ${22 * k}px`, borderRadius: 12 * k, maxWidth: 1000 * k, textAlign: "center" }}>{current}</div>
    </div>
  );
};

/** Optional corner tag, like a channel mark. */
export const Tag: React.FC<{ text: string }> = ({ text }) => {
  const k = useScale();
  return <div style={{ position: "absolute", right: 36 * k, bottom: 44 * k, color: "#fff", opacity: 0.85, fontFamily: HEAD, fontSize: 26 * k }}>{text}</div>;
};

/** Title (max 4 words) and a pill button over the shot. */
export const EndCard: React.FC<{ title: string; button: string }> = ({ title, button }) => {
  const frame = useCurrentFrame();
  const k = useScale();
  const a = interpolate(frame, [10, 26], [0, 1], { ...clamp, easing: ease });
  const b = interpolate(frame, [24, 40], [0, 1], { ...clamp, easing: ease });
  return (
    <>
      <div style={{ position: "absolute", top: 54 * k, left: 0, right: 0, textAlign: "center", opacity: a, fontFamily: HEAD, fontSize: 70 * k, fontWeight: 600, color: "#fff", textShadow: `0 ${3 * k}px ${14 * k}px rgba(0,0,0,0.35)` }}>{title}</div>
      <div style={{ position: "absolute", bottom: 40 * k, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: b }}>
        <div style={{ background: PAL.clay, color: "#fff", fontFamily: UI, fontWeight: 600, fontSize: 28 * k, padding: `${14 * k}px ${34 * k}px`, borderRadius: 14 * k }}>{button}</div>
      </div>
    </>
  );
};

export type LowPolyShotProps = Omit<PresenterProps, "mouth" | "visemes"> & {
  shot?: Shot;
  move?: Move;
  /** `LIPSYNC.<scene>` from `scenes/lipsync.ts` (mouth openness per frame); omit for a syllable rhythm. */
  mouth?: number[];
  /** `VISEMES.<scene>` from `scenes/lipsync.ts` (Rhubarb mouth shapes; present when Rhubarb was installed). */
  visemes?: string;
  /** `CAPTIONS.<scene>` from `scenes/lipsync.ts`. */
  caption?: string;
  /** Length of speech in frames (default: the lip-sync length, else 90 percent of the scene). */
  speechFrames?: number;
  /** Which room props to show. */
  roomProps?: string[];
  /** Move the presenter along x (metres) to leave room for a panel. */
  presenterX?: number;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
};

/** One shot of the presenter in the room, with captions. The standard building block of a lowpoly scene. */
export const LowPolyShot: React.FC<LowPolyShotProps> = ({ shot, move, mouth, visemes, caption, speechFrames, roomProps, presenterX = 0, children, overlay, ...presenter }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 8], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ opacity: fade }}>
      <Stage shot={shot} move={move}>
        <Room props={roomProps} />
        <Presenter {...presenter} mouth={mouth} visemes={visemes} position={[presenterX, 0, 0]} />
        {children}
      </Stage>
      {overlay}
      <Captions text={caption} speechFrames={speechFrames ?? mouth?.length} />
    </AbsoluteFill>
  );
};
