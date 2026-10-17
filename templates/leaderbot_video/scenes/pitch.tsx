import React from "react";
import { CScene, Eyebrow, Headline, Speech, PixelBot, SampleTag } from "@remotion-components/leaderbot/kit";

// The bot pitches a line of (satirical) corporate speak. SAMPLE quote: write a real line for the story.
export const PitchScene: React.FC<{ startFrame?: number }> = () => (
  <CScene tone="yellow">
    <Eyebrow>The pitch</Eyebrow>
    <Headline lines={["The bot", "*pitches."]} y={270} />
    <Speech x={80} y={620} w={920} from={10}>We will leverage synergy to disrupt the market.</Speech>
    <PixelBot x={70} y={1170} size={300} smooth from={4} />
    <SampleTag />
  </CScene>
);
export default PitchScene;
