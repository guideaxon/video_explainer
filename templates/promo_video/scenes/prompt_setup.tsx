import React from "react";
import { PScene, Headline, PromptBox, C } from "@remotion-components/promo/kit";

// Glowing prompt box: type a request, watch the setup list appear.
export const PromptSetupScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.blue} floor={false}>
    <Headline lines={["Describe it.", "*Launch it."]} y={230} />
    <PromptBox y={620} text="Fundraiser for a local campaign, 45 minutes, goal $50,000" rows={["Run of show", "Branded page", "Reminder emails", "Donation goal"]} />
  </PScene>
);
export default PromptSetupScene;
