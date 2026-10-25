import React from "react";
import { ClayScene, Eyebrow, Title, Stack, Tuck } from "@remotion-components/clay/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The mishap gag: the tower of clay pucks topples and the headline droops. Change what falls to fit the story.
export const OopsScene: React.FC<{ startFrame?: number }> = () => (
  <ClayScene tone="night" lamp={90} lampOn={0}>
    <Eyebrow>Uh oh</Eyebrow>
    <Title lines={["Oh", "*no."]} y={250} sagAt={70} />
    <Stack x={700} count={9} color="coral" from={4} toppleAt={64} dir={1} seed={7} />
    <Tuck x={400} scale={0.7} from={2} gesture="shrug" gestureAt={80} look="right" mouth={LIPSYNC.oops} visemes={VISEMES.oops} seed={6} />
  </ClayScene>
);
export default OopsScene;
