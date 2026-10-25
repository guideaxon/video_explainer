import React from "react";
import { Page, Panel, Headline, Balloon, Laptop, MotionLines, Sfx, Hero, C } from "@remotion-components/popart/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Solution: a headline panel with the laptop, then the hero strides across and points. SAMPLE copy.
export const FixScene: React.FC<{ startFrame?: number }> = () => (
  <Page tone="yellow">
    <Panel x={40} y={120} w={1000} h={700} bg={C.cyan} dots={{ color: C.blue, size: "m", r: 0.2 }} wipe="left" seed={7}>
      <Headline lines={["ONE TAP,", "*INBOX ZERO."]} x={50} y={40} size={150} from={4} />
      <Laptop x={330} y={400} w={340} screen="0 NEW" from={16} />
      <Sfx x={860} y={520} text="PING!" size={110} from={20} color={C.magenta} />
    </Panel>
    <Panel x={40} y={844} w={1000} h={956} bg={C.white} dots={{ color: C.magenta, size: "l", r: 0.2 }} wipe="right" from={10} seed={8}>
      <MotionLines x={330} y={420} len={260} h={300} count={7} dir={1} seed={5} from={14} to={74} />
      <Hero x={200} y={930} scale={0.78} from={10} walkTo={520} walk={{ from: 14, to: 74 }} gesture="point" gestureAt={80} mouth={LIPSYNC.fix} visemes={VISEMES.fix} />
      <Balloon x={60} y={70} w={480} h={220} tail={[450, 340]} from={84}>JUST ONE TAP.</Balloon>
    </Panel>
  </Page>
);
export default FixScene;
