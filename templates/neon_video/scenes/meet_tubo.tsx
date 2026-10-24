import React from "react";
import { NScene, Horizon, Eyebrow, Headline, Tubo } from "@remotion-components/neon/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The character walks in on the grid, stops and waves while it talks. "Tubo" is the bundle's original robot.
export const MeetTuboScene: React.FC<{ startFrame?: number }> = () => (
  <NScene>
    <Horizon speed={0.02} />
    <Eyebrow>Your host</Eyebrow>
    <Headline lines={["Meet", "*Tubo."]} from={4} />
    <Tubo x={-180} walkTo={540} y={1480} scale={0.9} from={0} walk={{ from: 0, to: 60 }} gesture="wave" gestureAt={64} mouth={LIPSYNC.meet_tubo} visemes={VISEMES.meet_tubo} />
  </NScene>
);
export default MeetTuboScene;
