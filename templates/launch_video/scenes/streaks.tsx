import React from "react";
import { Feature, C } from "@remotion-components/launch/kit";

// SAMPLE CONTENT: replace the streak numbers with the real feature copy.
export const StreaksScene: React.FC<{ startFrame?: number }> = () => (
  <Feature
    eyebrow="Your streak"
    lines={["Never", "*give up."]}
    sub="Keep your streak alive, unlock trophies."
    chips={[
      { title: "12 days", sub: "Current streak", color: C.coral, x: 620, y: 780 },
      { title: "21", sub: "Best streak", color: C.gold, x: 60, y: 1230 },
    ]}
  />
);
export default StreaksScene;
