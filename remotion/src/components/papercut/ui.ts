/**
 * Interaction state shared by the player and every kit component, through one React context.
 * Scenes never need props for it: GuideStar, Fox, Flower, Fireflies, IsoGate and Callouts read it themselves.
 */
import { createContext, useContext } from "react";

export type Poke = { kind: "star" | "fox" | "flower"; id: string; wall: number };
export type UiState = {
  xray: number; // 0..1, eased by the player ("look inside")
  level: number; // 0..1, live loudness of the music
  wall: number; // wall-clock seconds, so reactions play even while the film is paused
  pokes: Poke[]; // recent clicks / key presses on the star, fox and flowers
  reduce: boolean; // prefers-reduced-motion
};

export const NO_UI: UiState = { xray: 0, level: 0, wall: 0, pokes: [], reduce: false };
export const UiContext = createContext<UiState>(NO_UI);
export const useUi = () => useContext(UiContext);

/** Seconds since the most recent poke of `kind` (optionally one element); Infinity if none. A poke with id "*" hits all. */
export const pokeAge = (ui: UiState, kind: Poke["kind"], id?: string) => {
  let a = Infinity;
  for (const p of ui.pokes) if (p.kind === kind && (id === undefined || p.id === id || p.id === "*")) a = Math.min(a, ui.wall - p.wall);
  return a;
};

/** 1 right after a poke, easing to 0 over `dur` seconds. */
export const pokeKick = (age: number, dur = 1.4) => (age >= dur ? 0 : Math.pow(1 - age / dur, 2));
