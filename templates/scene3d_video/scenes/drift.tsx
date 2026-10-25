import React from "react";
import { BubbleShot } from "@remotion-components/scene3d/kit";
import { CAPTIONS } from "./lipsync";
import { SIMS } from "./sim.spec";
import SIM from "./sim.json";

// Bubbles already in the air ride the breeze; the camera tracks slowly across them.
export const DriftScene: React.FC<{ startFrame?: number }> = () => (
  <BubbleShot sim={SIM.scenes.drift} spec={SIMS.drift} shot="drift" look="studio" caption={CAPTIONS.drift} />
);
export default DriftScene;
