import React from "react";
import { ClayScene, Eyebrow, Title, Sub, Tuck } from "@remotion-components/clay/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Opening: the lamp clicks on, Tuck walks onto the felt table and waves. The title is clay letters.
export const HelloTuckScene: React.FC<{ startFrame?: number }> = () => (
  <ClayScene tone="card" lamp={940} lampOn={4}>
    <Eyebrow>Clay table</Eyebrow>
    <Title lines={["Hello,", "Tuck!"]} y={250} rainbow />
    <Tuck x={-180} scale={0.8} walk={{ from: 6, to: 66 }} walkTo={400} gesture="wave" gestureAt={72} mouth={LIPSYNC.hello_tuck} visemes={VISEMES.hello_tuck} seed={1} />
    <Sub y={600} from={40} w={560}>A little clay explainer</Sub>
  </ClayScene>
);
export default HelloTuckScene;
