import React from "react";
import { PScene, Headline, Hub, Tile } from "@remotion-components/promo/kit";

// Replace the node labels with the real destinations.
export const MultistreamScene: React.FC<{ startFrame?: number }> = () => (
  <PScene>
    <Headline lines={["*Multistream", "everywhere."]} y={200} size={108} />
    <Hub cy={1090} rx={340} ry={400} nodes={["Video site", "Social", "Your site", "Mobile", "Embed"]} />
    <Tile x={390} y={1005} w={300} h={170} hue={215} live from={4} />
  </PScene>
);
export default MultistreamScene;
