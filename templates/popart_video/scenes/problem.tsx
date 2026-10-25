import React from "react";
import { Page, Panel, Caption, Balloon, Envelope, MotionLines, Hero, C } from "@remotion-components/popart/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Problem: a close-up push-in on a shocked hero with a thought cloud, then a flood of envelopes. SAMPLE copy.
export const ProblemScene: React.FC<{ startFrame?: number }> = () => (
  <Page tone="paper">
    <Panel x={40} y={120} w={1000} h={800} bg={C.magenta} dots={{ color: C.yellow, size: "m", r: 0.22 }} wipe="up" seed={4} push={{ at: 6, to: 1.15, x: 0.5, y: 0.6, dur: 70 }}>
      <Hero x={400} y={1700} scale={1.6} from={2} gesture="think" gestureAt={20} mood="shock" mouth={LIPSYNC.problem} visemes={VISEMES.problem} />
      <Balloon x={560} y={60} w={400} h={250} tail={[640, 340]} kind="thought" from={26} size={44}>SO MANY EMAILS!</Balloon>
    </Panel>
    <Panel x={40} y={944} w={1000} h={856} bg={C.yellow} dots={{ color: C.cyan, size: "l", r: 0.2 }} wipe="left" from={16} seed={5}>
      <MotionLines x={900} y={250} len={420} h={360} count={9} dir={-1} seed={3} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <Envelope key={i} x={900 + (i % 3) * 30} y={200 + i * 70} size={150 + (i % 3) * 20} rot={(i - 3) * 9} from={22 + i * 5} drift={-2 - (i % 3)} />
      ))}
      <Caption x={30} y={720} from={26}>THE INBOX NEVER STOPS</Caption>
    </Panel>
  </Page>
);
export default ProblemScene;
