/**
 * Leader Bot channel scene registry (template, portrait 1080x1920). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end in
 * "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import MeetTheBotScene from "./meet_the_bot";
import BigNumberScene from "./big_number";
import PitchScene from "./pitch";
import QuarterlyBarsScene from "./quarterly_bars";
import BoardVoteScene from "./board_vote";
import PivotScene from "./pivot";
import BotOutScene from "./bot_out";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  meet_the_bot: MeetTheBotScene,
  big_number: BigNumberScene,
  pitch: PitchScene,
  quarterly_bars: QuarterlyBarsScene,
  board_vote: BoardVoteScene,
  pivot: PivotScene,
  bot_out: BotOutScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
