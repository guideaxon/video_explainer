import React from "react";
import { ClayScene, Eyebrow, Title, Bars, Tuck, SampleTag } from "@remotion-components/clay/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// A clay bar chart: hand-stacked pucks, one stack per week. SAMPLE values: replace labels and values with real, sourced data.
export const FourStacksScene: React.FC<{ startFrame?: number }> = () => (
  <ClayScene tone="card">
    <Eyebrow>Four weeks</Eyebrow>
    <Title lines={["One steady", "*climb."]} y={250} />
    <Bars x0={300} x1={1010} from={8} bars={[
      { label: "W1", value: 3, color: "blue" },
      { label: "W2", value: 5, color: "green" },
      { label: "W3", value: 7, color: "mustard" },
      { label: "W4", value: 10, color: "coral" },
    ]} />
    <Tuck x={140} scale={0.5} from={4} gesture="point" gestureAt={56} mouth={LIPSYNC.four_stacks} visemes={VISEMES.four_stacks} seed={4} />
    <SampleTag />
  </ClayScene>
);
export default FourStacksScene;
