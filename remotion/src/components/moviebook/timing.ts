/** Pure timing helpers for MovieBook clips (no React, unit tested in timing.test.ts). */

/** Source frame to show at scene frame `frame` of a clip with `clipFrames` frames: plays once, then holds the last frame. */
export const clipFrameAt = (frame: number, clipFrames: number): number =>
  Math.max(0, Math.min(Math.floor(frame), Math.max(0, clipFrames - 1)));

/** True once the clip has played out and the scene is showing its held last frame. */
export const isHolding = (frame: number, clipFrames: number): boolean => frame > clipFrames - 1;

/** Clip length in composition frames when the clip's rate differs from the composition's (24 vs 30 fps). */
export const clipFramesInComp = (clipFrames: number, clipFps: number, compFps: number): number =>
  Math.round((clipFrames / clipFps) * compFps);

/** Caption opacity: fade in over `edge` frames at the start, fade out over `edge` frames before `total`. */
export const captionOpacity = (frame: number, total: number, edge = 6): number => {
  const inn = Math.min(1, Math.max(0, frame / edge));
  const out = Math.min(1, Math.max(0, (total - frame) / edge));
  return Math.min(inn, out);
};
