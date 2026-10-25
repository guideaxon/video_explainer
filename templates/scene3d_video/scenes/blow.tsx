import React from "react";
import { BubbleShot } from "@remotion-components/scene3d/kit";
import { CAPTIONS } from "./lipsync";
import { SIMS, WAND } from "./sim.spec";
import SIM from "./sim.json";

// The wand blows two streams; the camera eases in on the wand. Bubbles come from the baked simulation (sim.json).
export const BlowScene: React.FC<{ startFrame?: number }> = () => (
  <BubbleShot sim={SIM.scenes.blow} spec={SIMS.blow} shot="wand" look="studio" wand={WAND} caption={CAPTIONS.blow} />
);
export default BlowScene;
