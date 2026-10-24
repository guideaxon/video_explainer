import React from "react";
import { RScene, Eyebrow, Headline, Ground, Kip, Clock } from "@remotion-components/rubberhose/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The problem: Kip trucks in from the left, the alarm clock rings, Kip shrugs.
export const ProblemScene: React.FC<{ startFrame?: number }> = () => (
  <RScene tone="paper" seed={2}>
    <Eyebrow>The problem</Eyebrow>
    <Headline lines={["Tea takes", "*forever."]} y={250} />
    <Ground y={1440} />
    <Clock x={830} y={1440} scale={0.8} from={6} ringFrom={30} />
    <Kip x={-120} walkTo={380} y={1440} scale={0.95} walk={{ from: 0, to: 40 }} gesture="shrug" gestureAt={50} look="right" mouth={LIPSYNC.problem} visemes={VISEMES.problem} />
  </RScene>
);
export default ProblemScene;
