/**
 * Lyric style bundle scene registry (template, portrait 1080x1920). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import TerminalOpenScene from "./terminal_open";
import RiseAndShineScene from "./rise_and_shine";
import LateNightsScene from "./late_nights";
import OneTryScene from "./one_try";
import FortyMinutesScene from "./forty_minutes";
import DailyCrumbScene from "./daily_crumb";
import OvertimeReceiptScene from "./overtime_receipt";
import FirstLoafScene from "./first_loaf";
import SoGoodScene from "./so_good";
import CreditsScene from "./credits";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  terminal_open: TerminalOpenScene,
  rise_and_shine: RiseAndShineScene,
  late_nights: LateNightsScene,
  one_try: OneTryScene,
  forty_minutes: FortyMinutesScene,
  daily_crumb: DailyCrumbScene,
  overtime_receipt: OvertimeReceiptScene,
  first_loaf: FirstLoafScene,
  so_good: SoGoodScene,
  credits: CreditsScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
