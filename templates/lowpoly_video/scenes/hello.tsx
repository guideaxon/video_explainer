import React from "react";
import { LowPolyShot } from "@remotion-components/lowpoly/kit";
import { LIPSYNC, VISEMES, CAPTIONS } from "./lipsync";

// Presenter in the room: camera framing, move, mood and gesture per beat. Mouth and captions come from the voiceover.
export const HelloScene: React.FC<{ startFrame?: number }> = () => (
  <LowPolyShot shot="medium" move="push-in" mood="smile" gesture="open" gestureAt={20} mouth={LIPSYNC.hello} visemes={VISEMES.hello} caption={CAPTIONS.hello} />
);
export default HelloScene;
