import React from "react";
import { PScene, Headline, Meter, ChatList, SampleTag, C } from "@remotion-components/promo/kit";

// SAMPLE DATA: replace the goal, current amount and the feed.
export const LiveMeterScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.gold}>
    <Headline lines={["Live *fundraising", "^meters."]} y={200} size={104} />
    <Meter x={100} y={650} value={42396} goal={50000} />
    <ChatList gold x={420} y={760} w={590} from={30} per={18} items={[{ name: "Supporter", msg: "+$250" }, { name: "Supporter", msg: "+$100" }, { name: "Supporter", msg: "+$500" }, { name: "Supporter", msg: "+$75" }]} />
    <SampleTag />
  </PScene>
);
export default LiveMeterScene;
