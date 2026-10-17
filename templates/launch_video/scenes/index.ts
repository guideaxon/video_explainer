/**
 * Launch channel scene registry (template, portrait 1080x1920). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import HookScene from "./hook";
import EvolveScene from "./evolve";
import DailyMascotScene from "./daily_mascot";
import WeeklyChallengeScene from "./weekly_challenge";
import StreaksScene from "./streaks";
import ShopScene from "./shop";
import WidgetsScene from "./widgets";
import FinaleScene from "./finale";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  hook: HookScene,
  evolve: EvolveScene,
  daily_mascot: DailyMascotScene,
  weekly_challenge: WeeklyChallengeScene,
  streaks: StreaksScene,
  shop: ShopScene,
  widgets: WidgetsScene,
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
