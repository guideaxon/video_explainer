# Promo Style Bundle: Video Style Guide

Style for the **Promo** style bundle: dark, glossy SaaS product-launch videos, **portrait 1080x1920
(9:16, mobile-first)** for TikTok, Reels and Shorts. Other style bundles (Vantage, Markets) have their own
guide, kit and skill; do not mix styles.

Derived from the reference clip `projects/samples/3/CMAF_96 (1).mp4`, a 66 s launch video for a live
events product, which is only 170x96 px. The look, motion language and structure are read from it
directly; fonts and exact hex values are approximations. **Only the style is reused**: no logo, name,
copy, numbers or screens from the reference. Template scenes use a placeholder brand ("Lumen Stage",
`lumenstage.example`) and obviously sample data.

Implementation: kit `remotion/src/components/promo/kit.tsx`, template scenes
`templates/promo_video/scenes/`, scaffold `scripts/promo_new_video.py`, pacing
`scripts/promo_finalize_storyboard.py`, workflow skill `.claude/skills/promo_make_video/`.

## 1. Format: mobile first

- **1080 x 1920 at 30 fps.** The project config must be portrait (`video.resolution` 1080x1920): the
  `render` command then uses the 9:16 presets (4k = 2160x3840, 1440p, 1080p, 720p, 480p).
- Headline in the top third (y 200 to 560), the visual below (y 640 to 1450). Single-element scenes
  (hook, big number, logo, tagline, CTA) sit around the vertical middle (y 700 to 1100).
- **Safe zone:** keep content inside y 160 to 1500 and x 60 to 1020. Platform UI (captions, buttons,
  profile name) covers the bottom ~400 px and the right edge.
- Text sizes for a phone: headlines 104 to 124 px (80 px for supporting lines), UI mock text 22 px
  and up, labels never below 20 px.
- Burned-in captions are not part of this pipeline. Most viewers watch muted: keep every scene's
  headline a complete thought so the video reads without audio.

## 2. Look

Dark product-demo glow: deep indigo gradient, soft coloured glows, a faint perspective grid floor
and drifting particles; glassy panels floating in 3D.

| Token | Value |
|---|---|
| Background | `#05071a` to `#0b1140` vertical gradient, indigo glow top-left, teal glow bottom-right |
| Text | white; dim `rgba(255,255,255,0.62)` |
| Accent gradient | teal `#2fe3c9` to blue `#3d7bff` (one or two words per headline) |
| Money / win | gold gradient `#ffd96a` to `#ffc83d` (donations, totals, goals) |
| Action | indigo `#4d5bff` buttons with glow; alert red `#ff4d6d` (LIVE, struck-out words) |

- Fonts (approximated): **Plus Jakarta Sans 800** headlines and stats, **Inter** for UI mock text,
  **Michroma** for the wide wordmark. Loaded with `@remotion/google-fonts` (needs internet on first render).
- UI mockups are **abstract**: skeleton lines, gradient video tiles, simple cards. Never reproduce a
  real product's screens. The kit's `Browser`, `PhoneMock`, `Tile`, `ChatList`, `PollBars`,
  `AreaChart` and `PromptBox` give the feel without detail.
- A glowing blue input box with typed text (`PromptBox`) is the "AI / setup" device. A gold keypad
  and a gold meter are the "money" devices.

## 3. Motion

- **Kinetic headlines**: words slide up and de-blur one at a time (4 frames apart). Accent words use
  the gradient (`*word`) or gold (`^word`).
- **Typed text with a caret** for the hook; a weak word gets a red strike-through ("boring").
- **Glass panels fly in with 3D perspective** and keep a slow float; stacked windows pile up for pain.
- Data builds itself: counters tick up, meters fill to a "GOAL REACHED" badge, poll bars fill, the
  area chart draws left to right, network dots flow along links.
- CTA: a cursor glides to the button, the button presses, a ripple expands.
- Transitions are **10-frame plain fades**, set by `scripts/promo_finalize_storyboard.py`. The
  pipeline's default 1.5 s cinematic blur transitions are wrong for this style.
- Pace: scenes are 1.5 to 4 s each; the whole video 45 to 60 s with 14 to 18 scenes.

## 4. Story structure

1. **Hook**: a relatable frustration, typed out.
2. **Pain**: the mess of the old way (pile of windows). One sentence.
3. **Reveal**: logo and one-line promise (rings pulse, hexagon mark, stacked wordmark).
4. **Features**, each as headline plus mockup, 1.5 to 3 s: studio, branded pages, AI/prompt setup,
   then the audience verbs as a rhythm: "They chat. They donate. They vote."
5. **Money / proof**: live meter, then analytics.
6. **Social proof**: big number, then stat cards.
7. **Tagline**: two short sentences ("Better X. Stronger Y.").
8. **CTA**, then **sign-off** with logo and address.

Drop features that do not apply; keep hook, reveal, at least three features, one proof scene, CTA and sign-off.

## 5. Copy and data rules

- 4 to 10 spoken words per scene, short fragments, second person or "they" verbs. No jargon.
- **Never invent proof.** All numbers, customers and results in the template are SAMPLE data (a
  "SAMPLE DATA" tag shows on those scenes; remove the tag when real, sourced figures are used). Do
  not use any competitor's or the reference video's brand, copy or numbers.
- Buttons are not clickable on social platforms. End with "link in bio" (or run it as an ad with a
  real CTA button) and keep the URL as plain text.

## 6. Pipeline notes (full video, portrait)

- Registry keys in `projects/<p>/scenes/index.ts` must equal the slug of each scene title
  (`_title_to_scene_key` in `src/cli/main.py`: leading "The/A/An" dropped). Component names end in
  `Scene`, keys unquoted (regex-parsed). `tests/test_promo_template.py` checks the template.
- Storyboard order: `voiceover`, then `scripts/promo_finalize_storyboard.py` (replaces the
  `storyboard` step), then `render`.
- Without the finalize step a 44 s narration becomes about 63 s with dead air (TTS tail silence +
  the player's 1.0 s buffer per scene). With it: about 50 s of timeline.
- Output loudness is about -20 LUFS. Normalise for social:
  `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final_social.mp4`.
- The shorts scene generator hook (`src/short/style_bundles.py`) is Vantage-only; Promo scenes are
  hand-adapted from the template.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (promo style)

One Remotion scene per beat, **1080x1920 portrait**, built only from the promo kit:
`import { PScene, Headline, Typed, Glass, Browser, PhoneMock, Tile, Skeleton, ChatList, PromptBox, PollBars, Meter, AreaChart, Stat, StatCards, Hub, Button, Logo, SampleTag, C, GRAD, GOLD } from "@remotion-components/promo/kit";`
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export) and wrap content in `<PScene>`.
Layout: `Headline` at the top (y about 200 to 540, `*word` gradient, `^word` gold, at most 3 lines),
the visual below it (y 640 to 1450); single-element scenes sit around y 700 to 1100. Stay inside
x 60 to 1020 and y 160 to 1500. Abstract UI only (skeleton lines, tiles); never copy a real product.
All numbers are SAMPLE data and add `<SampleTag />`. Everything animates in within about 30 frames.
<!-- LLM-BRIEF-END -->
