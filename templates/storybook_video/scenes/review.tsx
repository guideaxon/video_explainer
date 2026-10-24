import React from "react";
import { PaintedShot } from "@remotion-components/storybook/kit";

// Painted still art/review.png with a slow push-in. Replace the art and move per shot.
export const ReviewScene: React.FC<{ startFrame?: number }> = () => <PaintedShot art="art/review.png" move="push-in" />;
export default ReviewScene;
