import React from "react";
import { PaintedShot } from "@remotion-components/storybook/kit";

// Painted still art/idea.png with a slow push-in. Replace the art and move per shot.
export const IdeaScene: React.FC<{ startFrame?: number }> = () => <PaintedShot art="art/idea.png" move="push-in" />;
export default IdeaScene;
