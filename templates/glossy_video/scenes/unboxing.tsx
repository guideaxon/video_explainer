import React from "react";
import { GScene, Eyebrow, Headline, Stage, ToyBox, Toy, Sprinkles, Ball, C } from "@remotion-components/glossy/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Hook: the gift box shakes, the lid flies off and Pebbo shoots out, lands with a squash and waves.
// Pebbo is a placeholder name for the original toy character.
export const UnboxingScene: React.FC<{ startFrame?: number }> = () => (
  <GScene tone="peach">
    <Eyebrow>Unboxing</Eyebrow>
    <Headline lines={["Say hi to", "*Pebbo."]} />
    <Stage>
      <Ball x={170} y={700} r={44} color={C.mint} from={30} />
      <Ball x={920} y={640} r={34} color={C.grape} from={36} />
      <ToyBox x={540} y={1140} h={360} color={C.sky} openAt={20} from={2}>
        <Toy x={540} y={1290} scale={0.95} enter="rise" from={20} gesture="wave" gestureAt={44} mouth={LIPSYNC.unboxing} visemes={VISEMES.unboxing} />
      </ToyBox>
      <Sprinkles x={540} y={1120} at={22} />
    </Stage>
  </GScene>
);
export default UnboxingScene;
