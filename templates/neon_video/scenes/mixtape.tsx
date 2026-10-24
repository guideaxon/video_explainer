import React from "react";
import { NScene, Horizon, Eyebrow, Headline, Cassette, Tubo } from "@remotion-components/neon/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The reveal: a neon cassette with a hand-written label; Tubo cheers. SAMPLE label: write the story's own line.
export const MixtapeScene: React.FC<{ startFrame?: number }> = () => (
  <NScene>
    <Horizon speed={0.04} sunR={220} />
    <Eyebrow>Side A</Eyebrow>
    <Headline lines={["Press", "*play."]} from={4} />
    <Cassette x={200} y={590} w={680} label="Night mix 86" side="A" from={8} />
    <Tubo x={540} y={1480} scale={0.6} from={4} gesture="cheer" gestureAt={30} mouth={LIPSYNC.mixtape} visemes={VISEMES.mixtape} seed={3} />
  </NScene>
);
export default MixtapeScene;
