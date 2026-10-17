import React from "react";
import { CScene, Eyebrow, Headline, BotGrid, burst } from "@remotion-components/leaderbot/kit";

// Opening: the signature 3x3 bot mosaic with glitch bursts. "Leader bot" is a placeholder name.
export const MeetTheBotScene: React.FC<{ startFrame?: number }> = () => (
  <CScene tone="ink">
    <Eyebrow>Leader bot</Eyebrow>
    <Headline lines={["Meet the", "*Leader bot."]} y={270} size={96} />
    <BotGrid y={560} cell={310} glitch={burst} from={6} />
  </CScene>
);
export default MeetTheBotScene;
