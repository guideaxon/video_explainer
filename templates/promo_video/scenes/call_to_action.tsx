import React from "react";
import { PScene, Headline, Button, C } from "@remotion-components/promo/kit";

// Buttons in a video are not clickable on social platforms: pair this with "link in bio" or an ad CTA.
export const CallToActionScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.indigo}>
    <Headline lines={["Run your next", "event with *confidence."]} y={680} size={80} align="center" />
    <Button cy={1120} label="Start for free  →" from={20} click={64} />
  </PScene>
);
export default CallToActionScene;
