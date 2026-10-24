/**
 * Rubberhose style bundle scene registry (template, portrait 1080x1920). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import OpeningTitleScene from "./opening_title";
import MeetKipScene from "./meet_kip";
import ProblemScene from "./problem";
import GagScene from "./gag";
import IdeaScene from "./idea";
import FixScene from "./fix";
import ThatsAllScene from "./thats_all";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  opening_title: OpeningTitleScene,
  meet_kip: MeetKipScene,
  problem: ProblemScene,
  gag: GagScene,
  idea: IdeaScene,
  fix: FixScene,
  thats_all: ThatsAllScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
