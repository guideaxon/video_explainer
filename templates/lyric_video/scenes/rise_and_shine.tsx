import React from "react";
import { PopScene, BubbleTitle, Cursive, Sticker, Pixie, SampleTag, C } from "@remotion-components/lyric/kit";

// SAMPLE LYRICS: the song's title moment. Two stacked bubble words fit the narrow canvas.
export const RiseAndShineScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="pinkburst">
    <BubbleTitle text="SOUR" y={330} size={270} color="#fff" shadow={C.pink} from={2} />
    <BubbleTitle text="DOUGH" y={640} size={270} color={C.yellow} shadow="#d9a300" from={10} rotate={2} />
    <Cursive text="(good morning, world)" y={1010} size={76} color={C.ink} from={36} />
    <Sticker text="rise & shine!" x={560} y={1120} rot={-8} from={44} bg={C.mint} />
    <Pixie x={180} y={1130} scale={1.6} hat="chef" wave from={30} />
    <SampleTag />
  </PopScene>
);
export default RiseAndShineScene;
