import React from "react";
import { RScene, Headline, Ground, Kip, Puff, Stars } from "@remotion-components/rubberhose/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The gag: Kip toots so hard the lid rattles, steam puffs everywhere, dizzy stars circle the knob.
export const GagScene: React.FC<{ startFrame?: number }> = () => (
  <RScene tone="paper" seed={3}>
    <Headline lines={["Too much", "*steam!"]} y={230} />
    <Ground y={1440} />
    <Kip x={540} y={1440} scale={1.05} gesture="toot" gestureAt={8} hold={90} look="up" mouth={LIPSYNC.gag} visemes={VISEMES.gag} />
    <Puff x={250} y={860} from={30} dur={50} size={1.1} seed={1} />
    <Puff x={820} y={780} from={42} dur={50} size={0.9} seed={2} />
    <Puff x={360} y={700} from={54} dur={50} size={0.8} seed={3} />
    <Stars x={540} y={780} from={30} rx={170} />
  </RScene>
);
export default GagScene;
