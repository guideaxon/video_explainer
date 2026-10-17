import React from "react";
import { MScene, Layer, Donut, Annotation, THEMES } from "@remotion-components/markets/kit";

const T = THEMES.paper;
// SAMPLE DATA: replace the allocation slices.
const parts = [
  { label: "STOCKS", value: 45, color: T.up },
  { label: "BONDS", value: 25, color: T.blue },
  { label: "CASH", value: 20, color: T.amber },
  { label: "OTHER", value: 10, color: T.down },
];

export const WhereTheMoneySits: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="paper" chapter="where the money sits" meta="PORTFOLIO MIX">
    <Layer>
      <Donut parts={parts} />
      <Annotation x={780} y={1300} text="growth engine!" to={[690, 1060]} from={64} rotate={-5} />
    </Layer>
  </MScene>
);
export default WhereTheMoneySits;
