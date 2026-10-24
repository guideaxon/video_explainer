import React from "react";
import { AbsoluteFill, Composition, registerRoot } from "remotion";
import { blinkAt } from "./components/rig";
import { NScene, Tubo, TUBO_GESTURES, OSD, NEON } from "./components/neon/kit";
import { PROJECT_SCENES } from "../../templates/neon_video/scenes/index";

const SHAPES = ["A", "B", "C", "D", "E", "F", "G", "H", "X"];
const STILL = 40;
const blinkSeed = (() => { for (let s = 0; s < 500; s++) if (blinkAt(STILL, 30, s) > 0.7) return s; return 0; })();
const Label: React.FC<{ x: number; y: number; t: string }> = ({ x, y, t }) => <div style={{ position: "absolute", left: x - 100, width: 200, top: y, textAlign: "center", fontFamily: OSD, fontSize: 36, color: NEON.white }}>{t}</div>;

const Sheet: React.FC = () => (
  <NScene>
    {SHAPES.map((s, i) => {
      const x = 130 + (i % 5) * 205; const y = 470 + Math.floor(i / 5) * 470;
      return <React.Fragment key={s}><Tubo x={x} y={y} scale={0.58} visemes={s.repeat(400)} blink={false} /><Label x={x} y={y + 10} t={`mouth ${s}`} /></React.Fragment>;
    })}
    <Tubo x={130 + 4 * 205} y={940} scale={0.58} seed={blinkSeed} /><Label x={130 + 4 * 205} y={950} t="blink" />
    {TUBO_GESTURES.slice(1).map((g, i) => { const x = 140 + i * 265; return <React.Fragment key={g}><Tubo x={x} y={1430} scale={0.55} gesture={g} gestureAt={0} blink={false} /><Label x={x} y={1440} t={g} /></React.Fragment>; })}
    {[0.375, 0.75, 1.125, 1.5].map((c, i) => { const x = 140 + i * 265; return <React.Fragment key={c}><Tubo x={x} y={1860} scale={0.55} walk={{ from: 0, to: 999, cadence: c }} walkTo={x} blink={false} /><Label x={x} y={1870} t={`walk ${i + 1}/4`} /></React.Fragment>; })}
  </NScene>
);

const Root: React.FC = () => (
  <>
    {Object.entries(PROJECT_SCENES).map(([k, C]) => <Composition key={k} id={k.replace(/_/g, "-")} component={C as React.FC} durationInFrames={150} fps={30} width={1080} height={1920} />)}
    <Composition id="sheet" component={Sheet} durationInFrames={60} fps={30} width={1080} height={2000} />
  </>
);
registerRoot(Root);
