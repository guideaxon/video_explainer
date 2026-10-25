import React from "react";
import { BubbleShot } from "@remotion-components/scene3d/kit";
import { CAPTIONS } from "./lipsync";
import { SIMS, WATER } from "./sim.spec";
import SIM from "./sim.json";

// Bubbles settle onto a shallow pool and pop on the surface; the rings and the waves focus sunlight into caustics.
export const PoolScene: React.FC<{ startFrame?: number }> = () => (
  <BubbleShot sim={SIM.scenes.pool} spec={SIMS.pool} shot="pool" look="studio" water={WATER} caption={CAPTIONS.pool} />
);
export default PoolScene;
