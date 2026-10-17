import React from "react";
import { MScene, Layer, BigNumber, Ripples } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace the index name, value and one-line read ("risk on").
export const TodaysMove: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="terminal" chapter="" story="NASDAQ COMPOSITE · SAMPLE DATA">
    <Layer>
      <Ripples cx={800} cy={620} from={50} count={3} colors={["#2ee08a"]} />
    </Layer>
    <BigNumber value={12.4} label="NASDAQ Composite · Today" sub="risk on" />
  </MScene>
);
export default TodaysMove;
