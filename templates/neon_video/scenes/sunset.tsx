import React from "react";
import { NScene, Horizon, Eyebrow, Headline, Sub, Tubo } from "@remotion-components/neon/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Outro: the sun sinks below the grid while Tubo waves goodbye. Replace the sign-off line.
export const SunsetScene: React.FC<{ startFrame?: number }> = () => (
  <NScene>
    <Horizon speed={0.02} sunR={300} sunSet={{ from: 10, to: 120 }} />
    <Eyebrow>Signing off</Eyebrow>
    <Headline lines={["Drive", "*safe."]} from={4} />
    <Sub y={600} from={20}>Sample story, drawn in code.</Sub>
    <Tubo x={540} y={1480} scale={0.8} from={0} gesture="wave" gestureAt={16} mouth={LIPSYNC.sunset} visemes={VISEMES.sunset} seed={4} />
  </NScene>
);
export default SunsetScene;
