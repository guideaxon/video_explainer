import React from "react";
import { useCurrentFrame } from "remotion";
import { PScene, Headline, Glass, GOLD, C, HEAD, prog } from "@remotion-components/promo/kit";

const AMOUNTS = ["$10", "$25", "$50", "$100", "$250", "Other"];

export const TheyDonateScene: React.FC<{ startFrame?: number }> = () => {
  const frame = useCurrentFrame();
  const rise = prog(frame, 60, 90);
  return (
    <PScene glow={C.gold}>
      <Headline lines={["They ^donate."]} y={220} size={124} />
      <Glass x={70} y={640} w={940} h={620} from={12} rot={[34, 0, 0]} glow={C.gold}>
        <div style={{ padding: 40, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 26 }}>
          {AMOUNTS.map((a, i) => (
            <div key={a} style={{ height: 150, borderRadius: 26, background: GOLD, boxShadow: "0 12px 0 #b07d00", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: HEAD, fontWeight: 800, fontSize: 52, color: "#2a1d00", opacity: Math.min(1, prog(frame, 20 + i * 5, 32 + i * 5)) }}>{a}</div>
          ))}
        </div>
      </Glass>
      <div style={{ position: "absolute", left: 0, width: 1080, top: 560 - rise * 120, textAlign: "center", fontFamily: HEAD, fontWeight: 800, fontSize: 90, color: C.gold, opacity: rise * (1 - prog(frame, 100, 116)), textShadow: `0 0 40px ${C.gold}` }}>+$50</div>
    </PScene>
  );
};
export default TheyDonateScene;
