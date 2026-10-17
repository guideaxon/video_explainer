import React from "react";
import { MScene, Layer, CandleChart, Annotation, Candle } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace with real OHLC + volume.
const candles: Candle[] = Array.from({ length: 20 }, (_, i) => {
  const o = 100 + i * 2.8 + Math.sin(i * 1.7) * 2;
  const c = o + 3 + Math.cos(i * 2.3) * 2.4;
  return { o, c, h: Math.max(o, c) + 1.8, l: Math.min(o, c) - 1.6, v: 40 + ((i * 37) % 60) };
});

export const HowARallyIsBuilt: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="paper" chapter="how a rally is built" meta="DAILY CANDLES · 20 SESSIONS">
    <Layer>
      <CandleChart candles={candles} xLabels={["wk 1", "wk 2", "wk 3", "wk 4"]} />
      <Annotation x={560} y={760} text="gap up!" to={[760, 560]} from={90} rotate={-6} />
    </Layer>
  </MScene>
);
export default HowARallyIsBuilt;
