import React from "react";
import { PopScene, Receipt, Pixie, SampleTag } from "@remotion-components/lyric/kit";

// SAMPLE LYRICS: a receipt gag that ends in a stamp slap. Replace the rows and the stamp.
export const OvertimeReceiptScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="peach">
    <Receipt y={220} title="DESK JOB CO." stamp="QUIT!" rows={[
      { l: "OVERTIME HOURS", r: "412" },
      { l: "MEETINGS ABOUT MEETINGS", r: "∞" },
      { l: "CHAIR SPA DAY", r: "0" },
      { l: "TOTAL JOY", r: "-3" },
    ]} />
    <Pixie x={120} y={1190} scale={1.5} from={50} />
    <SampleTag />
  </PopScene>
);
export default OvertimeReceiptScene;
