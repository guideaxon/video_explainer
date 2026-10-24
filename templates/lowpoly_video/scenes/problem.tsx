import React from "react";
import { LowPolyShot } from "@remotion-components/lowpoly/kit";
import { LIPSYNC, CAPTIONS } from "./lipsync";

// Presenter in the room: camera framing, move, mood and gesture per beat. Mouth and captions come from the voiceover.
export const ProblemScene: React.FC<{ startFrame?: number }> = () => (
  <LowPolyShot shot="medium" move="drift-left" mood="serious" look="left" mouth={LIPSYNC.problem} caption={CAPTIONS.problem} />
);
export default ProblemScene;
