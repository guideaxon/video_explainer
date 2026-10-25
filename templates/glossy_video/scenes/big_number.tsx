import React from "react";
import { GScene, Eyebrow, Headline, Stage, Stat, GlossBars, Toy, SampleTag, C } from "@remotion-components/glossy/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Proof: a glossy number counts up, two capsule bars compare before and after, Pebbo cheers.
// SAMPLE values: replace with a real, sourced figure and update the label.
export const BigNumberScene: React.FC<{ startFrame?: number }> = () => (
  <GScene tone="butter">
    <Eyebrow>The result</Eyebrow>
    <Headline lines={["Twice as", "*fast."]} />
    <Stat y={560} value={2} suffix="x" label="faster daily tidy" color={C.tangerine} from={8} />
    <Stage>
      <GlossBars x={90} y={880} w={560} h={520} bars={[
        { label: "Before", value: 10, color: C.sky },
        { label: "After", value: 5, color: C.mint },
      ]} suffix=" min" from={20} />
      <Toy x={850} y={1420} scale={0.6} enter="pop" from={14} gesture="cheer" gestureAt={56} mouth={LIPSYNC.big_number} visemes={VISEMES.big_number} seed={5} />
    </Stage>
    <SampleTag />
  </GScene>
);
export default BigNumberScene;
