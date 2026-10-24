import React from "react";
import { LowPolyShot } from "@remotion-components/lowpoly/kit";
import { LIPSYNC, CAPTIONS } from "./lipsync";

// Presenter in the room: camera framing, move, mood and gesture per beat. Mouth and captions come from the voiceover.
export const TwistScene: React.FC<{ startFrame?: number }> = () => (
  <LowPolyShot shot="wide" move="pull-out" mood="surprise" gesture="shrug" gestureAt={24} mouth={LIPSYNC.twist} caption={CAPTIONS.twist} />
);
export default TwistScene;
