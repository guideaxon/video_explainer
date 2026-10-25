import React from "react";
import { Page, Panel, Starburst, SpeedLines, Hero, C } from "@remotion-components/popart/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The turning point: one full-page panel, speed lines, a raised fist and a starburst. SAMPLE word: change it.
export const PowScene: React.FC<{ startFrame?: number }> = () => (
  <Page tone="ink">
    <Panel x={40} y={120} w={1000} h={1680} bg={C.yellow} dots={{ color: C.red, size: "l", r: 0.24 }} wipe="none" seed={6} push={{ at: 0, to: 1.12, x: 0.45, y: 0.4, dur: 80 }}>
      <SpeedLines cx={430} cy={640} w={1000} h={1680} rIn={260} count={64} seed={8} />
      <Hero x={400} y={1640} scale={1.15} from={0} gesture="fist" gestureAt={10} mood="fierce" mouth={LIPSYNC.pow} visemes={VISEMES.pow} />
      <Starburst x={640} y={340} r={270} text="POW!" from={14} />
    </Panel>
  </Page>
);
export default PowScene;
