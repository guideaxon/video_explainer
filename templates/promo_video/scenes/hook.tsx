import React from "react";
import { PScene, Typed, C } from "@remotion-components/promo/kit";

// Opening line, typed out; the `weak` word is struck through (the thing you do better than).
export const HookScene: React.FC<{ startFrame?: number }> = () => (
  <PScene glow={C.indigo} floor={false}>
    <Typed text="Your audience expects more than another boring video call." weak="boring" y={800} from={4} />
  </PScene>
);
export default HookScene;
