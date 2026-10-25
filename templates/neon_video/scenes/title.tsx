import React from "react";
import { NScene, Horizon, Headline, Sign } from "@remotion-components/neon/kit";

// Title card: chrome + neon title over the sun, one neon sign line. SAMPLE title: replace with the story's title.
export const TitleScene: React.FC<{ startFrame?: number }> = () => (
  <NScene>
    <Horizon speed={0.04} sunR={300} />
    <Headline lines={["Neon", "*nights."]} y={250} size={150} from={4} align="center" />
    <Sign x={110} y={640} w={860} from={22} color="#22e6ff">Told in glowing tubes</Sign>
  </NScene>
);
export default TitleScene;
