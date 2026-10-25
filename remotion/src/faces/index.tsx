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
import { Wren, WrenStage } from "../components/storybook/character";
import { NScene, Tubo } from "../components/neon/kit";
import { RScene, Kip } from "../components/rubberhose/kit";
import { GScene, Stage, Toy } from "../components/glossy/kit";
import { ClayScene, Tuck } from "../components/clay/kit";
import { Hero } from "../components/popart/kit";

const S = 512;
const Bg: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <AbsoluteFill style={{ background: color, overflow: "hidden" }}>{children}</AbsoluteFill>
);

const LaunchFace = () => (
  <Bg color="#d7f4e4">
    <LaunchArt><g transform="translate(-290 -770) scale(1)"><Mascot cx={546} cy={1010} scale={1.75} stage={6} shadow={false} /></g></LaunchArt>
  </Bg>
);
const LyricFace = () => (
  <Bg color="#ffe3f1"><Pixie x={-10} y={-30} scale={3.4} /></Bg>
);
const LeaderbotFace = () => (
  <Bg color="#111111"><PixelBot x={0} y={0} size={S} smooth look={0} /></Bg>
);
const LowpolyFace = () => <LowPolyShot shot="close" move="hold" mood="smile" />;
const PapercutFace = () => (
  <Bg color="#2a2150">
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
      <Defs />
      <Fox x={-150} y={700} s={4.2} t={0.4} look={-4} />
    </svg>
  </Bg>
);

const StorybookFace = () => (
  <Bg color="#fbf1de"><WrenStage width={S} height={S}><Wren x={256} y={937} scale={3.4} blink={false} /></WrenStage></Bg>
);


// The five 1080x1920 faces are rendered full size and cropped to the head by scripts/ui_render_faces.mjs.
const NeonFace = () => <NScene horizon={460} stars={30}><Tubo x={256} y={905} scale={1.25} from={0} /></NScene>;
const RubberhoseFace = () => <RScene tone="paper" damage={0}><Kip x={540} y={1420} scale={1.8} bounce={false} blink={false} /></RScene>;
const GlossyFace = () => <GScene tone="peach"><Stage><Toy x={540} y={1000} scale={1.2} enter="none" blink={false} gesture="rest" look="camera" /></Stage></GScene>;
const ClayFace = () => <ClayScene tone="card"><Tuck x={540} y={1100} scale={1} gesture="rest" /></ClayScene>;
const PopartFace = () => <Bg color="#00a8e8"><Hero x={256} y={880} scale={0.8} blink={false} /></Bg>;

const FACES: [string, React.FC, number, number][] = [
  ["launch", LaunchFace, S, S], ["lyric", LyricFace, S, S], ["leaderbot", LeaderbotFace, S, S],
  ["lowpoly", LowpolyFace, 1280, 720], ["papercut", PapercutFace, S, S], ["storybook", StorybookFace, S, S],
  ["neon", NeonFace, S, S], ["rubberhose", RubberhoseFace, 1080, 1920], ["glossy", GlossyFace, 1080, 1920],
  ["clay", ClayFace, 1080, 1920], ["popart", PopartFace, S, S],
];
registerRoot(() => (
  <>
    {FACES.map(([id, C, w, h]) => <Composition key={id} id={id} component={C} width={w} height={h} fps={30} durationInFrames={60} />)}
  </>
));
