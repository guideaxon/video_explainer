import React from "react";
import { MScene, Layer, LineChart, Annotation } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace `data`, `xLabels` and the annotation with the real series and event.
const data = Array.from({ length: 40 }, (_, i) => 100 + i * 2.4 + Math.sin(i * 1.3) * 7 + (i > 30 ? (i - 30) * 3 : 0));

export const LongRoadUp: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="paper" chapter="the long road up" meta="S&P 500 · 10 YEARS">
    <Layer>
      <LineChart data={data} xLabels={["2016", "2020", "2024"]} badge="+158.4%" />
      <Annotation x={560} y={560} text="breakout!" to={[860, 500]} from={86} />
    </Layer>
  </MScene>
);
export default LongRoadUp;
