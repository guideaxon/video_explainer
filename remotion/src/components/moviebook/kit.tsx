/**
 * MovieBook style bundle kit: landscape (1280x720, 30 fps composition) films made of locally generated image-to-video clips
 * (Qwen-Image keyframe, then MiniMax H3), one clip per scene. The clip carries its own dialogue audio, which the
 * pipeline extracts to voiceover/<scene>.mp3, so the video layer here is muted. The project directory is Remotion's
 * public dir (clips in `moviebook/clips/`). See docs/moviebook_video_style_guide.md.
 */
import React from "react";
import { AbsoluteFill, Easing, Freeze, interpolate, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { captionOpacity, clipFrameAt, isHolding } from "./timing";

const fraunces = loadFraunces("normal", { weights: ["600"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["600"], subsets: ["latin"] });
export const HEAD = fraunces.fontFamily;
// Latin from Inter; Chinese falls through to a system CJK face (no network font subset needed at render time).
export const UI = `${inter.fontFamily}, "Noto Sans SC", "Microsoft YaHei", "PingFang SC", sans-serif`;

/** Design space; the kit scales to the composition's real size (the renderer may use 1920x1080). */
export const W = 1280;
export const H = 720;
const useScale = () => useVideoConfig().width / W;
export const PAL = { ink: "#14110f", paper: "#f6efe3", accent: "#e0803a", female: "#f2b6c6", male: "#9cc7e8" };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.3, 0.1, 0.2, 1);

export type Dialogue = { speaker: string; text: string; tone?: "female" | "male" | "neutral" };

/** Subtitle pill: speaker name in the character's tone colour, then the line. Fades with the scene. */
export const Subtitle: React.FC<{ dialogue?: Dialogue }> = ({ dialogue }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const k = useScale();
  if (!dialogue || !dialogue.text) return null;
  const tone = dialogue.tone === "female" ? PAL.female : dialogue.tone === "male" ? PAL.male : PAL.paper;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 44 * k, display: "flex", justifyContent: "center", opacity: captionOpacity(frame, durationInFrames) }}>
      <div style={{ maxWidth: 1000 * k, background: "rgba(20,17,15,0.72)", color: PAL.paper, fontFamily: UI, fontWeight: 600, fontSize: 32 * k, lineHeight: 1.35, padding: `${12 * k}px ${26 * k}px`, borderRadius: 14 * k, textAlign: "center" }}>
        <span style={{ color: tone, marginRight: 12 * k }}>{dialogue.speaker}</span>
        {dialogue.text}
      </div>
    </div>
  );
};

/**
 * One generated clip as a whole scene: plays once, then holds its last frame if the scene is longer. Muted (the
 * dialogue audio is the voiceover track). `clipFrames` is the clip's length in composition (30 fps) frames, retimed from its own 24 fps; the
 * finalize script measures it and writes it into the scene.
 */
export const ClipShot: React.FC<{ clip: string; clipFrames: number; dialogue?: Dialogue; children?: React.ReactNode }> = ({ clip, clipFrames, dialogue, children }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [0, 4], [0, 1], { ...clamp, easing: ease });
  const video = (
    <OffthreadVideo src={staticFile(clip)} muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  );
  return (
    <AbsoluteFill style={{ background: PAL.ink, opacity: fade }}>
      {isHolding(frame, clipFrames) ? <Freeze frame={clipFrameAt(frame, clipFrames)}>{video}</Freeze> : video}
      {children}
      <Subtitle dialogue={dialogue} />
    </AbsoluteFill>
  );
};

/** End card over the last clip: title plus a pill button. */
export const EndCard: React.FC<{ clip: string; clipFrames: number; title: string; button: string }> = ({ clip, clipFrames, title, button }) => {
  const frame = useCurrentFrame();
  const k = useScale();
  const a = interpolate(frame, [10, 26], [0, 1], { ...clamp, easing: ease });
  const b = interpolate(frame, [24, 40], [0, 1], { ...clamp, easing: ease });
  return (
    <ClipShot clip={clip} clipFrames={clipFrames}>
      <AbsoluteFill style={{ background: "rgba(20,17,15,0.35)" }} />
      <div style={{ position: "absolute", top: 90 * k, left: 0, right: 0, textAlign: "center", opacity: a, fontFamily: HEAD, fontSize: 76 * k, fontWeight: 600, color: PAL.paper }}>{title}</div>
      <div style={{ position: "absolute", bottom: 80 * k, left: 0, right: 0, display: "flex", justifyContent: "center", opacity: b }}>
        <div style={{ background: PAL.accent, color: PAL.ink, fontFamily: UI, fontWeight: 600, fontSize: 30 * k, padding: `${16 * k}px ${36 * k}px`, borderRadius: 14 * k }}>{button}</div>
      </div>
    </ClipShot>
  );
};
