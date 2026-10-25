import React from "react";
import { GScene, Eyebrow, Headline, Stage, Toy, Pedestal, Chip, C } from "@remotion-components/glossy/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Product shot: Pebbo drops onto a turning pedestal while feature chips bounce in above.
// SAMPLE features: list only what the product really does.
export const TurntableScene: React.FC<{ startFrame?: number }> = () => (
  <GScene tone="lilac">
    <Eyebrow>Built in</Eyebrow>
    <Headline lines={["Private", "*by default."]} />
    <Chip x={80} y={590} label="Works offline" color={C.mint} from={20} />
    <Chip x={560} y={680} label="No account" color={C.sky} from={28} />
    <Chip x={110} y={780} label="Your data stays put" color={C.grape} from={36} size={36} />
    <Stage>
      <Pedestal x={540} y={1340} color={C.grape} from={2} />
      <Toy x={540} y={1340} scale={0.88} enter="drop" from={10} mouth={LIPSYNC.turntable} visemes={VISEMES.turntable} seed={6} />
    </Stage>
  </GScene>
);
export default TurntableScene;
