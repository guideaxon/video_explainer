import React from "react";
import { PopScene, Slam, Pixie, SampleTag, C } from "@remotion-components/lyric/kit";

// The punchline slam: big blocky words on a checkerboard.
export const OneTryScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="checker">
    <Slam text={"ONE\nTRAY"} y={330} size={300} color="#fff" shadow={C.pink} from={2} rotate={-4} />
    <Slam text="ONE TRY" y={1010} size={140} color={C.yellow} shadow={C.ink} from={22} rotate={3} />
    <Pixie x={430} y={1190} scale={1.5} hat="chef" from={34} />
    <SampleTag />
  </PopScene>
);
export default OneTryScene;
