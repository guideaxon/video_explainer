import React from "react";
import { LScene, Eyebrow, Headline, WidgetCard, LivePill, C } from "@remotion-components/launch/kit";

export const WidgetsScene: React.FC<{ startFrame?: number }> = () => (
  <LScene tone="night">
    <Eyebrow>Widgets · Lock screen · Live activity</Eyebrow>
    <Headline lines={["Always on", "*your screen."]} size={124} />
    <WidgetCard x={80} y={700} w={440} h={300} from={10} />
    <WidgetCard x={560} y={700} w={440} h={300} from={16} accent={C.gold} />
    <WidgetCard x={80} y={1040} w={920} h={280} title="This week" from={24} />
    <LivePill x={80} y={1360} w={920} label="Rest" time="0:52" right="Session 34:12" from={44} />
  </LScene>
);
export default WidgetsScene;
