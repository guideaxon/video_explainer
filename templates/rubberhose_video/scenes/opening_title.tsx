import React from "react";
import { RScene, Rays, TitleCard, Kip, SampleTag } from "@remotion-components/rubberhose/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Opening: iris in on an Art Deco title card over a turning sunburst; Kip waves from below the card.
export const OpeningTitleScene: React.FC<{ startFrame?: number }> = () => (
  <RScene tone="stage" iris="in" irisAt={{ x: 540, y: 700 }}>
    <Rays cy={700} />
    <TitleCard kicker="Kip the Kettle in" title={["Monday", "Morning"]} sub="A cartoon in seven scenes" y={300} h={760} />
    <Kip x={540} y={1460} scale={0.55} from={14} gesture="wave" gestureAt={24} mouth={LIPSYNC.opening_title} visemes={VISEMES.opening_title} />
    <SampleTag />
  </RScene>
);
export default OpeningTitleScene;
