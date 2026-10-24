import React from "react";
import { PaintedShot } from "@remotion-components/storybook/kit";

// Painted still art/render.png with a slow pan-right. Replace the art and move per shot.
export const RenderScene: React.FC<{ startFrame?: number }> = () => <PaintedShot art="art/render.png" move="pan-right" />;
export default RenderScene;
