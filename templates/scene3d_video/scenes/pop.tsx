import React from "react";
import { BubbleShot } from "@remotion-components/scene3d/kit";
import { CAPTIONS } from "./lipsync";
import { SIMS } from "./sim.spec";
import SIM from "./sim.json";

// The oldest bubbles pop one after another (scripted popOldest events); the camera pushes in a little.
export const PopScene: React.FC<{ startFrame?: number }> = () => (
  <BubbleShot sim={SIM.scenes.pop} spec={SIMS.pop} shot="medium" look="studio" caption={CAPTIONS.pop} />
);
export default PopScene;
