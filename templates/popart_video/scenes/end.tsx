import React from "react";
import { Page, Panel, Headline, Caption, SpeedLines, Hero, C } from "@remotion-components/popart/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Sign-off: THE END / to be continued, the hero waves goodbye. SAMPLE line: replace with the real sign-off.
export const EndScene: React.FC<{ startFrame?: number }> = () => (
  <Page tone="yellow">
    <Panel x={40} y={120} w={1000} h={1680} bg={C.cyan} dots={{ color: C.white, size: "l", r: 0.16 }} wipe="none" weight={14} seed={11}>
      <SpeedLines cx={500} cy={1000} w={1000} h={1680} rIn={500} color={C.white} count={36} seed={2} />
      <Headline lines={["THE", "*END."]} x={60} y={60} size={210} from={2} />
      <Caption x={60} y={560} from={24} size={44}>TO BE CONTINUED...</Caption>
      <Hero x={540} y={1640} scale={0.9} from={4} gesture="wave" gestureAt={20} mouth={LIPSYNC.end} visemes={VISEMES.end} />
    </Panel>
  </Page>
);
export default EndScene;
