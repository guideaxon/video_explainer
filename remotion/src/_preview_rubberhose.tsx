import React from "react";
import { AbsoluteFill, Composition, registerRoot } from "remotion";
import { PROJECT_SCENES } from "../../templates/rubberhose_video/scenes/index";
import { Kip, RScene, KIP_GESTURES, DECO } from "./components/rubberhose/kit";
import { blinkAt, VISEMES } from "./components/rig";

const F = 40; // sheet frame
const blinkSeed = (() => {
  for (let s = 0; s < 500; s++) if (blinkAt(F, 30, s) > 0.9) return s;
  return 0;
})();

const Label: React.FC<{ x: number; y: number; t: string }> = ({ x, y, t }) => (
  <div style={{ position: "absolute", left: x - 120, width: 240, top: y + 10, textAlign: "center", fontFamily: DECO, fontSize: 26, color: "#1b140d" }}>{t}</div>
);

const Sheet: React.FC = () => {
  const cells: { label: string; el: (x: number, y: number) => React.ReactNode }[] = [
    ...VISEMES.map((v) => ({ label: `mouth ${v}`, el: (x: number, y: number) => <Kip x={x} y={y} scale={0.3} visemes={v.repeat(200)} blink={false} bounce={false} /> })),
    { label: "blink", el: (x, y) => <Kip x={x} y={y} scale={0.3} seed={blinkSeed} bounce={false} /> },
    ...KIP_GESTURES.filter((g) => g !== "rest").map((g) => ({ label: g, el: (x: number, y: number) => <Kip x={x} y={y} scale={0.3} gesture={g} gestureAt={0} blink={false} bounce={false} /> })),
    ...[0, 1, 2, 3].map((k) => ({ label: `walk ${k}/4`, el: (x: number, y: number) => <Kip x={x} y={y} walkTo={x + 1} scale={0.3} walk={{ from: F - 3 - k * 4, to: 1000 }} blink={false} /> })),
    { label: "look left", el: (x, y) => <Kip x={x} y={y} scale={0.3} look="left" blink={false} bounce={false} /> },
    { label: "look up", el: (x, y) => <Kip x={x} y={y} scale={0.3} look="up" blink={false} bounce={false} /> },
  ];
  return (
    <RScene tone="paper" damage={0}>
      {cells.map((c, i) => {
        const x = 150 + (i % 4) * 260;
        const y = 300 + Math.floor(i / 4) * 330;
        return <React.Fragment key={i}>{c.el(x, y)}<Label x={x} y={y} t={c.label} /></React.Fragment>;
      })}
    </RScene>
  );
};

const Big: React.FC<{ v: string }> = ({ v }) => (
  <RScene tone="paper" damage={0}>
    <Kip x={540} y={1700} scale={2.4} visemes={v.repeat(200)} blink={false} bounce={false} />
  </RScene>
);

const Root: React.FC = () => (
  <>
    {Object.entries(PROJECT_SCENES).map(([k, C]) => (
      <Composition key={k} id={k.replace(/_/g, "-")} component={C as React.FC} durationInFrames={150} fps={30} width={1080} height={1920} />
    ))}
    <Composition id="sheet" component={Sheet} durationInFrames={F + 1} fps={30} width={1080} height={1920} />
    {VISEMES.map((v) => (
      <Composition key={v} id={`big-${v}`} component={() => <Big v={v} />} durationInFrames={10} fps={30} width={1080} height={1920} />
    ))}
    <Composition id="blank" component={() => <AbsoluteFill />} durationInFrames={1} fps={30} width={10} height={10} />
  </>
);
registerRoot(Root);
