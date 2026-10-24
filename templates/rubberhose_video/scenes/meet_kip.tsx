import React from "react";
import { RScene, Eyebrow, Headline, Ground, Kip } from "@remotion-components/rubberhose/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The character introduces itself: big on screen so every mouth shape reads, one wave, then the bounce.
export const MeetKipScene: React.FC<{ startFrame?: number }> = () => (
  <RScene tone="paper">
    <Eyebrow>Meet the star</Eyebrow>
    <Headline lines={["Hello, I'm", "*Kip!"]} y={250} />
    <Ground y={1440} />
    <Kip x={540} y={1440} scale={1.2} from={4} gesture="wave" gestureAt={12} hold={40} mouth={LIPSYNC.meet_kip} visemes={VISEMES.meet_kip} />
  </RScene>
);
export default MeetKipScene;
