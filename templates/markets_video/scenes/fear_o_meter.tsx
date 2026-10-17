import React from "react";
import { MScene, Layer, Gauge } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace `value` (0 = extreme fear, 100 = extreme greed).
export const FearOMeter: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="terminal" chapter={"where are we on\nthe fear-o-meter?"} meta="SENTIMENT INDEX">
    <Layer>
      <Gauge value={72} />
    </Layer>
  </MScene>
);
export default FearOMeter;
