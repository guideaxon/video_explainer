import React from "react";
import { GScene, Eyebrow, Headline, Stage, Toy, Chip, C } from "@remotion-components/glossy/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// The problem: chips for the pain points bounce in around Pebbo, who drops in and shrugs.
// SAMPLE pain points: replace with the real problem your product solves.
export const TooMuchStuffScene: React.FC<{ startFrame?: number }> = () => (
  <GScene tone="lilac">
    <Eyebrow>The problem</Eyebrow>
    <Headline lines={["Too much", "*stuff."]} />
    <Chip x={90} y={620} label="12 open tabs" color={C.cherry} from={14} />
    <Chip x={480} y={760} label="Lost notes" color={C.tangerine} from={22} />
    <Chip x={130} y={900} label="Missed pings" color={C.sky} from={30} />
    <Stage>
      <Toy x={540} y={1460} scale={0.85} enter="drop" from={4} gesture="shrug" gestureAt={40} look="up" mouth={LIPSYNC.too_much_stuff} visemes={VISEMES.too_much_stuff} seed={2} />
    </Stage>
  </GScene>
);
export default TooMuchStuffScene;
