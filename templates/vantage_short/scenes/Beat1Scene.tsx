import React from "react";
import { useCurrentFrame } from "remotion";
import { Scene, Art, Draw, Headline, Label, THEMES, prog } from "@remotion-components/vantage/kit";

const P = THEMES.parch;

export const Beat1Scene: React.FC<{ startFrame?: number }> = () => {
  const frame = useCurrentFrame();
  const cx = 540;
  const cy = 1010;
  const rays = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * Math.PI * 2;
    const r1 = 262;
    const r2 = i % 2 ? 292 : 312;
    return `M${cx + Math.cos(a) * r1},${cy + Math.sin(a) * r1} L${cx + Math.cos(a) * r2},${cy + Math.sin(a) * r2}`;
  });
  const crescent = `M${cx},${cy - 190} A190,190 0 1,0 ${cx},${cy + 190} A140,190 0 1,1 ${cx},${cy - 190} Z`;
  const colon = frame % 30 < 15 ? ":" : " ";
  const fillP = prog(frame, 30, 60);
  return (
    <Scene theme="parch" beat={1} chapter="01 · THE DECISION" readout="SENT TO CLOUD: ALL">
      <Art>
        {rays.map((d, i) => (
          <Draw key={i} d={d} from={10 + i} dur={18} w={3} color={P.ink} />
        ))}
        <circle cx={cx} cy={cy} r={222} fill="none" stroke={P.ink} strokeWidth={2} strokeDasharray="3 9" strokeLinecap="round" opacity={prog(frame, 14, 40) * 0.7} />
        <path d={crescent} fill={P.ink} opacity={fillP * 0.92} />
        <Draw d={crescent} from={22} dur={34} w={4} />
        {[[170, 640], [900, 760], [840, 1390], [210, 1330]].map(([x, y], i) => (
          <g key={i} opacity={prog(frame, 50 + i * 6, 64 + i * 6)} stroke={P.ink} strokeWidth={3} strokeLinecap="round">
            <line x1={x - 12} y1={y} x2={x + 12} y2={y} />
            <line x1={x} y1={y - 12} x2={x} y2={y + 12} />
          </g>
        ))}
      </Art>
      <Headline lines={["IT'S LATE.", "A *DECISION", "LOOMS."]} top={200} delay={4} />
      <Label x={540} y={1420} anchor="middle" size={64} delay={40} spacing={8} weight={500}>{`11${colon}47 PM`}</Label>
      <Label x={540} y={1500} anchor="middle" size={22} delay={52} color={P.dim}>WHO DO YOU TRUST WITH IT?</Label>
    </Scene>
  );
};
export default Beat1Scene;
