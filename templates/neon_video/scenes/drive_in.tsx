import React from "react";
import { NScene, Horizon, Car, VhsChip, Eyebrow, Headline } from "@remotion-components/neon/kit";

// Hook: driving into the sunset on the grid. The floor scrolls fast, a neon car pulls away toward the sun.
export const DriveInScene: React.FC<{ startFrame?: number }> = () => (
  <NScene>
    <Horizon speed={0.12} />
    <Car from={0} to={110} />
    <VhsChip x={80} y={170} mode="PLAY" from={2} />
    <Eyebrow y={300} from={6}>Tonight</Eyebrow>
    <Headline lines={["Night", "*drive."]} y={370} size={130} from={10} />
  </NScene>
);
export default DriveInScene;
