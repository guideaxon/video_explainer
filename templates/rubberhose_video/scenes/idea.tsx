import React from "react";
import { RScene, Eyebrow, Headline, Ground, Kip, Bulb } from "@remotion-components/rubberhose/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The idea: dark tone, a bulb pops in over Kip and lights; Kip looks up and points.
export const IdeaScene: React.FC<{ startFrame?: number }> = () => (
  <RScene tone="ink" seed={4}>
    <Eyebrow>Then, an idea</Eyebrow>
    <Headline lines={["A bright", "*idea!"]} y={250} />
    <Ground y={1440} />
    <Bulb x={330} y={720} scale={0.9} from={6} on={14} />
    <Kip x={600} y={1440} scale={1} gesture="point" gestureAt={18} look="up" mouth={LIPSYNC.idea} visemes={VISEMES.idea} seed={1} />
  </RScene>
);
export default IdeaScene;
