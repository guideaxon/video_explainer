import React from "react";
import { NScene, Horizon, Eyebrow, Headline, EqBars, SampleTag } from "@remotion-components/neon/kit";

// Graphic-equaliser bar chart over a sunless night grid. SAMPLE values: replace labels and values with real data.
export const LevelsScene: React.FC<{ startFrame?: number }> = () => (
  <NScene horizon={1390}>
    <Horizon sun={false} speed={0.03} />
    <Eyebrow>Four seasons</Eyebrow>
    <Headline lines={["Turn it", "*up."]} from={4} />
    <EqBars x={80} y={600} h={720} unit="k" from={10} bars={[
      { label: "Spring", value: 12 },
      { label: "Summer", value: 18 },
      { label: "Autumn", value: 27 },
      { label: "Winter", value: 36 },
    ]} />
    <SampleTag />
  </NScene>
);
export default LevelsScene;
