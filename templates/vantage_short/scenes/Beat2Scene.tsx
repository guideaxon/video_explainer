import React from "react";
import { Sequence, useCurrentFrame } from "remotion";
import { Scene, Art, Draw, Headline, Label, NeuralNet, PhonePath, THEMES, prog } from "@remotion-components/vantage/kit";

const P = THEMES.parch;
const N = THEMES.navy;

const CLOUD =
  "M-190,70 C-260,70 -270,-30 -180,-30 C-190,-120 -60,-150 0,-80 C50,-160 190,-130 175,-20 C260,-20 270,70 185,70 Z";

/** Beat 2: the cloud is crossed out (parchment), then the world turns midnight for Vantage. */
export const Beat2Scene: React.FC<{ startFrame?: number }> = () => {
  const frame = useCurrentFrame();
  const flip = 1 - prog(frame, 80, 102);
  return (
    <>
      <Sequence from={72}>
        <Scene theme="navy" beat={2} chapter="02 · MEET VANTAGE" readout="UPLOADED: 0 B" fade={false}>
          <Art>
            <Draw d={PhonePath(540, 1030, 340, 600)} from={14} dur={34} w={6} color={N.accent} />
            <Draw d="M490,770 H590" from={40} dur={12} w={6} color={N.accent} />
            <NeuralNet cx={540} cy={1030} scale={1.25} from={24} />
          </Art>
          <Headline lines={["MEET", "*VANTAGE."]} top={200} delay={2} />
          <Label x={540} y={1400} anchor="middle" size={24} delay={36} color={N.dim}>YOUR AI LIFE COACH · RUNNING ON YOUR DEVICE</Label>
        </Scene>
      </Sequence>
      <div style={{ position: "absolute", inset: 0, opacity: flip, pointerEvents: "none" }}>
        <Scene theme="parch" beat={2} chapter="02 · THE CLOUD" readout="SENT TO CLOUD: ALL">
          <Art>
            <g transform="translate(540 820) scale(1.45)">
              <Draw d={CLOUD} from={6} dur={36} w={3.5} />
            </g>
            <Draw d={PhonePath(540, 1290, 150, 260, 28)} from={20} dur={26} w={4} />
            {[480, 540, 600].map((x, i) => (
              <line key={i} x1={x} x2={x} y1={1140} y2={940} stroke={P.ink} strokeWidth={3} strokeDasharray="4 14" strokeLinecap="round" strokeDashoffset={-frame * 1.5} opacity={prog(frame, 36 + i * 4, 50 + i * 4)} />
            ))}
            <Draw d="M320,640 L760,1000" from={52} dur={14} w={9} color={P.accent} />
            <Draw d="M760,640 L320,1000" from={58} dur={14} w={9} color={P.accent} />
          </Art>
          <Headline lines={["NOT THE", "*CLOUD."]} top={200} delay={30} />
          <Label x={540} y={1440} anchor="middle" size={24} delay={40} color={P.dim}>YOUR THOUGHTS · SOMEONE ELSE'S SERVER</Label>
        </Scene>
      </div>
    </>
  );
};
export default Beat2Scene;
