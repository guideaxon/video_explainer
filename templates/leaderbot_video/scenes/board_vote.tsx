import React from "react";
import { CScene, Eyebrow, Headline, PixelBot, Stamp, SampleTag, C } from "@remotion-components/leaderbot/kit";

// Three board bots vote; stamps slam in one by one. SAMPLE vote: tie the result to the real story.
export const BoardVoteScene: React.FC<{ startFrame?: number }> = () => (
  <CScene tone="ink">
    <Eyebrow>Board room</Eyebrow>
    <Headline lines={["The board", "*votes."]} y={270} />
    <PixelBot x={60} y={680} size={300} look={1} from={6} />
    <PixelBot x={390} y={680} size={300} look={2} from={10} />
    <PixelBot x={720} y={680} size={300} look={3} from={14} />
    <Stamp x={80} y={1040} text="Yes" color={C.green} from={30} size={56} />
    <Stamp x={420} y={1040} text="Yes" color={C.green} from={42} size={56} rot={5} />
    <Stamp x={730} y={1040} text="No" color={C.red} from={54} size={56} rot={-4} />
    <SampleTag />
  </CScene>
);
export default BoardVoteScene;
