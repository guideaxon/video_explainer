/**
 * Clay style bundle scene registry (template, portrait 1080x1920). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import HelloTuckScene from "./hello_tuck";
import BigNumberScene from "./big_number";
import CoinPotScene from "./coin_pot";
import FourStacksScene from "./four_stacks";
import PlanScene from "./plan";
import OopsScene from "./oops";
import TuckOutScene from "./tuck_out";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  hello_tuck: HelloTuckScene,
  big_number: BigNumberScene,
  coin_pot: CoinPotScene,
  four_stacks: FourStacksScene,
  plan: PlanScene,
  oops: OopsScene,
  tuck_out: TuckOutScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
