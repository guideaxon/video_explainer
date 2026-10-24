import React from "react";
import { LowPolyShot } from "@remotion-components/lowpoly/kit";
import { LIPSYNC, CAPTIONS } from "./lipsync";

// Presenter in the room: camera framing, move, mood and gesture per beat. Mouth and captions come from the voiceover.
export const StepsScene: React.FC<{ startFrame?: number }> = () => (
  <LowPolyShot shot="medium" move="hold" mood="smile" gesture="count" gestureAt={12} mouth={LIPSYNC.steps} caption={CAPTIONS.steps} />
);
export default StepsScene;
