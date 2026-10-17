import React from "react";
import { PScene, Headline, StatCards, SampleTag } from "@remotion-components/promo/kit";

// SAMPLE DATA: replace with real customer results.
export const ProofCardsScene: React.FC<{ startFrame?: number }> = () => (
  <PScene>
    <Headline lines={["Proven", "at *scale."]} y={190} size={108} />
    <StatCards y={600} items={[{ value: "$2M", label: "one campaign, one season" }, { value: "$120K", label: "single live event" }, { value: "Since 2020", label: "trusted by teams" }]} />
    <SampleTag />
  </PScene>
);
export default ProofCardsScene;
