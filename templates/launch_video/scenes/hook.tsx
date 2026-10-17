import React from "react";
import { LScene, Eyebrow, Headline, Sub, Rings, Art, Mascot } from "@remotion-components/launch/kit";

// Opening: the promise in two short lines, with the young mascot below. "GYMBUD" / "Bud" are placeholders.
export const HookScene: React.FC<{ startFrame?: number }> = () => (
  <LScene tone="night">
    <Eyebrow>Gymbud</Eyebrow>
    <Headline lines={["You train.", "*It grows."]} size={150} y={270} />
    <Sub y={640}>Your mascot evolves with every workout.</Sub>
    <Rings cx={540} cy={1190} />
    <Art>
      <Mascot cx={540} cy={1170} scale={1.9} stage={4} from={14} />
    </Art>
  </LScene>
);
export default HookScene;
