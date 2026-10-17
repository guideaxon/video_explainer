/**
 * Promo channel scene registry (template, portrait 1080x1920). Keys must equal the slug of each scene
 * title (see src/cli/main.py _title_to_scene_key); they are listed unquoted and component names end
 * in "Scene" because the storyboard CLI and render-utils.mjs parse this registry with regexes.
 */

import React from "react";

import HookScene from "./hook";
import TabOverloadScene from "./tab_overload";
import LogoRevealScene from "./logo_reveal";
import StudioScene from "./studio";
import BrandedPagesScene from "./branded_pages";
import PromptSetupScene from "./prompt_setup";
import TheyChatScene from "./they_chat";
import TheyDonateScene from "./they_donate";
import LiveMeterScene from "./live_meter";
import PollsScene from "./polls";
import MultistreamScene from "./multistream";
import AnalyticsScene from "./analytics";
import RaisedTotalScene from "./raised_total";
import ProofCardsScene from "./proof_cards";
import TaglineScene from "./tagline";
import CallToActionScene from "./call_to_action";
import SignOffScene from "./sign_off";

export type SceneComponent = React.FC<{ startFrame?: number }>;

const SCENE_REGISTRY: Record<string, SceneComponent> = {
  hook: HookScene,
  tab_overload: TabOverloadScene,
  logo_reveal: LogoRevealScene,
  studio: StudioScene,
  branded_pages: BrandedPagesScene,
  prompt_setup: PromptSetupScene,
  they_chat: TheyChatScene,
  they_donate: TheyDonateScene,
  live_meter: LiveMeterScene,
  polls: PollsScene,
  multistream: MultistreamScene,
  analytics: AnalyticsScene,
  raised_total: RaisedTotalScene,
  proof_cards: ProofCardsScene,
  tagline: TaglineScene,
  call_to_action: CallToActionScene,
  sign_off: SignOffScene,
};

// Standard export name for the build system (required by remotion/src/scenes/index.ts)
export const PROJECT_SCENES = SCENE_REGISTRY;

export function getScene(type: string): SceneComponent | undefined {
  return SCENE_REGISTRY[type];
}

export function getAvailableSceneTypes(): string[] {
  return Object.keys(SCENE_REGISTRY);
}
