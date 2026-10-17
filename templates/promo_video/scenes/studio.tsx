import React from "react";
import { PScene, Headline, Browser, Tile, Skeleton, C } from "@remotion-components/promo/kit";

// Feature pattern: headline on top, a tilted product window below.
export const StudioScene: React.FC<{ startFrame?: number }> = () => (
  <PScene>
    <Headline lines={["A studio", "that *runs", "the *show."]} y={190} />
    <Browser x={60} y={700} w={960} h={760} from={14} rot={[8, -6, 0]} glow={C.blue}>
      <Tile x={30} y={74} w={600} h={340} hue={200} live label="Host" from={22} />
      <Tile x={650} y={74} w={280} h={160} hue={280} from={28} />
      <Tile x={650} y={254} w={280} h={160} hue={160} from={34} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 450 }}>
        <Skeleton rows={6} from={40} />
      </div>
    </Browser>
  </PScene>
);
export default StudioScene;
