import React from "react";
import { LScene, Art, Mascot, Wordmark, StorePill } from "@remotion-components/launch/kit";

// Sign-off: crowned mascot, wordmark, tagline and store pill. Replace the placeholder name and store text.
// Store badges are not clickable in a video: say "link in bio" in the narration or use an ad CTA.
export const FinaleScene: React.FC<{ startFrame?: number }> = () => (
  <LScene tone="mint" sunburst>
    <Art>
      <Mascot cx={540} cy={640} scale={2.1} stage={10} from={0} />
    </Art>
    <Wordmark name="Gymbud" tagline="Your Bud is waiting." y={940} />
    <StorePill y={1370} label="Coming soon to the App Store" note="On iPhone." from={34} />
  </LScene>
);
export default FinaleScene;
