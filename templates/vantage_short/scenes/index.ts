/**
 * Custom Scene Registry for YouTube Shorts (vantage style bundle style).
 * Keys match beat IDs in the storyboard. The player gives each scene a beat-local frame clock.
 */

import React from "react";

import { Beat1Scene } from "./Beat1Scene";
import { Beat2Scene } from "./Beat2Scene";
import { Beat3Scene } from "./Beat3Scene";
import { Beat4Scene } from "./Beat4Scene";
import { Beat5Scene } from "./Beat5Scene";
import { Beat6Scene } from "./Beat6Scene";

export type BeatSceneComponent = React.FC<{ startFrame?: number }>;

const BEAT_SCENE_REGISTRY: Record<string, BeatSceneComponent> = {
  "beat_1": Beat1Scene,
  "beat_2": Beat2Scene,
  "beat_3": Beat3Scene,
  "beat_4": Beat4Scene,
  "beat_5": Beat5Scene,
  "beat_6": Beat6Scene,
};

export default BEAT_SCENE_REGISTRY;

export function getBeatScene(beatId: string): BeatSceneComponent | undefined {
  return BEAT_SCENE_REGISTRY[beatId];
}

export function getAvailableBeatScenes(): string[] {
  return Object.keys(BEAT_SCENE_REGISTRY);
}
