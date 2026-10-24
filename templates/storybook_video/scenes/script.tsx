import React from "react";
import { PaintedShot } from "@remotion-components/storybook/kit";

// Painted still art/script.png with a slow pan-right. Replace the art and move per shot.
export const ScriptScene: React.FC<{ startFrame?: number }> = () => <PaintedShot art="art/script.png" move="pan-right" />;
export default ScriptScene;
