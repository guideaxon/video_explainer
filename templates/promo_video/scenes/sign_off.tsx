import React from "react";
import { PScene, Logo } from "@remotion-components/promo/kit";

// Replace the name and the address. "lumenstage.example" is a placeholder.
export const SignOffScene: React.FC<{ startFrame?: number }> = () => (
  <PScene>
    <Logo name="Lumen Stage" sub="lumenstage.example" cy={840} />
  </PScene>
);
export default SignOffScene;
