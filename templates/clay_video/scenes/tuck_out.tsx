import React from "react";
import { ClayScene, Eyebrow, Title, Sub, Tuck } from "@remotion-components/clay/kit";
import { LIPSYNC, VISEMES } from "./lipsync";

// Sign-off: Tuck cheers, a cardboard line says goodbye. Replace the sign-off line.
export const TuckOutScene: React.FC<{ startFrame?: number }> = () => (
  <ClayScene tone="rose">
    <Eyebrow>Tuck out</Eyebrow>
    <Title lines={["See you", "*soon."]} y={250} />
    <Tuck x={540} scale={0.85} from={4} gesture="cheer" gestureAt={14} mouth={LIPSYNC.tuck_out} visemes={VISEMES.tuck_out} seed={7} />
    <Sub y={600} from={30} w={600}>Sample clay. Made by hand.</Sub>
  </ClayScene>
);
export default TuckOutScene;
