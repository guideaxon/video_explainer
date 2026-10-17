import React from "react";
import { PScene, Headline, Glass, PollBars, C } from "@remotion-components/promo/kit";

export const PollsScene: React.FC<{ startFrame?: number }> = () => (
  <PScene>
    <Headline lines={["They vote", "in *polls."]} y={220} />
    <Glass x={70} y={640} w={940} h={700} from={12} rot={[0, 0, 0]} glow={C.blue}>
      <div style={{ padding: "44px 40px", fontSize: 38, fontWeight: 600, color: "#fff" }}>What should we cover next?</div>
    </Glass>
    <PollBars x={110} y={800} w={860} from={26} options={[{ label: "Behind the scenes", pct: 62 }, { label: "Audience Q&A", pct: 45 }, { label: "Product demo", pct: 21 }]} />
  </PScene>
);
export default PollsScene;
