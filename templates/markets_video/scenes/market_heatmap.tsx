import React from "react";
import { MScene, Layer, Heatmap } from "@remotion-components/markets/kit";

// SAMPLE DATA: replace tiles with real tickers and their percentage moves.
const tiles = [
  { label: "NVDA", value: 3.4 }, { label: "AAPL", value: 1.2 }, { label: "MSFT", value: 1.9 }, { label: "AMZN", value: 2.4 },
  { label: "GOOG", value: 0.8 }, { label: "META", value: 1.5 }, { label: "TSLA", value: -3.1 }, { label: "JPM", value: 0.4 },
  { label: "XOM", value: -2.2 }, { label: "AMD", value: 4.6 }, { label: "V", value: 0.3 }, { label: "UNH", value: -0.9 },
  { label: "DIS", value: -1.4 }, { label: "JNJ", value: 0.2 }, { label: "PFE", value: -2.6 }, { label: "BA", value: -1.1 },
];

export const MarketHeatmap: React.FC<{ startFrame?: number }> = () => (
  <MScene theme="paper" chapter="the market heatmap" meta="TOP 16 · TODAY">
    <Layer>
      <Heatmap tiles={tiles} cols={4} />
    </Layer>
  </MScene>
);
export default MarketHeatmap;
