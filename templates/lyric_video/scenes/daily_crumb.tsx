import React from "react";
import { PopScene, Newspaper, Pixie, SampleTag } from "@remotion-components/lyric/kit";

// A news-clipping gag. Replace the headline and the circled phrase.
export const DailyCrumbScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="cream">
    <Newspaper y={260} masthead="THE DAILY CRUMB" headline="WANTED: ONE BRAVE" circled="BREAD WIZARD" />
    <Pixie x={380} y={1130} scale={1.6} hat="chef" from={40} />
    <SampleTag />
  </PopScene>
);
export default DailyCrumbScene;
