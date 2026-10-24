import React from "react";
import { PaintedShot } from "@remotion-components/storybook/kit";

// Painted still art/voice.png with a slow pan-left. Replace the art and move per shot.
export const VoiceScene: React.FC<{ startFrame?: number }> = () => <PaintedShot art="art/voice.png" move="pan-left" />;
export default VoiceScene;
