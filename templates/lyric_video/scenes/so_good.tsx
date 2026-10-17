import React from "react";
import { PopScene, Cursive, Slam, Sticker, Pixie, SampleTag, C } from "@remotion-components/lyric/kit";

// The big finish: kinetic slam type on a sunburst.
export const SoGoodScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="pinkburst">
    <Cursive text="I'm gonna be" y={300} size={88} color="#fff" from={2} />
    <Slam text="SO GOOD" y={430} size={230} color={C.yellow} shadow={C.ink} from={8} rotate={-3} />
    <Slam text="AT BREAD" y={760} size={190} color="#fff" shadow={C.pink} from={18} rotate={3} />
    <Sticker text="watch me" x={620} y={1060} rot={-8} from={30} bg={C.mint} />
    <Pixie x={140} y={1090} scale={2} hat="chef" wave from={20} />
    <SampleTag />
  </PopScene>
);
export default SoGoodScene;
