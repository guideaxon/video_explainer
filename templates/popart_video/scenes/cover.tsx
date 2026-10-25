import React from "react";
import { Page, Panel, Masthead, Caption, SpeedLines, Ramp, Hero, C } from "@remotion-components/popart/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Cover panel: masthead title, the hero walks in and waves. SAMPLE title and cover line: replace with the real story.
export const CoverScene: React.FC<{ startFrame?: number }> = () => (
  <Page tone="yellow">
    <Panel x={40} y={120} w={1000} h={1680} bg={C.cyan} dots={{ color: C.blue, size: "l", r: 0.22 }} wipe="none" weight={14} seed={1}>
      <SpeedLines cx={500} cy={1000} w={1000} h={1680} rIn={420} color={C.white} count={40} seed={4} />
      <Ramp w={1000} h={500} x={0} y={1180} color={C.magenta} step={30} dir="up" />
      <Hero x={140} y={1580} scale={1} walkTo={500} walk={{ from: 6, to: 40 }} gesture="wave" gestureAt={46} mouth={LIPSYNC.cover} visemes={VISEMES.cover} />
      <Caption x={40} y={1500} from={30} w={620}>A SAMPLE COMIC ADVENTURE</Caption>
    </Panel>
    <Masthead title="DOT DASH" issue="No. 1" line="SAMPLE cover line" size={190} y={200} />
  </Page>
);
export default CoverScene;
