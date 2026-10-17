import React from "react";
import { PScene, Headline, Browser, Skeleton, GRAD, C } from "@remotion-components/promo/kit";

export const BrandedPagesScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.blue}>
    <Headline lines={["Branded", "*RSVP pages."]} y={230} />
    <Browser x={60} y={640} w={960} h={800} from={14} rot={[6, 8, 0]} glow={C.indigo}>
      <div style={{ margin: 30, height: 300, borderRadius: 20, background: "linear-gradient(135deg, #2b3fd6, #7a5cff)" }} />
      <Skeleton rows={3} from={30} />
      <div style={{ margin: "10px 30px", height: 70, borderRadius: 16, background: "rgba(255,255,255,0.1)" }} />
      <div style={{ margin: "20px 30px", height: 84, borderRadius: 22, background: GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#04101c", fontWeight: 600, fontSize: 32 }}>Reserve my spot</div>
    </Browser>
  </PScene>
);
export default BrandedPagesScene;
