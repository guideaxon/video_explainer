import { mountFigure } from "@isofigure/runtime";
import { act, announce, init, readout, tick } from "./model";
import type { RState } from "./model";
import { View, callouts } from "./figure";

mountFigure<RState>({
  fig: "Fig 1",
  name: "Robot",
  title: "Robot",
  hint: "Press the buttons, the keys or the robot itself",
  caption:
    "Wave raises the arm on its shoulder servo, waves three times and lowers it again (2.5 s). Talk runs the mouth LEDs " +
    "and the chest speaker for 2.5 s on a syllable rhythm; there is no voice. The eyes also blink on their own every few " +
    "seconds (not with reduced motion). Sounds are made in the page, play only after you press something, and M mutes them.",
  controls: [
    { id: "wave", label: "Wave", keys: ["w"], hint: "Raise the arm and wave" },
    { id: "blink", label: "Blink", keys: ["b"], hint: "Close and open the eyes" },
    { id: "talk", label: "Talk", keys: ["t"], hint: "Run the mouth LEDs and the speaker for 2.5 s" },
    { id: "antenna", label: "Antenna light", keys: ["a"], hint: "Switch the antenna light on or off" },
    { id: "sound", label: "Sound", keys: ["m"], hint: "Mute or unmute the sound effects" },
  ],
  init, act, tick, readout, announce, View, callouts,
});
