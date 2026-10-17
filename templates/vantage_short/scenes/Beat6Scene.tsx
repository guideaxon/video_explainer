import React from "react";
import { useCurrentFrame } from "remotion";
import { Scene, Art, Draw, Headline, Label, LockGlyph, THEMES, SERIF, MONO, prog } from "@remotion-components/vantage/kit";

const N = THEMES.navy;

const Pill: React.FC<{ y: number; text: string; delay: number; solid?: boolean }> = ({ y, text, delay, solid }) => {
  const p = prog(useCurrentFrame(), delay, delay + 14);
  return (
    <div
      style={{
        position: "absolute",
        left: 150,
        width: 780,
        top: y,
        height: 100,
        borderRadius: 50,
        border: `3px solid ${N.accent}`,
        background: solid ? N.accent : "transparent",
        color: solid ? "#0a1127" : N.accent,
        fontFamily: MONO,
        fontWeight: 500,
        fontSize: 34,
        letterSpacing: 3,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
        boxShadow: solid ? `0 0 40px ${N.accent}66` : undefined,
      }}
    >
      {text}
    </div>
  );
};

export const Beat6Scene: React.FC<{ startFrame?: number }> = () => {
  const frame = useCurrentFrame();
  const p = prog(frame, 14, 34);
  return (
    <Scene theme="navy" beat={6} chapter="06 · TRY IT" readout="PRIVATE BY DESIGN">
      <Art>
        <LockGlyph cx={540} cy={310} scale={1.5} from={0} />
        <Draw d="M240,830 H840" from={26} dur={22} w={2} color={N.dim} />
      </Art>
      <div
        style={{
          position: "absolute",
          left: 0,
          width: 1080,
          top: 470,
          textAlign: "center",
          fontFamily: SERIF,
          fontWeight: 900,
          fontSize: 132,
          letterSpacing: 16,
          color: N.ink,
          textShadow: `0 0 40px ${N.accent}55`,
          opacity: p,
          transform: `translateY(${(1 - p) * 30}px)`,
        }}
      >
        VANTAGE
      </div>
      <Label x={540} y={700} anchor="middle" size={26} delay={24} color={N.dim} spacing={6}>PRIVATE AI LIFE COACH</Label>
      <Headline lines={["TRY IT *FREE."]} top={900} size={100} delay={30} align="center" />
      <Pill y={1090} text="VANTAGE.GUIDEAXON.COM" delay={44} solid />
      <Pill y={1230} text="▶ GET IT ON GOOGLE PLAY" delay={56} />
      <Label x={540} y={1420} anchor="middle" size={24} delay={70} color={N.dim}>LINK IN BIO</Label>
    </Scene>
  );
};
export default Beat6Scene;
