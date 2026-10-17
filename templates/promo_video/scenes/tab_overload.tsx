import React from "react";
import { PScene, Browser, Skeleton, Headline, C } from "@remotion-components/promo/kit";

// The pain: a pile of windows. Replace the headline with the customer's real pain point.
const WINDOWS = [
  { x: 40, y: 250, w: 520, h: 330, rot: [10, -16, -5] as [number, number, number], accent: C.red },
  { x: 520, y: 330, w: 500, h: 320, rot: [8, 14, 4] as [number, number, number], accent: C.teal },
  { x: 70, y: 560, w: 540, h: 340, rot: [6, -10, 3] as [number, number, number], accent: C.gold },
  { x: 480, y: 640, w: 520, h: 330, rot: [10, 12, -4] as [number, number, number], accent: C.blue },
  { x: 150, y: 860, w: 500, h: 320, rot: [8, -8, -2] as [number, number, number], accent: C.indigo },
  { x: 520, y: 900, w: 480, h: 300, rot: [8, 10, 5] as [number, number, number], accent: C.cyan },
];

export const TabOverloadScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.red}>
    {WINDOWS.map((win, i) => (
      <Browser key={i} x={win.x} y={win.y} w={win.w} h={win.h} from={4 + i * 6} rot={win.rot}>
        <Skeleton rows={4} from={8 + i * 6} accent={win.accent} />
      </Browser>
    ))}
    <Headline lines={["Six browser tabs.", "Zero time to run the room."]} y={1290} size={76} from={44} />
  </PScene>
);
export default TabOverloadScene;
