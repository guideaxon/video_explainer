import React from "react";
import { LowPolyShot, EndCard } from "@remotion-components/lowpoly/kit";
import { LIPSYNC, CAPTIONS } from "./lipsync";

// Closing shot with the end card: title (max 4 words) and one real call to action. Replace both.
export const FinaleScene: React.FC<{ startFrame?: number }> = () => (
  <LowPolyShot shot="wide" move="pull-out" mood="smile" gesture="open" gestureAt={18} mouth={LIPSYNC.finale} caption={CAPTIONS.finale} overlay={<EndCard title="SAMPLE Title" button="SAMPLE Call to action" />} />
);
export default FinaleScene;
