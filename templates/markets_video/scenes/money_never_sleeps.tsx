import React from "react";
import { MScene, Layer, Network, Annotation } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace the venues and the links (third value = % move along the link).
const nodes = [
  { id: "ny", x: 170, y: 880, label: "NEW YORK" }, { id: "ld", x: 300, y: 540, label: "LONDON" },
  { id: "fr", x: 560, y: 700, label: "FRANKFURT" }, { id: "dx", x: 780, y: 880, label: "DUBAI" },
  { id: "tk", x: 890, y: 540, label: "TOKYO" }, { id: "sg", x: 760, y: 1160, label: "SINGAPORE" },
  { id: "sy", x: 520, y: 1280, label: "SYDNEY" }, { id: "sp", x: 220, y: 1180, label: "SAO PAULO" },
];
const edges: [string, string, number?][] = [
  ["ny", "ld", 1.2], ["ld", "fr", 0.6], ["fr", "dx", -0.4], ["dx", "sg", 0.9], ["sg", "tk", 1.5], ["tk", "sy", -0.7], ["sy", "sp"], ["sp", "ny", 0.3],
];

export const MoneyNeverSleeps: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="terminal" chapter="money never sleeps" meta="24 HOUR MARKETS">
    <Layer>
      <Network nodes={nodes} edges={edges} />
      <Annotation x={540} y={1450} text="while you were sleeping" from={110} rotate={-2} size={58} />
    </Layer>
  </MScene>
);
export default MoneyNeverSleeps;
