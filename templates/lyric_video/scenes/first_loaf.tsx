import React from "react";
import { PopScene, Cursive, Toast, Pixie, SampleTag, C } from "@remotion-components/lyric/kit";

// The soft emotional beat on a pastel surface, ending in an achievement toast.
export const FirstLoafScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="lavender">
    <Cursive text="It rose," y={330} size={130} color={C.ink} from={4} />
    <Cursive text="and so did I." y={510} size={110} color={C.pink} from={14} />
    <Cursive text="Happy baking... right?" y={820} size={70} color="#7a6a99" from={28} />
    <Toast y={1030} title="First loaf" sub="Baked on the first try" from={36} />
    <Pixie x={430} y={1190} scale={1.5} hat="chef" from={14} />
    <SampleTag />
  </PopScene>
);
export default FirstLoafScene;
