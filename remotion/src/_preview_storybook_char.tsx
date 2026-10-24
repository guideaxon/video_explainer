// TEMPORARY preview entry for the storybook character layer. Delete when done.
import React from "react";
import { AbsoluteFill, Composition, registerRoot } from "remotion";
import { blinkAt } from "./components/rig";
import { Foreground, Grain, OnStill, PAL, PaintedShot } from "./components/storybook/kit";
import { Wren, WREN_GESTURES } from "./components/storybook/character";

const F = 40;
const blinkSeed = (() => {
  for (let s = 0; s < 500; s++) if (blinkAt(F, 30, s) > 0.9) return s;
  return 0;
})();
const shape = (c: string) => c.repeat(400);

const Label: React.FC<{ x: number; y: number; t: string }> = ({ x, y, t }) => (
  <text x={x} y={y} textAnchor="middle" fontFamily="Georgia" fontSize={15} fill={PAL.ink}>{t}</text>
);

const Sheet: React.FC = () => (
  <AbsoluteFill style={{ background: PAL.paper }}>
    <svg viewBox="0 0 1280 720" width="100%" height="100%">
      {"ABCDEFGHX".split("").map((c, i) => (
        <g key={c}>
          <Wren x={70 + i * 127} y={215} scale={0.68} visemes={shape(c)} blink={false} />
          <Label x={70 + i * 127} y={238} t={`mouth ${c}`} />
        </g>
      ))}
      {WREN_GESTURES.map((g, i) => (
        <g key={g}>
          <Wren x={80 + i * 150} y={460} scale={0.68} gesture={g} gestureAt={0} blink={false} />
          <Label x={80 + i * 150} y={483} t={g} />
        </g>
      ))}
      <Wren x={990} y={460} scale={0.68} seed={blinkSeed} />
      <Label x={990} y={483} t="blink" />
      <Wren x={1150} y={460} scale={0.68} blink={false} light={{ x: 0.8, warmth: 0.15, strength: 0.9 }} />
      <Label x={1150} y={483} t="cool light, right" />
      {[0, 0.5, 1, 1.5].map((ph, i) => (
        <g key={ph}>
          <Wren x={110 + i * 160} y={700} scale={0.68} walk={{ from: F - ph * 15, to: 900 }} walkTo={110 + i * 160} blink={false} />
          <Label x={110 + i * 160} y={716} t={`walk ${ph}pi`} />
        </g>
      ))}
      <Wren x={800} y={700} scale={0.68} walk={{ from: F - 7.5, to: 900 }} walkTo={0} blink={false} />
      <Label x={800} y={716} t="walk left" />
      <Wren x={960} y={700} scale={0.68} gesture="wave" gestureAt={0} light={{ x: -0.7, warmth: 0.95, strength: 0.8, tint: "#e8a060" }} blink={false} />
      <Label x={960} y={716} t="warm lamp, left" />
      <Wren x={1150} y={700} scale={1} visemes={shape("D")} gesture="point" gestureAt={0} look="right" blink={false} />
    </svg>
    <Grain />
  </AbsoluteFill>
);

/** Walks from the door along the cobbles, stops, talks and gestures. */
const Street: React.FC<{ char?: boolean }> = ({ char = true }) => (
  <PaintedShot art="art/workshop.png" move="push-in">
    {char && (
      <OnStill>
        <Wren x={290} y={672} scale={0.6} walk={{ from: 6, to: 66 }} walkTo={520} gesture="wave" gestureAt={74} talking light={{ x: -0.5, warmth: 0.65, strength: 0.55 }} seed={2} />
      </OnStill>
    )}
  </PaintedShot>
);

/** Stands behind the desk: the desk is drawn again over her (foreground occlusion). */
const Desk: React.FC = () => (
  <PaintedShot art="art/idea.png" move="pan-left">
    <OnStill>
      <Wren x={520} y={700} scale={1.45} talking gesture="open" gestureAt={10} look="camera" light={{ x: -0.45, warmth: 0.6, strength: 0.5, tint: "#e9cfa0" }} seed={3} />
    </OnStill>
    <Foreground feather={1.5} points={[[0, 610], [30, 560], [120, 546], [380, 542], [760, 540], [950, 540], [1030, 560], [1062, 640], [1080, 690], [1080, 720], [0, 720]]} />
  </PaintedShot>
);

const Root: React.FC = () => (
  <>
    <Composition id="Sheet" component={Sheet} durationInFrames={60} fps={30} width={1920} height={1080} />
    <Composition id="Street" component={Street} durationInFrames={120} fps={30} width={1920} height={1080} />
    <Composition id="StreetPlain" component={() => <Street char={false} />} durationInFrames={120} fps={30} width={1920} height={1080} />
    <Composition id="Desk" component={Desk} durationInFrames={90} fps={30} width={1920} height={1080} />
  </>
);

registerRoot(Root);
