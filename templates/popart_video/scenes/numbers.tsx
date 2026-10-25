import React from "react";
import { Page, Panel, Caption, HalftoneBars, StatBurst, SampleTag, C } from "@remotion-components/popart/kit";

// Numbers: a halftone bar chart and a big number in a starburst. SAMPLE values: replace with real, sourced data.
export const NumbersScene: React.FC<{ startFrame?: number }> = () => (
  <Page tone="paper">
    <Panel x={40} y={120} w={1000} h={760} bg={C.white} dots={{ color: C.cyan, size: "s", r: 0.18 }} wipe="left" seed={9}>
      <Caption x={30} y={26} from={4}>HOURS ON EMAIL PER WEEK</Caption>
      <HalftoneBars x={40} y={130} w={920} h={600} suffix="h" decimals={0} from={8} bars={[
        { label: "Before", value: 12, color: "red" },
        { label: "Week 1", value: 8, color: "magenta" },
        { label: "Week 2", value: 4, color: "yellow", shade: "cyan" },
        { label: "Now", value: 2, color: "cyan", shade: "blue" },
      ]} />
    </Panel>
    <Panel x={40} y={904} w={1000} h={896} bg={C.magenta} dots={{ color: C.yellow, size: "m", r: 0.2 }} wipe="right" from={14} seed={10}>
      <StatBurst x={500} y={250} r={250} value={83} suffix="%" label="LESS TIME ON EMAIL" from={18} />
    </Panel>
    <SampleTag />
  </Page>
);
export default NumbersScene;
