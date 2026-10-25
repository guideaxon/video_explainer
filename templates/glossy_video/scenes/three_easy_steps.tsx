import React from "react";
import { GScene, Eyebrow, Headline, Sub, Stage, Toy, Badge, C } from "@remotion-components/glossy/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// How it works: three glossy step coins pop in while Pebbo walks across the floor, then waves.
// SAMPLE steps: use the real three steps of your product.
export const ThreeEasyStepsScene: React.FC<{ startFrame?: number }> = () => (
  <GScene tone="sky">
    <Eyebrow>How it works</Eyebrow>
    <Headline lines={["Three easy", "*steps."]} />
    <Badge x={220} y={720} text="1" color={C.cherry} from={10} />
    <Badge x={540} y={720} text="2" color={C.tangerine} from={22} />
    <Badge x={860} y={720} text="3" color={C.grape} from={34} />
    <Sub x={100} w={240} y={820} align="center" from={14}>Pick</Sub>
    <Sub x={420} w={240} y={820} align="center" from={26}>Tap</Sub>
    <Sub x={740} w={240} y={820} align="center" from={38}>Relax</Sub>
    <Stage>
      <Toy x={190} walkTo={830} y={1440} scale={0.72} enter="pop" from={2} walk={{ from: 12, to: 72 }} gesture="wave" gestureAt={80} mouth={LIPSYNC.three_easy_steps} visemes={VISEMES.three_easy_steps} seed={4} />
    </Stage>
  </GScene>
);
export default ThreeEasyStepsScene;
