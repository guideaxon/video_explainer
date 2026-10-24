/**
 * Lowpoly style bundle scene registry (template, landscape 1280x720). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import HelloScene from "./hello";
import ProblemScene from "./problem";
import IdeaScene from "./idea";
import StepsScene from "./steps";
import TwistScene from "./twist";
import FinaleScene from "./finale";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  hello: HelloScene,
  problem: ProblemScene,
  idea: IdeaScene,
  steps: StepsScene,
  twist: TwistScene,
  finale: FinaleScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
