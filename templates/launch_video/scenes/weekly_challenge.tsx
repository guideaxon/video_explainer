import React from "react";
import { Feature, C } from "@remotion-components/launch/kit";

export const WeeklyChallengeScene: React.FC<{ startFrame?: number }> = () => (
  <Feature
    eyebrow="Surprise challenge"
    lines={["A challenge", "*every week."]}
    sub="Beat it, earn coins."
    dimScreen
    chips={[
      { title: "New record", sub: "This week's challenge", color: C.gold, x: 560, y: 760 },
      { title: "+40 coins", sub: "If you beat it", color: C.gold, x: 60, y: 1230 },
    ]}
  />
);
export default WeeklyChallengeScene;
