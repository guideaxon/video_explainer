import React from "react";
import { MScene, Layer, LineChart, Annotation } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace with the drawdown and recovery series.
const down = Array.from({ length: 36 }, (_, i) => (i < 8 ? 100 + i * 2 : 114 - (i - 8) * 3.2 + Math.sin(i) * 2));
const up = Array.from({ length: 28 }, (_, i) => 26 + i * 3.1 + Math.sin(i * 1.4) * 3);
const data = [...down.slice(0, 30), ...up.map((v, i) => down[29] + (v - 26) + i * 0.2)];

export const DropAndClimbBack: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="paper" chapter={"the drop,\nthe climb back"} meta="DRAWDOWN AND RECOVERY">
    <Layer>
      <LineChart data={data} xLabels={["peak", "crash", "bottom", "rebound", "new high"]} badge="+12.4%" />
      <Annotation x={330} y={820} text="uh-oh" from={46} color="#d64545" rotate={-6} />
      <Annotation x={720} y={1160} text="hold your nerve" to={[600, 1060]} from={110} rotate={3} />
    </Layer>
  </MScene>
);
export default DropAndClimbBack;
