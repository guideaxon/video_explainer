import { mountFigure } from "@isofigure/runtime";
import { act, announce, init, readout, tick } from "./model";
import type { WState } from "./model";
import { View, callouts } from "./figure";

mountFigure<WState>({
  fig: "Fig 1",
  name: "Washing machine",
  title: "Washing machine",
  hint: "Press the buttons or the keys · try the door mid-cycle",
  caption:
    "Cotton 40°: fill 4, wash 45, rinse 25, spin 12 min at 1200 rpm. The cycle plays as a time-lapse (10 min per second). " +
    "The door locks while a cycle runs and while there is water in the drum; the drum reverses at 45 rpm while washing.",
  controls: [
    { id: "power", label: "Power", keys: ["p"], hint: "Switch the machine on or off (cancels a running cycle)" },
    { id: "program", label: "Program", keys: ["n"], hint: "Turn the knob to the next program" },
    { id: "start", label: "Start / pause", keys: ["s", " "], hint: "Start the cycle, or pause and resume it" },
    { id: "door", label: "Door", keys: ["d"], hint: "Open or close the door" },
  ],
  init, act, tick, readout, announce, View, callouts,
});
