import React from "react";
import { Feature, C } from "@remotion-components/launch/kit";

export const DailyMascotScene: React.FC<{ startFrame?: number }> = () => (
  <Feature
    eyebrow="Your mascot"
    lines={["Bud is there", "*every day."]}
    sub="Daily gift, moods, little quips."
    chips={[
      { title: "Radiant", sub: "Bud's mood", color: C.leaf, x: 620, y: 760 },
      { title: "+5 coins", sub: "Daily gift", color: C.coral, x: 60, y: 1230 },
    ]}
  />
);
export default DailyMascotScene;
