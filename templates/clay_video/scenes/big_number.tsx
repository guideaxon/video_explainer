import React from "react";
import { ClayScene, Eyebrow, Title, StatCard, Tuck, SampleTag } from "@remotion-components/clay/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// One big number counting up on a cardboard card. SAMPLE value: replace it with a real, sourced figure and change the label.
export const BigNumberScene: React.FC<{ startFrame?: number }> = () => (
  <ClayScene tone="rose">
    <Eyebrow>The number</Eyebrow>
    <Title lines={["Savings are", "*up."]} y={250} />
    <StatCard x={80} y={600} h={380} label="Monthly growth" value={12.4} prefix="+" suffix="%" decimals={1} from={8} />
    <Tuck x={800} scale={0.55} from={14} gesture="point" gestureAt={40} look="left" mouth={LIPSYNC.big_number} visemes={VISEMES.big_number} seed={2} />
    <SampleTag />
  </ClayScene>
);
export default BigNumberScene;
