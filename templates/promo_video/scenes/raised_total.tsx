import React from "react";
import { PScene, Stat, SampleTag, C } from "@remotion-components/promo/kit";

// SAMPLE DATA: replace with a real, sourced figure.
export const RaisedTotalScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.blue}>
    <Stat cy={960} value={8.6} prefix="$" suffix="M+" label="raised by customers on the platform" />
    <SampleTag />
  </PScene>
);
export default RaisedTotalScene;
