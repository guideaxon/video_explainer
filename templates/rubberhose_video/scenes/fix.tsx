import React from "react";
import { RScene, Headline, Ground, Kip, Sign, Cup } from "@remotion-components/rubberhose/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The fix: a sign with the three steps drops in, Kip whistles, a teacup bounces on the beat.
export const FixScene: React.FC<{ startFrame?: number }> = () => (
  <RScene tone="paper" seed={5}>
    <Headline lines={["No more", "*waiting."]} y={230} />
    <Ground y={1440} />
    <Sign x={70} y={560} w={430} lines={["Whistle,", "pour,", "*sip!"]} from={8} size={60} post={460} />
    <Cup x={270} y={1440} scale={0.8} from={20} />
    <Kip x={760} y={1440} scale={0.9} gesture="toot" gestureAt={30} hold={30} mouth={LIPSYNC.fix} visemes={VISEMES.fix} seed={2} />
  </RScene>
);
export default FixScene;
