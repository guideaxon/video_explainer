import React from "react";
import { PopScene, BubbleTitle, Cursive, Slam, Stopwatch, Art, Pixie, SampleTag, C } from "@remotion-components/lyric/kit";

// A timing gag: stopwatch sweeps to the number while the stamp lands.
export const FortyMinutesScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="yellowburst">
    <BubbleTitle text="FORTY" y={280} size={190} color={C.pink} shadow="#a80d56" from={2} />
    <BubbleTitle text="MINUTES" y={470} size={190} color={C.pink} shadow="#a80d56" from={10} rotate={2} />
    <Cursive text="later, it was" y={720} size={86} from={22} />
    <Slam text="BAKED!" y={830} size={230} color="#fff" shadow={C.pink} from={32} rotate={-6} />
    <Art>
      <Stopwatch cx={300} cy={1330} r={150} seconds={40} from={6} />
    </Art>
    <Pixie x={640} y={1190} scale={1.5} hat="chef" from={20} />
    <SampleTag />
  </PopScene>
);
export default FortyMinutesScene;
