import React from "react";
import { LowPolyShot } from "@remotion-components/lowpoly/kit";
import { LIPSYNC, VISEMES, CAPTIONS } from "./lipsync";

// Presenter in the room: camera framing, move, mood and gesture per beat. Mouth and captions come from the voiceover.
export const IdeaScene: React.FC<{ startFrame?: number }> = () => (
  <LowPolyShot shot="close" move="push-in" mood="surprise" mouth={LIPSYNC.idea} visemes={VISEMES.idea} caption={CAPTIONS.idea} />
);
export default IdeaScene;
