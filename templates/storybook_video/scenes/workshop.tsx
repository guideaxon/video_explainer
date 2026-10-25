import React from "react";
import { PaintedShot, OnStill } from "@remotion-components/storybook/kit";
import { Wren } from "@remotion-components/storybook/character";
import { LIPSYNC, VISEMES } from "./lipsync";

// Painted PLATE art/workshop.png (no character, clear cobbles in front of the door) with a slow pull-out. Wren is drawn
// over it in still coordinates (1280x720), so she follows the camera. She walks in from the door, stops and talks.
// Replace the art, the ground points and the light (x, warmth, tint) to match your plate; remove <OnStill> for a baked-in still.
export const WorkshopScene: React.FC<{ startFrame?: number }> = () => (
  <PaintedShot art="art/workshop.png" move="pull-out">
    <OnStill>
      <Wren
        x={300} y={672} scale={0.6} walk={{ from: 8, to: 70 }} walkTo={520}
        mouth={LIPSYNC["workshop"]} visemes={VISEMES["workshop"]} gesture="wave" gestureAt={76} seed={2}
        light={{ x: -0.5, warmth: 0.65, strength: 0.55 }}
      />
    </OnStill>
  </PaintedShot>
);
export default WorkshopScene;
