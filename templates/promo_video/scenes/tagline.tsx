import React from "react";
import { PScene, Headline, C } from "@remotion-components/promo/kit";

export const TaglineScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.teal}>
    <Headline lines={["Better *events.", "Stronger", "^participation."]} y={760} size={116} align="center" />
  </PScene>
);
export default TaglineScene;
