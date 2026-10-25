# Popart Style Bundle: Video Style Guide

Style for the **Popart** style bundle: comic pop-art explainers and stories starring the original hero **Dot Dash**,
**portrait 1080x1920 (9:16, mobile-first)**, 25 to 40 s. Not the `comic` bundle (rotatable ComfyUI panels, a different
product). Other style bundles have their own guide, kit and skill; do not mix styles.

Implementation: kit `remotion/src/components/popart/kit.tsx` (hero `hero.tsx`, geometry `ink.ts`, tests `popart.test.ts`),
template scenes `templates/popart_video/scenes/`, scaffold `scripts/popart_new_video.py`, pacing
`scripts/popart_finalize_storyboard.py`, skill `.claude/skills/popart_make_video/` (requires `video_make_core`).

## 1. Format

- **1080 x 1920 at 30 fps**; project config must be portrait.
- The screen is a comic page: panels inside x 40..1040, y 120..1800, 24 px gutters. All text inside the safe zone
  y 160..1500, x 60..1020 (art such as legs may run lower).
- Sizes: headline 130 to 210 px (Bangers), balloon text 44 to 50 px, caption box 40 to 44 px, stat number 150 px. Nothing under 24 px.
- Headline width: Bangers is about 0.42 em per character, so 130 px holds about 17 characters per line.
- No burned-in captions; every panel must read muted.

## 2. Look

- Flat CMYK-like colours: cyan `#00a8e8`, magenta `#e5007d`, yellow `#ffe100`, red `#e8232a`, blue `#22409a`, ink `#121212`,
  paper `#fbf4e2`, white. Page tones: paper, yellow, cyan, magenta, ink.
- **Ben-Day dots**: CSS two-layer radial gradients (`dotsCss`) on panels, and 21 SVG `<pattern>` tiles defined once per page
  (`HalftoneDefs`, used as `fill={dots("magenta","s")}`). `Ramp` is a static dot ramp (dots grow toward one side).
- **Ink**: thick black outlines whose weight varies (panel frames wander 0.7x to 1.3x along each edge, `inkFrame`; hero
  strokes are doubled with a thinner offset pass).
- **Misregistration**: every colour plate is printed 3 px right and 2 px up of its ink plate (`MISREG`, constant, never jitters).
- Fonts: **Bangers** (headlines, numbers, sound effects), **Comic Neue 700** upper case (balloons, caption boxes).
- Elements: starburst (`Starburst`), sound effect (`Sfx`), yellow caption box (`Caption`), speech balloon / thought cloud /
  shout (`Balloon`), speed lines (`SpeedLines`), motion lines (`MotionLines`), cover masthead (`Masthead`), stat number in a
  starburst (`StatBurst`), halftone bar chart (`HalftoneBars`), props `Laptop`, `Envelope`.
- No gradients, blurs or soft shadows: only hard ink offsets.

## 3. Motion

- Panels wipe in over 7 frames (`wipe`); the scene cut is a 3-frame fade (a hard cut between pages). Camera pushes into a
  panel with `push` (scale 1 to about 1.12 to 1.15 over 45 to 80 frames).
- Starbursts and balloons pop with overshoot; the starburst shakes for 10 frames. Speed lines flicker every 3 frames
  (deterministic re-seed). Headline lines slam from 1.4x to 1x. Bars grow with a count-up; numbers count in about 30 frames.
- **Character rig** (`Hero`, shared contract `../rig`): `mouth`/`visemes` from `scenes/lipsync.ts` (one inked mouth per Rhubarb
  shape A to H and X), `blinkAt` with `seed`, gestures `wave`, `point`, `fist`, `think` via `gestureAt`, walk via
  `walk={{ from, to }}` plus `walkTo` (feet land at multiples of PI, body bob `|sin|`, arms swing opposite). Use literal numbers
  so `sound generate` cues them. `mood` (calm, shock, fierce) sets brows and eyes; `look` aims the eyes.

## 4. Story structure (7 scenes, about 30 s)

1. **Cover**: masthead, hero walks in and waves. 2. **The Setup**: establishing panel plus talking hero. 3. **The Problem**: push-in
close-up with thought cloud, then a strip. 4. **POW**: full-page panel, speed lines, fist, starburst (the turn).
5. **The Fix**: headline panel plus the hero walking and pointing. 6. **The Numbers**: halftone bars and a stat starburst.
7. **The End**: THE END / TO BE CONTINUED.

## 5. Copy and data rules

- 5 to 12 spoken words per scene, short punchy fragments. Template values (83 %, bars) are SAMPLE content with a `SAMPLE CONTENT`
  tag: replace with real, sourced data or keep plainly fictional. Never invent numbers presented as real.
- **Original art only**: Dot Dash, the lettering and layouts are original; do not imitate Marvel or DC characters or any
  specific Lichtenstein painting.

## 6. Pipeline notes

- Registry keys equal the slug of each scene title ("The Setup" gives `setup`, "POW" gives `pow`); components end in `Scene`;
  keys unquoted. `tests/test_popart_template.py` checks the template.
- Order: `review_video`, `radio_cut`, `voiceover`, `scripts/popart_finalize_storyboard.py` (bakes lip sync; set `RHUBARB_BIN`),
  `render`. The shorts scene generator hook is Vantage-only; Popart scenes are hand-adapted from the template.

## 7. Characters

Dot Dash: red bob with white shine streaks, yellow jacket with pointed lapels, cyan top, blue trousers, red boots. Head-and-shoulders
crop in 512x512: `<Hero x={256} y={1114} scale={1.1} blink={false} />` on a cyan background.

## 8. Render cost

No blur, turbulence or drop-shadow filters anywhere. Dots are CSS gradients or tiny tiled SVG patterns; ramps and speed-line paths are
memoised pure functions. Measured: the full 7-scene sample (942 frames at 1080x1920, including bundling and audio mux) rendered in
81 s, about 86 ms per frame all-in.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (popart style)

One Remotion scene per beat, **1080x1920 portrait**, built only from the popart kit:
`import { Page, Panel, Headline, Caption, Balloon, Starburst, Sfx, SpeedLines, MotionLines, Ramp, StatBurst, HalftoneBars, Masthead, Laptop, Envelope, Hero, SampleTag, C } from "@remotion-components/popart/kit";`
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export), wrap in `<Page tone="paper"|"yellow"|"cyan"|"magenta"|"ink">`,
lay out `<Panel x y w h bg dots wipe push>` inside x 40..1040, y 120..1800, and put `Hero`, `Balloon`, `Starburst`, captions inside
panels in panel-local px. Text inside y 160..1500. Flat CMYK colours, ink outlines, Ben-Day dots, upper-case lettering; original
hero only; no real brands or invented data. Everything animates in within about 30 frames.
<!-- LLM-BRIEF-END -->
