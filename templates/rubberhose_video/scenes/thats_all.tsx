import React from "react";
import { RScene, Rays, EndCard, Kip } from "@remotion-components/rubberhose/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Sign-off: drum-head end card over the sunburst, Kip waves, and the iris closes on Kip's face.
export const ThatsAllScene: React.FC<{ startFrame?: number }> = () => (
  <RScene tone="stage" iris="out" irisAt={{ x: 540, y: 1230 }} seed={6}>
    <Rays cy={680} />
    <EndCard text="That's all!" sub="See you next reel" cy={680} />
    <Kip x={540} y={1460} scale={0.6} from={10} gesture="wave" gestureAt={20} mouth={LIPSYNC.thats_all} visemes={VISEMES.thats_all} />
  </RScene>
);
export default ThatsAllScene;
