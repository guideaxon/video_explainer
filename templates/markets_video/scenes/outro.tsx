import React from "react";
import { MScene, Layer, Ripples, BullHead, Title, Kicker, SERIF, W } from "@remotion-components/markets/kit";

export const Outro: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="paper" chapter="" story="">
    <Layer>
      <Ripples cx={W / 2} cy={720} from={14} />
      <BullHead cx={W / 2} cy={720} scale={2.2} from={0} />
    </Layer>
    <Title top={1100} size={110} font={SERIF} delay={40} spacing={2}>stay bullish</Title>
    <Kicker top={1290} delay={56}>SAMPLE DATA · NOT FINANCIAL ADVICE</Kicker>
  </MScene>
);
export default Outro;
