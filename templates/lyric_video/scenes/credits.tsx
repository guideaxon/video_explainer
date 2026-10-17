import React from "react";
import { PopScene, Credits, Pixie, SampleTag } from "@remotion-components/lyric/kit";

// Credits: replace with the real song source, author and tools.
export const CreditsScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="black">
    <Credits y={330} rows={[{ label: "SONG BY", name: "Your Song Tool" }, { label: "VIDEO BY", name: "You" }, { label: "BUILT WITH", name: "Remotion" }]} />
    <Pixie x={440} y={1150} scale={1.5} hat="chef" wave from={40} />
    <SampleTag dark />
  </PopScene>
);
export default CreditsScene;
