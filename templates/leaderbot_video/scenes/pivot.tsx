import React from "react";
import { CScene, Eyebrow, Headline, BotGrid } from "@remotion-components/leaderbot/kit";

// Full-glitch mosaic: the "everything changes" beat. No centre clean bot, constant scramble.
export const PivotScene: React.FC<{ startFrame?: number }> = () => (
  <CScene tone="ink">
    <Eyebrow>New strategy</Eyebrow>
    <Headline lines={["Time to", "*pivot."]} y={270} />
    <BotGrid y={560} cell={310} clean={false} glitch={(f) => 0.3 + 0.15 * Math.sin(f / 5)} from={2} />
  </CScene>
);
export default PivotScene;
