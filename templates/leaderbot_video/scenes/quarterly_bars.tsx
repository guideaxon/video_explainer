import React from "react";
import { CScene, Eyebrow, Headline, PixelBars, SampleTag, C } from "@remotion-components/leaderbot/kit";

// Pixel-block bar chart. SAMPLE values: replace labels and values with real, sourced data.
export const QuarterlyBarsScene: React.FC<{ startFrame?: number }> = () => (
  <CScene tone="paper">
    <Eyebrow>Four quarters</Eyebrow>
    <Headline lines={["One steady", "*climb."]} y={270} size={104} />
    <PixelBars x={80} y={600} bars={[
      { label: "Q1", value: 4, color: C.cyan },
      { label: "Q2", value: 6, color: C.green },
      { label: "Q3", value: 9, color: C.yellow },
      { label: "Q4", value: 12, color: C.red },
    ]} />
    <SampleTag />
  </CScene>
);
export default QuarterlyBarsScene;
