// Face thumbnails for the web UI's style picker (ui/web/public/faces/<bundle>.png). Each face is the real kit
// character, so the card shows what the style looks like. Rendered by scripts/ui_render_faces.mjs; not part of any video.
import React from "react";
import { AbsoluteFill, Composition, registerRoot } from "remotion";
import { Art as LaunchArt, Mascot } from "../components/launch/kit";
import { Pixie } from "../components/lyric/kit";
import { PixelBot } from "../components/leaderbot/kit";
import { LowPolyShot } from "../components/lowpoly/kit";
import { Defs } from "../components/papercut/paper";
import { Fox } from "../components/papercut/fox";

const S = 512;
const Bg: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <AbsoluteFill style={{ background: color, overflow: "hidden" }}>{children}</AbsoluteFill>
);

const LaunchFace = () => (
  <Bg color="#d7f4e4">
    <LaunchArt><g transform="translate(-290 -770) scale(1)"><Mascot cx={546} cy={940} scale={2.0} stage={6} shadow={false} /></g></LaunchArt>
  </Bg>
);
const LyricFace = () => (
  <Bg color="#ffe3f1"><Pixie x={90} y={30} scale={2.6} /></Bg>
);
const LeaderbotFace = () => (
  <Bg color="#111111"><PixelBot x={0} y={0} size={S} smooth look={0} /></Bg>
);
const LowpolyFace = () => <LowPolyShot shot="close" move="hold" mood="smile" />;
const PapercutFace = () => (
  <Bg color="#2a2150">
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Defs />
      <Fox x={-60} y={640} s={4.2} t={0.4} look={-4} />
    </svg>
  </Bg>
);

const FACES: [string, React.FC, number, number][] = [
  ["launch", LaunchFace, S, S], ["lyric", LyricFace, S, S], ["leaderbot", LeaderbotFace, S, S],
  ["lowpoly", LowpolyFace, 1280, 720], ["papercut", PapercutFace, S, S],
];
registerRoot(() => (
  <>
    {FACES.map(([id, C, w, h]) => <Composition key={id} id={id} component={C} width={w} height={h} fps={30} durationInFrames={60} />)}
  </>
));
