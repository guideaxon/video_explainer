import React from "react";
import { useCurrentFrame } from "remotion";
import { Scene, Art, Draw, Headline, Label, MONO, THEMES, prog, usePop } from "@remotion-components/vantage/kit";

const N = THEMES.navy;
const cx = 540;
const cy = 1000;
const R = 250;
const rad = (deg: number) => (deg * Math.PI) / 180;
const pt = (deg: number, r = R) => ({ x: cx + Math.cos(rad(deg)) * r, y: cy + Math.sin(rad(deg)) * r });

const NODES = [
  { n: "1", t: "PLAN", a: -90, at: 0, ly: -128 },
  { n: "2", t: "ACT", a: 30, at: 30, ly: 112 },
  { n: "3", t: "REFLECT", a: 150, at: 60, ly: 112 },
];

const arc = (from: number, to: number) => {
  const s = pt(from + 17);
  const e = pt(to - 17);
  return `M${s.x},${s.y} A${R},${R} 0 0 1 ${e.x},${e.y}`;
};

const Node: React.FC<(typeof NODES)[number]> = ({ n, t, a, at, ly }) => {
  const p = usePop(at, 12);
  const { x, y } = pt(a);
  return (
    <g opacity={Math.min(1, p * 1.4)}>
      <circle cx={x} cy={y} r={56 * p} fill="#0a1127" stroke={N.accent} strokeWidth={5} />
      <text x={x} y={y + 14} textAnchor="middle" fill={N.accent} fontSize={40} fontFamily={MONO} fontWeight={500}>{n}</text>
    </g>
  );
};

export const Beat4Scene: React.FC<{ startFrame?: number }> = () => {
  const frame = useCurrentFrame();
  const spin = prog(frame, 0, 190) * 360;
  const dot = pt(-90 + spin);
  return (
    <Scene theme="navy" beat={4} chapter="04 · DAILY LOOP" readout="STORED ON-DEVICE">
      <Art>
        <circle cx={cx} cy={cy} r={R + 70} fill="none" stroke={N.dim} strokeWidth={1.5} strokeDasharray="3 9" opacity={0.6} />
        <Draw d={arc(-90, 30)} from={18} dur={26} w={4} />
        <Draw d={arc(30, 150)} from={48} dur={26} w={4} />
        <Draw d={arc(150, 270)} from={78} dur={26} w={4} />
        {NODES.map((nd) => (
          <Node key={nd.n} {...nd} />
        ))}
        <circle cx={dot.x} cy={dot.y} r={9} fill={N.accent} opacity={prog(frame, 100, 112)} />
      </Art>
      {NODES.map((nd) => {
        const { x, y } = pt(nd.a);
        return (
          <Label key={nd.t} x={x} y={y + nd.ly - (nd.ly < 0 ? 4 : 0)} anchor="middle" size={42} serif delay={nd.at + 8} color={N.ink} spacing={4}>
            {nd.t}
          </Label>
        );
      })}
      <Headline lines={["PLAN. ACT.", "*REFLECT."]} top={200} size={124} delay={2} />
      <Label x={cx} y={cy - 30} anchor="middle" size={26} delay={30} color={N.dim}>DAILY</Label>
      <Label x={cx} y={cy + 6} anchor="middle" size={26} delay={34} color={N.dim}>LOOP</Label>
      <Label x={cx} y={1440} anchor="middle" size={24} delay={110} color={N.accent}>INSIGHTS STAY ON YOUR DEVICE</Label>
    </Scene>
  );
};
export default Beat4Scene;
