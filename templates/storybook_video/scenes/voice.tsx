import React from "react";
import { PaintedShot, OnStill } from "@remotion-components/storybook/kit";
import { Wren } from "@remotion-components/storybook/character";
import { LIPSYNC, VISEMES } from "./lipsync";

// Painted PLATE art/voice.png (microphone and tape machine, no character) with a slow pan-left. Wren stands at the
// ground point and reads aloud: the mouth comes from scenes/lipsync.ts (written by storybook_finalize_storyboard.py).
// Until the voiceover exists she talks on a syllable rhythm (talking). Add <Foreground points={[...]} /> after <OnStill>
// to put a counter or pot in front of her feet.
export const VoiceScene: React.FC<{ startFrame?: number }> = () => (
  <PaintedShot art="art/voice.png" move="pan-left">
    <OnStill>
      <Wren
        x={640} y={650} scale={0.9} mouth={LIPSYNC["voice"]} visemes={VISEMES["voice"]} talking gesture="open" gestureAt={20} seed={3}
        light={{ x: -0.4, warmth: 0.6, strength: 0.5 }}
      />
    </OnStill>
  </PaintedShot>
);
export default VoiceScene;
