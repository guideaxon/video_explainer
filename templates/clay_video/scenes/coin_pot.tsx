import React from "react";
import { ClayScene, Eyebrow, Title, Bubble, Pot, Coin, Tuck, SampleTag } from "@remotion-components/clay/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Coins drop into the clay pot one by one while Tuck explains. SAMPLE speech: write a real line for the story.
export const CoinPotScene: React.FC<{ startFrame?: number }> = () => (
  <ClayScene tone="night" lamp={70} lampOn={2}>
    <Eyebrow>Coin pot</Eyebrow>
    <Title lines={["Coin by", "*coin."]} y={250} />
    <Bubble x={60} y={640} w={700} from={12}>Every coin goes in the pot.</Bubble>
    <Pot x={780} />
    <Coin x={780} y={900} dropAt={20} dropTo={1190} hide />
    <Coin x={780} y={900} dropAt={46} dropTo={1190} hide />
    <Coin x={780} y={900} dropAt={72} dropTo={1190} hide />
    <Tuck x={450} scale={0.7} from={4} gesture="shrug" gestureAt={50} mouth={LIPSYNC.coin_pot} visemes={VISEMES.coin_pot} seed={3} />
    <SampleTag />
  </ClayScene>
);
export default CoinPotScene;
