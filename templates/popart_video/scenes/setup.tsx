import React from "react";
import { Page, Panel, Caption, Balloon, Laptop, Ramp, Hero, C } from "@remotion-components/popart/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Setup: a wide establishing panel, then the hero talks to camera. SAMPLE copy: replace with the real set-up.
export const SetupScene: React.FC<{ startFrame?: number }> = () => (
  <Page tone="paper">
    <Panel x={40} y={120} w={1000} h={600} bg={C.yellow} dots={{ color: C.red, size: "m", r: 0.26 }} wipe="left" seed={2}>
      <Ramp w={1000} h={260} y={340} color={C.magenta} step={26} dir="up" />
      <Laptop x={240} y={150} w={520} screen="9:00 AM" from={6} />
      <Caption x={30} y={26} from={4}>MONDAY MORNING, SAMPLE CITY...</Caption>
    </Panel>
    <Panel x={40} y={744} w={1000} h={1056} bg={C.cyan} dots={{ color: C.white, size: "l", r: 0.16 }} wipe="right" from={12} seed={3} push={{ at: 14, to: 1.12, x: 0.5, y: 0.35, dur: 60 }}>
      <Hero x={720} y={1010} scale={0.82} from={14} gesture="wave" gestureAt={40} mouth={LIPSYNC.setup} visemes={VISEMES.setup} />
      <Balloon x={80} y={70} w={500} h={230} tail={[610, 360]} from={22}>Hi! I am Dot Dash.</Balloon>
    </Panel>
  </Page>
);
export default SetupScene;
