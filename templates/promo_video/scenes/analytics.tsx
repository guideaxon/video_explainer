import React from "react";
import { PScene, Headline, Glass, AreaChart, Skeleton, SampleTag, C } from "@remotion-components/promo/kit";

// SAMPLE DATA: replace the stats and the series.
const data = [4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 18, 24];

export const AnalyticsScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.teal}>
    <Headline lines={["Post-event", "*analytics."]} y={210} size={104} />
    <Glass x={70} y={640} w={940} h={800} from={12} glow={C.teal}>
      <div style={{ position: "absolute", left: 0, right: 0, top: 480 }}>
        <Skeleton rows={4} from={40} />
      </div>
    </Glass>
    <AreaChart x={110} y={690} w={860} h={330} data={data} from={22} stats={[{ label: "Attendees", value: "8,940" }, { label: "Avg. minutes", value: "34" }, { label: "Raised", value: "$48K" }]} />
    <SampleTag />
  </PScene>
);
export default AnalyticsScene;
