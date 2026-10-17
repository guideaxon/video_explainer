import React from "react";
import { CScene, Eyebrow, Headline, Sub, StatCard, PixelBot, SampleTag, C } from "@remotion-components/leaderbot/kit";

// One big number counting up. SAMPLE value: replace with a real, sourced figure and change the label.
export const BigNumberScene: React.FC<{ startFrame?: number }> = () => (
  <CScene tone="paper">
    <Eyebrow>The number</Eyebrow>
    <Headline lines={["Revenue is", "*up."]} y={270} />
    <StatCard x={80} y={620} label="Quarterly growth" value={12.4} prefix="+" suffix="%" decimals={1} color={C.yellow} from={8} />
    <PixelBot x={380} y={1130} size={320} smooth from={20} />
    <Sub y={1470}>Source and date go here.</Sub>
    <SampleTag />
  </CScene>
);
export default BigNumberScene;
