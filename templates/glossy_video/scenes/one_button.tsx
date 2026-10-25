import React from "react";
import { GScene, Eyebrow, Headline, Sub, Stage, Toy, Ball, Sprinkles, GlossButton, C } from "@remotion-components/glossy/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The answer: Pebbo points at a big candy button; it gets pressed and candy confetti bursts out.
export const OneButtonScene: React.FC<{ startFrame?: number }> = () => (
  <GScene tone="mint">
    <Eyebrow>The fix</Eyebrow>
    <Headline lines={["One button.", "*Done."]} />
    <Sub y={540} from={18}>Everything sorted in a single tap.</Sub>
    <Stage>
      <Ball x={880} y={780} r={52} color={C.lemon} from={20} />
      <Ball x={200} y={860} r={36} color={C.bubblegum} from={26} />
      <Toy x={290} y={1460} scale={0.8} enter="pop" from={4} gesture="point" gestureAt={24} look="right" mouth={LIPSYNC.one_button} visemes={VISEMES.one_button} seed={3} />
    </Stage>
    <GlossButton cx={730} y={1150} label="Tidy up" color={C.cherry} from={12} pressAt={50} />
    <Stage>
      <Sprinkles x={730} y={1150} at={53} count={22} />
    </Stage>
  </GScene>
);
export default OneButtonScene;
