import React from "react";
import { PaintedShot } from "@remotion-components/storybook/kit";

// Painted still art/storyboard.png with a slow push-in. Replace the art and move per shot.
export const StoryboardScene: React.FC<{ startFrame?: number }> = () => <PaintedShot art="art/storyboard.png" move="push-in" />;
export default StoryboardScene;
