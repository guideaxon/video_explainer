import React from "react";
import { GScene, Eyebrow, Headline, Sub, Stage, Toy, Pedestal, Sprinkles, Ball, GlossButton, SampleTag, C } from "@remotion-components/glossy/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// CTA end card: Pebbo cheers on the pedestal, confetti, a big candy button and the store line.
// SAMPLE call to action: use the real product name, price and where to get it.
export const GetYoursScene: React.FC<{ startFrame?: number }> = () => (
  <GScene tone="peach">
    <Eyebrow>Get yours</Eyebrow>
    <Headline lines={["Get Pebbo", "*free."]} />
    <Stage>
      <Ball x={150} y={760} r={46} color={C.sky} from={24} />
      <Ball x={930} y={860} r={38} color={C.mint} from={30} />
      <Pedestal x={540} y={1130} w={420} color={C.cherry} from={2} />
      <Toy x={540} y={1130} scale={0.78} enter="drop" from={6} color={C.grape} gesture="cheer" gestureAt={30} mouth={LIPSYNC.get_yours} visemes={VISEMES.get_yours} seed={7} />
      <Sprinkles x={540} y={760} at={32} count={30} />
    </Stage>
    <GlossButton y={1290} label="Download free" color={C.cherry} from={16} />
    <Sub y={1440} from={26} align="center" x={80} w={920}>On iPhone and Android</Sub>
    <SampleTag />
  </GScene>
);
export default GetYoursScene;
