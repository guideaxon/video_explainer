# Launch Channel: Video Style Guide

Style for the **Launch** channel: playful consumer-app launch teasers, **portrait 1080x1920 (9:16,
mobile-first)** for TikTok, Reels and Shorts, 25 to 35 s. Other channels (Vantage, Markets, Promo)
have their own guide, kit and skill; do not mix styles.

Derived from the reference clip `projects/samples/4/m2-res_1080p.mp4` (1920x1080, 24 s, no audio), a
launch teaser for a fitness app with an evolving mascot. The look, motion language and structure are
read from it directly (it is 16:9; this channel re-lays it out for phones). **Only the style is
reused**: no brand name, mascot, copy or app screens from the reference. The template uses a
placeholder app ("Gymbud"), an original placeholder mascot ("Bud") and abstract UI.

Implementation: kit `remotion/src/components/launch/kit.tsx`, template scenes
`templates/launch_video/scenes/`, scaffold `scripts/launch_new_video.py`, pacing
`scripts/launch_finalize_storyboard.py`, workflow skill `.claude/skills/launch_make_video/`.

## 1. Format: mobile first

- **1080 x 1920 at 30 fps.** The project config must be portrait (`video.resolution` 1080x1920); the
  `render` command then uses the 9:16 presets (4k = 2160x3840, 1440p, 1080p, 720p, 480p).
- Eyebrow + headline + sub line in the top third (y 200 to 640), the visual below (y 700 to 1480).
  Hero scenes (mascot, finale) centre the mascot around y 650 to 1200.
- **Safe zone:** content inside y 160 to 1500 and x 60 to 1020 (platform UI covers the rest).
- Phone-readable sizes: headlines 112 to 150 px, eyebrow 24 px, sub line 38 px, chip title 34 px,
  big counter 230 px. Nothing under 22 px.
- No burned-in captions in this pipeline. Each headline should be a complete thought (it must read muted).

## 2. Look

Friendly and bright, with one dark scene for contrast.

| Surface | Value |
|---|---|
| Mint | `#d7f4e4`, slowly rotating sunburst rays, lavender blob top-left, peach blob bottom-right, a floating yellow dot. Used for hero and progress scenes |
| Cloud | `#f2f4fb` with the same pastel blobs. Used for feature scenes with a phone |
| Night | `#0b1220` with a green glow (top-left) and a purple glow (bottom-right). Used for the hook and the widgets scene |

- Brand green: `#1b9c68` on light, `#2fe5a4` on night. Ink `#0f1f1a`. Accents: gold `#ffc94a`, coral
  `#ff7a59`, lavender, peach.
- Font: **Plus Jakarta Sans 800**, tight tracking (-4 px at headline size). **Inter** for sub lines and
  UI text. (Approximated from the reference.)
- Type system on every scene: **eyebrow** (tiny, letter-spaced, brand green, uppercase) then a
  **two-line headline** (first line ink, second line brand green) then an optional **grey sub line**.
- **Mascot** is the hero: flat vector, rounded body, big eyes with highlights, blush cheeks, a leaf,
  soft shadow, sparkles. It grows and gains features per stage (arms, flower, abs, crown). Always
  use an original design; never copy another brand's character.
- **Phone mockups** are abstract (header card, skeleton rows); never reproduce a real app's screens.
  Floating **callout chips** (icon dot, bold title, small sub) overlap the phone edges and bob.
- **Widgets and a live-activity pill** show "always on" presence; the store pill ends the video.

## 3. Motion

- Headlines rise word-line by line from a mask (14 frames each, 8 frames apart).
- Counters tick up with an ease-in; the mascot scales and morphs as its stage changes.
- Phones pop in from below; chips pop with a spring and then bob; widgets and the pill spring in.
- Ambient: sunburst rotates slowly, rings pulse behind the hook mascot, sparkles twinkle, the mascot
  bobs and blinks.
- Transitions are **8-frame plain fades** (`scripts/launch_finalize_storyboard.py`); scenes are 3 to 5 s.
  The pipeline's default 1.5 s cinematic blur transitions are wrong for this style.

## 4. Story structure (25 to 35 s, 8 scenes)

1. **Hook** (night): two-line promise ("You train. It grows."), young mascot, rings.
2. **Evolve** (mint): counter ticks while the mascot grows through every stage.
3. to 6. **Features** (cloud), one per scene: phone with two chips each (daily companion, weekly
   challenge, streaks, shop/customise). Headline names the benefit, sub line adds detail.
7. **Always on** (night): widgets and live activity.
8. **Finale** (mint): crowned mascot, wordmark, tagline, store pill, "On iPhone."

Drop or add feature scenes (keep 3 to 5); keep hook, evolve/hero, finale.

## 5. Copy and data rules

- 5 to 12 spoken words per scene, short fragments. Brand and mascot names are placeholders; replace them.
- **Never invent claims.** Template numbers (12 days, 21 best streak, +40 coins, 438 workouts) are
  SAMPLE content; use only features and numbers the real app has. Do not use another brand's name,
  mascot, copy or screens.
- The store pill is not clickable. If the app is not live say "Coming soon", and say "link in bio".

## 6. Pipeline notes (full video, portrait)

- Registry keys in `projects/<p>/scenes/index.ts` must equal the slug of each scene title
  (`_title_to_scene_key` in `src/cli/main.py`; leading The/A/An dropped); component names end in
  `Scene`; keys unquoted. `tests/test_launch_template.py` checks the template.
- Storyboard order: `voiceover`, then `scripts/launch_finalize_storyboard.py` (replaces the
  `storyboard` step), then `render`.
- Output loudness is about -20 LUFS; normalise for social with
  `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final_social.mp4`.
- The shorts scene generator hook (`src/short/channel_styles.py`) is Vantage-only; Launch scenes are
  hand-adapted from the template.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (launch style)

One Remotion scene per beat, **1080x1920 portrait**, built only from the launch kit:
`import { LScene, Eyebrow, Headline, Sub, Mascot, Counter, PhoneFrame, ScreenMock, Chip, Feature, WidgetCard, LivePill, Wordmark, StorePill, Rings, Art, C } from "@remotion-components/launch/kit";`
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export) and wrap content in
`<LScene tone="mint"|"cloud"|"night">`. Type system: `Eyebrow`, then `Headline lines={["Line one.", "*Line two."]}`
(second line green), then `Sub`. Headline top third (y 200 to 640), visual below (y 700 to 1480), content
inside x 60 to 1020 and y 160 to 1500. Use the placeholder brand and original mascot only; UI mockups
are abstract; no real product screens, names or claims. Everything animates in within about 30 frames.
<!-- LLM-BRIEF-END -->
