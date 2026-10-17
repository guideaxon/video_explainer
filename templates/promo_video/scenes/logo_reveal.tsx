import React from "react";
import { PScene, Logo } from "@remotion-components/promo/kit";

// Replace the name and the line under it. "Lumen Stage" is a placeholder brand.
export const LogoRevealScene: React.FC<{ startFrame?: number }> = () => (
  <PScene>
    <Logo name="Lumen Stage" sub="Live events your audience acts on." cy={840} />
  </PScene>
);
export default LogoRevealScene;
