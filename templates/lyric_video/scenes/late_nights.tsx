import React from "react";
import { PopScene, Cursive, RetroWindow, Pixie, Art, SampleTag, C, CODE } from "@remotion-components/lyric/kit";

// A quiet, emotional beat: neon cursive on the night surface, a moon and a tiny window of "work".
export const LateNightsScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="night">
    <Art>
      <path d="M880,300 A110,110 0 1 0 880,520 A85,110 0 1 1 880,300 Z" fill="#ffe45e" stroke="#2a1b3d" strokeWidth={6} />
    </Art>
    <Cursive text="Three a.m.," y={380} size={120} color="#ff9bd0" glow={C.pink} from={6} align="left" />
    <Cursive text="feeding my starter." y={540} size={96} color="#ffd1ea" glow={C.pink} from={24} align="left" />
    <RetroWindow x={520} y={960} w={480} h={320} title="starter.log" from={30} dark>
      <div style={{ padding: 24, fontFamily: CODE, fontSize: 28, color: C.green, lineHeight: 1.5 }}>feed: yes<br />bubbles: some<br />hope: rising</div>
    </RetroWindow>
    <Pixie x={150} y={1010} scale={1.7} from={14} />
    <SampleTag dark />
  </PopScene>
);
export default LateNightsScene;
