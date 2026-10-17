import React from "react";
import { Feature, C } from "@remotion-components/launch/kit";

export const ShopScene: React.FC<{ startFrame?: number }> = () => (
  <Feature
    eyebrow="Shop"
    lines={["Dress up", "*your Bud."]}
    sub="Hats, accessories, collections."
    chips={[
      { title: "1,240", sub: "Coins earned", color: C.gold, x: 600, y: 760 },
      { title: "Crown", sub: "Epic", color: C.lavender, x: 60, y: 1230 },
    ]}
  />
);
export default ShopScene;
