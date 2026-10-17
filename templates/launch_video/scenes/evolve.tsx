import React from "react";
import { useCurrentFrame } from "remotion";
import { LScene, Eyebrow, Counter, Sub, Art, Mascot, prog } from "@remotion-components/launch/kit";

// Progress made visible: the counter ticks up while the mascot grows through its stages.
export const EvolveScene: React.FC<{ startFrame?: number }> = () => {
  const frame = useCurrentFrame();
  const p = prog(frame, 6, 156);
  const stage = 1 + 9 * p;
  return (
    <LScene tone="mint" sunburst>
      <Eyebrow>10 evolution stages</Eyebrow>
      <Counter label="Workout" value={438} progress={p} stage={stage} y={270} from={6} dur={150} />
      <Art>
        <Mascot cx={600} cy={1180} scale={2.0} stage={stage} from={0} />
      </Art>
      <Sub y={1480} align="center">From seed to champion.</Sub>
    </LScene>
  );
};
export default EvolveScene;
