import React from "react";
import { PaintedShot } from "@remotion-components/storybook/kit";

// Painted still art/workshop.png with a slow pull-out. Replace the art and move per shot.
export const WorkshopScene: React.FC<{ startFrame?: number }> = () => <PaintedShot art="art/workshop.png" move="pull-out" />;
export default WorkshopScene;
