import React from "react";
import { ClayScene, Eyebrow, Title, Sub, Mug, Plant, Tuck, SampleTag } from "@remotion-components/clay/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Props scene: mug, plant and Tuck. Replace the sub line with the real takeaway.
export const PlanScene: React.FC<{ startFrame?: number }> = () => (
  <ClayScene tone="rose">
    <Eyebrow>The plan</Eyebrow>
    <Title lines={["Keep it", "*simple."]} y={250} />
    <Mug x={150} scale={1.1} />
    <Plant x={930} scale={1.05} />
    <Tuck x={540} scale={0.75} from={4} gesture="cheer" gestureAt={30} mouth={LIPSYNC.plan} visemes={VISEMES.plan} seed={5} />
    <Sub y={620} from={26} w={620} x={80}>Tea, a plant, patience.</Sub>
    <SampleTag />
  </ClayScene>
);
export default PlanScene;
