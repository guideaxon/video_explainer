/**
 * Storybook style bundle scene registry (template, landscape 1280x720). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import IdeaScene from "./idea";
import WorkshopScene from "./workshop";
import ScriptScene from "./script";
import StoryboardScene from "./storyboard";
import VoiceScene from "./voice";
import ReviewScene from "./review";
import RenderScene from "./render";
import FinaleScene from "./finale";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  idea: IdeaScene,
  workshop: WorkshopScene,
  script: ScriptScene,
  storyboard: StoryboardScene,
  voice: VoiceScene,
  review: ReviewScene,
  render: RenderScene,
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
