/**
 * Markets style bundle scene registry (template). Keys must equal the slug of each scene title (see src/cli/main.py _title_to_scene_key)
 * and are listed unquoted, with component names ending in "Scene", because the storyboard CLI and
 * render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import TitleScene from "./title";
import LongRoadUpScene from "./long_road_up";
import HowARallyIsBuiltScene from "./how_a_rally_is_built";
import TodaysMoveScene from "./todays_move";
import WhoLedTheChargeScene from "./who_led_the_charge";
import WhereTheMoneySitsScene from "./where_the_money_sits";
import FearOMeterScene from "./fear_o_meter";
import MarketHeatmapScene from "./market_heatmap";
import MoneyNeverSleepsScene from "./money_never_sleeps";
import DropAndClimbBackScene from "./drop_and_climb_back";
import OutroScene from "./outro";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  bull_run: TitleScene,
  long_road_up: LongRoadUpScene,
  how_a_rally_is_built: HowARallyIsBuiltScene,
  todays_move: TodaysMoveScene,
  who_led_the_charge: WhoLedTheChargeScene,
  where_the_money_sits: WhereTheMoneySitsScene,
  fear_meter: FearOMeterScene,
  market_heatmap: MarketHeatmapScene,
  money_never_sleeps: MoneyNeverSleepsScene,
  drop_and_climb_back: DropAndClimbBackScene,
  stay_bullish: OutroScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
