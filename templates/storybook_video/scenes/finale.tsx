import React from "react";
import { EndCard } from "@remotion-components/storybook/kit";

// End card over art/finale.png. "SAMPLE Title" and the button text are placeholders: use the real title and call to action.
export const FinaleScene: React.FC<{ startFrame?: number }> = () => <EndCard art="art/finale.png" title="SAMPLE Title" button="SAMPLE button" />;
export default FinaleScene;
