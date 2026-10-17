import React from "react";
import { MScene, Layer, Ripples, Ticker, Title, Kicker, W } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace the tickers, title and story number for a real video.
const TOP = [
  { sym: "TSLA", chg: 5.2 }, { sym: "MSFT", chg: 2.1 }, { sym: "AAPL", chg: -0.8 }, { sym: "NVDA", chg: 8.4 },
  { sym: "AMZN", chg: 1.9 }, { sym: "META", chg: 3.3 }, { sym: "GOOG", chg: -1.2 },
];
const BOTTOM = [...TOP].reverse();

export const Title_: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="paper" chapter="" story="">
    <Layer>
      <Ripples cx={W / 2} cy={930} from={10} />
    </Layer>
    <Ticker y={260} items={TOP} />
    <Ticker y={1420} items={BOTTOM} reverse />
    <Kicker top={620} delay={4}>MARKET STORY Nº 01</Kicker>
    <Title top={700}>BULL<br />RUN</Title>
    <Kicker top={1200} delay={30}>HOW A RALLY IS BUILT, IN 40 SECONDS</Kicker>
  </MScene>
);
export default Title_;
