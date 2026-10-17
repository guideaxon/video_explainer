import React from "react";
import { CScene, Eyebrow, Headline, Sub, PixelBot, Ticker } from "@remotion-components/leaderbot/kit";

// Sign-off: the clean bot, "meeting adjourned", a ticker and a disclaimer. Replace the sign-off line.
export const BotOutScene: React.FC<{ startFrame?: number }> = () => (
  <CScene tone="yellow">
    <Eyebrow>Bot out</Eyebrow>
    <Headline lines={["Meeting", "*adjourned."]} y={270} />
    <PixelBot x={290} y={600} size={500} smooth from={4} />
    <Ticker y={1260} text="Follow for more bot business" />
    <Sub y={1400} from={30}>Sample bot. Not business advice.</Sub>
  </CScene>
);
export default BotOutScene;
