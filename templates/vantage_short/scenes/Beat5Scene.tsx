import React from "react";
import { useCurrentFrame } from "remotion";
import { Scene, Art, Draw, Headline, Label, THEMES, prog } from "@remotion-components/vantage/kit";

const N = THEMES.navy;

const ROWS = [
  {
    n: "01",
    t: "PERSONAL MASTERY",
    d: "FOCUS · RESILIENCE · NO BURNOUT",
    icon: ["M10,100 L45,40 L65,70 L85,30 L115,100 Z", "M85,30 V8 L108,17 L85,26"],
  },
  {
    n: "02",
    t: "COMMUNICATION",
    d: "REHEARSE THE HARD CONVERSATION",
    icon: ["M10,18 H72 V60 H36 L20,76 V60 H10 Z", "M52,52 H110 V94 H100 V110 L84,94 H52 Z"],
  },
  {
    n: "03",
    t: "CAREER GROWTH",
    d: "SHARPER STRATEGIC DECISIONS",
    icon: ["M10,104 H40 V78 H70 V52 H100 V22", "M86,34 L100,18 L114,34"],
  },
];

const TOP = 560;
const STEP = 268;

export const Beat5Scene: React.FC<{ startFrame?: number }> = () => {
  const frame = useCurrentFrame();
  return (
    <Scene theme="navy" beat={5} chapter="05 · THREE PILLARS" readout="PRIVATE BY DESIGN">
      <Art>
        {ROWS.map((r, i) => {
          const y = TOP + i * STEP;
          const at = i * 26;
          return (
            <g key={r.n}>
              <Draw d={`M90,${y} H990`} from={at} dur={22} w={2} color={N.dim} />
              <g transform={`translate(110 ${y + 56})`}>
                {r.icon.map((d, k) => (
                  <Draw key={k} d={d} from={at + 8 + k * 8} dur={26} w={5} color={N.accent} />
                ))}
              </g>
            </g>
          );
        })}
        <Draw d={`M90,${TOP + 3 * STEP} H990`} from={78} dur={22} w={2} color={N.dim} />
      </Art>
      <Headline lines={["THREE", "*PILLARS."]} top={200} size={124} delay={2} />
      {ROWS.map((r, i) => {
        const y = TOP + i * STEP;
        const at = i * 26 + 10;
        return (
          <React.Fragment key={r.n}>
            <Label x={90} y={y + 30} size={24} delay={at} color={N.dim}>{r.n}</Label>
            <Label x={300} y={y + 62} size={50} serif delay={at + 6} spacing={2}>{r.t}</Label>
            <Label x={300} y={y + 140} size={23} delay={at + 12} color={N.accent} spacing={2}>{r.d}</Label>
          </React.Fragment>
        );
      })}
      <Label x={540} y={1440} anchor="middle" size={52} serif delay={125} color={N.accent} spacing={4}>PRIVATE BY DESIGN.</Label>
    </Scene>
  );
};
export default Beat5Scene;
