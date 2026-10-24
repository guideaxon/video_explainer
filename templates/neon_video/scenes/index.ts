/**
 * Neon style bundle scene registry (template, portrait 1080x1920). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import DriveInScene from "./drive_in";
import TitleScene from "./title";
import MeetTuboScene from "./meet_tubo";
import BigNumberScene from "./big_number";
import LevelsScene from "./levels";
import MixtapeScene from "./mixtape";
import SunsetScene from "./sunset";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  drive_in: DriveInScene,
  title: TitleScene,
  meet_tubo: MeetTuboScene,
  big_number: BigNumberScene,
  levels: LevelsScene,
  mixtape: MixtapeScene,
  sunset: SunsetScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
