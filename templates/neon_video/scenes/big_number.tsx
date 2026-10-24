import React from "react";
import { NScene, Horizon, Eyebrow, Headline, NeonCounter, Tubo, SampleTag } from "@remotion-components/neon/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// One big neon number counting up; Tubo points at it. SAMPLE value: replace with a real, sourced figure.
export const BigNumberScene: React.FC<{ startFrame?: number }> = () => (
  <NScene>
    <Horizon speed={0.03} sunR={200} />
    <Eyebrow>The number</Eyebrow>
    <Headline lines={["Plays", "*tripled."]} from={4} />
    <NeonCounter x={80} y={600} label="Plays this year" value={300} prefix="+" suffix="%" from={10} />
    <Tubo x={260} y={1480} scale={0.62} from={6} gesture="point" gestureAt={24} mouth={LIPSYNC.big_number} visemes={VISEMES.big_number} seed={2} />
    <SampleTag />
  </NScene>
);
export default BigNumberScene;
