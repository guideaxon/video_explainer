import React from "react";
import { useCurrentFrame } from "remotion";
import { Scene, Art, Draw, Headline, Label, NeuralNet, PhonePath, LockGlyph, THEMES, prog } from "@remotion-components/vantage/kit";

const N = THEMES.navy;

export const Beat3Scene: React.FC<{ startFrame?: number }> = () => {
  const frame = useCurrentFrame();
  const rings = [0, 1, 2].map((i) => (frame / 70 + i / 3) % 1);
  return (
    <Scene theme="navy" beat={3} chapter="03 · ON-DEVICE" readout="UPLOADED: 0 B">
      <Art>
        {rings.map((r, i) => (
          <circle key={i} cx={540} cy={990} r={250 + r * 230} fill="none" stroke={N.accent} strokeWidth={2} opacity={(1 - r) * 0.35 * prog(frame, 20, 40)} />
        ))}
        <Draw d={PhonePath(540, 990, 330, 580)} from={4} dur={30} w={6} color={N.accent} />
        <Draw d="M492,740 H588" from={26} dur={10} w={6} color={N.accent} />
        <NeuralNet cx={540} cy={990} scale={1.2} from={12} />
        <circle cx={730} cy={1230} r={74} fill={N.bg} stroke={N.accent} strokeWidth={5} opacity={prog(frame, 30, 40)} />
        <LockGlyph cx={730} cy={1214} scale={0.7} from={36} />
        {[0, 1, 2].map((i) => (
          <line key={i} x1={470 + i * 70} x2={470 + i * 70} y1={700} y2={640} stroke={N.dim} strokeWidth={3} strokeDasharray="4 14" strokeLinecap="round" strokeDashoffset={-frame * 1.5} opacity={prog(frame, 60 + i * 5, 75 + i * 5) * 0.8} />
        ))}
        <Draw d="M440,615 H640" from={80} dur={12} w={6} color="#ff6b5a" />
      </Art>
      <Headline lines={["IT NEVER", "LEAVES YOUR", "*DEVICE."]} top={170} size={112} delay={2} />
      <Label x={540} y={1360} anchor="middle" size={96} delay={44} color={N.accent} weight={500} spacing={4}>0 BYTES</Label>
      <Label x={540} y={1490} anchor="middle" size={22} delay={54} color={N.dim}>UPLOADED · ZERO DATA LEAVES THE PHONE</Label>
    </Scene>
  );
};
export default Beat3Scene;
