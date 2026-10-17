import React from "react";
import { PopScene, Terminal, Sticker, Pixie, SampleTag, C } from "@remotion-components/lyric/kit";

// SAMPLE LYRICS: replace the typed lines with the song's opening line(s).
export const TerminalOpenScene: React.FC<{ startFrame?: number }> = () => (
  <PopScene bg="night">
    <Terminal y={380} h={600} title="terminal" cps={1.3} lines={[
      { t: ">>> print('Monday')", from: 4 },
      { t: "Hello, Monday.", from: 26, color: C.mint },
      { t: "Error: Monday.exe has", from: 46, color: C.pink, size: 40 },
      { t: "stopped responding", from: 58, color: C.pink, size: 40 },
    ]} />
    <Sticker text="oh-oh-oh!" x={600} y={250} rot={-8} from={20} />
    <Pixie x={700} y={1130} scale={1.7} wave from={30} />
    <SampleTag dark />
  </PopScene>
);
export default TerminalOpenScene;
