/**
 * scene3d video kit: one shot of the bubble set, drawn from a baked simulation (three-core bake) through the shared
 * StageView, with a caption pill. Scenes pass the baked scene, its spec, a shot (camera from/to) and a look.
 */

import React from "react";
import { useVideoConfig } from "remotion";
import { StageView } from "../three-core/video";
import { BakedScene, bakedPops } from "../three-core/bake";
import { clampFrame } from "../three-core/time";
import { poseAt, Shot } from "../three-core/camera";
import type { SimSpec, Vec3 } from "../three-core/sim";
import { BubbleSet } from "./toy";
import type { WaterSpec } from "./water";

export type { WaterSpec } from "./water";
import { LOOKS, LookName } from "./look";

export { LOOKS } from "./look";
export type { LookName } from "./look";

/** Camera presets: the bundle's camera language (slow, eye-level, a little below the bubbles, looking up). */
export const SHOTS = {
  wide: { from: { pos: [0, 1.2, 4.6], target: [0, 1.5, 0], fov: 42 }, to: { pos: [0.4, 1.25, 4.1], target: [0, 1.55, 0], fov: 40 } },
  wand: { from: { pos: [-0.2, 1.0, 2.6], target: [-0.9, 1.15, 0], fov: 38 }, to: { pos: [0.1, 1.05, 2.3], target: [-0.6, 1.25, 0], fov: 36 } },
  drift: { from: { pos: [-1.6, 1.1, 3.6], target: [0, 1.6, 0], fov: 40 }, to: { pos: [1.6, 1.3, 3.6], target: [0, 1.7, 0], fov: 40 } },
  close: { from: { pos: [0.2, 1.5, 2.0], target: [0, 1.6, 0], fov: 32 }, to: { pos: [0.1, 1.55, 1.6], target: [0, 1.62, 0], fov: 30 } },
  medium: { from: { pos: [0, 1.35, 3.6], target: [0, 1.6, 0], fov: 42 }, to: { pos: [0.15, 1.4, 3.0], target: [0, 1.65, 0], fov: 40 } },
  // above the pool looking down at the caustics, then easing up toward the bubbles over the water
  pool: { from: { pos: [0.3, 1.7, 2.6], target: [0, 0.2, -0.4], fov: 46 }, to: { pos: [-0.2, 1.55, 2.9], target: [0, 0.55, -0.6], fov: 44 } },
} satisfies Record<string, Shot>;

export type ShotName = keyof typeof SHOTS;

export type BubbleShotProps = {
  sim: BakedScene;
  spec: SimSpec;
  shot?: ShotName | Shot;
  look?: LookName;
  /** Where the wand sits and which way it blows; omit for no wand. */
  wand?: { at: Vec3; dir: Vec3 } | null;
  /** A pool under the bubbles: waves, ripples where bubbles and spray land, caustics on the tiled floor. */
  water?: WaterSpec | null;
  caption?: string;
};

export const BubbleShot: React.FC<BubbleShotProps> = ({ sim, spec, shot = "wide", look = "studio", wand = null, water = null, caption }) => {
  const { fps, durationInFrames } = useVideoConfig();
  if (sim.fps !== fps) throw new Error(`scene3d: sim baked at ${sim.fps} fps but the video runs at ${fps}; re-run the finalize step.`);
  const theShot: Shot = typeof shot === "string" ? SHOTS[shot] : shot;
  const L = LOOKS[look];
  return (
    <StageView
      build={(stage) => {
        const set = new BubbleSet(stage, spec, L, { wand, water });
        const pops = bakedPops(sim); // once per build, not per frame
        return {
          update: (t, frame) => {
            set.setBodies(sim.bodies[clampFrame(frame, sim.frames)], t, frame);
            set.setDroplets(pops, Math.min(t, (sim.frames - 1) / fps));
            stage.setPose(poseAt(theShot, durationInFrames > 1 ? frame / (durationInFrames - 1) : 0));
          },
          dispose: () => set.dispose(),
        };
      }}
    >
      {caption ? <Caption text={caption} look={look} /> : null}
    </StageView>
  );
};

export const Caption: React.FC<{ text: string; look?: LookName }> = ({ text, look = "studio" }) => {
  const c = LOOKS[look].caption;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: "7%", display: "flex", justifyContent: "center", pointerEvents: "none" }}>
      <div style={{ background: c.bg, color: c.fg, fontFamily: c.font, fontSize: 40, fontWeight: 500, lineHeight: 1.25, padding: "14px 30px", borderRadius: 999, maxWidth: "78%", textAlign: "center", backdropFilter: "blur(6px)" }}>
        {text}
      </div>
    </div>
  );
};
