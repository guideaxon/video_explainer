/**
 * Glossy style bundle scene registry (template, portrait 1080x1920). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import UnboxingScene from "./unboxing";
import TooMuchStuffScene from "./too_much_stuff";
import OneButtonScene from "./one_button";
import ThreeEasyStepsScene from "./three_easy_steps";
import BigNumberScene from "./big_number";
import TurntableScene from "./turntable";
import GetYoursScene from "./get_yours";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  unboxing: UnboxingScene,
  too_much_stuff: TooMuchStuffScene,
  one_button: OneButtonScene,
  three_easy_steps: ThreeEasyStepsScene,
  big_number: BigNumberScene,
  turntable: TurntableScene,
  get_yours: GetYoursScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
