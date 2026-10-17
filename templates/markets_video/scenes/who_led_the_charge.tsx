import React from "react";
import { MScene, Layer, HBars, Annotation } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace the sectors and their percentage moves (sorted high to low).
const rows = [
  { label: "Tech", value: 4.2 }, { label: "Energy", value: 2.8 }, { label: "Health", value: 1.9 },
  { label: "Finance", value: 0.9 }, { label: "Utilities", value: -0.6 },
];

export const WhoLedTheCharge: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="paper" chapter="who led the charge" meta="SECTOR PERFORMANCE · 1 MONTH">
    <Layer>
      <HBars rows={rows} />
      <Annotation x={820} y={1010} text="best week!" to={[800, 520]} from={70} rotate={-3} />
    </Layer>
  </MScene>
);
export default WhoLedTheCharge;
