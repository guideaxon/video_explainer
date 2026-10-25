# Leader Bot Style Bundle: Video Style Guide

Style for the **Leader Bot** style bundle: short, punchy business explainers and satire starring a pixel "Leader bot",
**portrait 1080x1920 (9:16, mobile-first)** for TikTok, Reels and Shorts, 25 to 35 s. Other style bundles
(Vantage, Markets, Promo, Launch, Lyric) have their own guide, kit and skill; do not mix styles.

Derived from the reference clip `projects/samples/3/171138_1_08db-ceo-bot_wg_720p.mp4` (720x720, 2 s loop with
audio): a 3x3 mosaic of flat pixel-art businessperson avatars on loud primary-colour tiles, visible grid lines,
every tile glitching between palettes while one tile stays a clean smooth vector face. The look is read from
it directly (it is square; this style bundle re-lays it out for phones). **Only the style is reused**: the bot,
palettes and copy here are original placeholders.

Implementation: kit `remotion/src/components/leaderbot/kit.tsx`, template scenes `templates/leaderbot_video/scenes/`,
scaffold `scripts/leaderbot_new_video.py`, pacing `scripts/leaderbot_finalize_storyboard.py`, workflow skill
`.claude/skills/leaderbot_make_video/` (which requires the shared `video_make_core` skill).

## 1. Format: mobile first

- **1080 x 1920 at 30 fps.** The project config must be portrait (`video.resolution` 1080x1920).
- Eyebrow + headline in the top third (y 200 to 560), the visual below (y 560 to 1500). The 3x3 mosaic uses
  310 px tiles (930 px square) at y 560.
- **Safe zone:** content inside y 160 to 1500 and x 60 to 1020.
- Sizes: headline 96 to 112 px (Silkscreen caps), eyebrow 28 px, sub line 38 px, stat number 140 px,
  stamp text 56 to 64 px. Nothing under 22 px.
- **Headline width**: Silkscreen is about 0.8 em per character, so at 112 px a line holds at most 10 characters
  (12 at 96 px). Longer lines wrap into the visual; shorten the line or lower the size.
- No burned-in captions. Each headline must be a complete thought (it must read muted).

## 2. Look

Loud, flat and blocky. Hard edges only: no gradients, blurs or soft shadows.

| Surface | Value |
|---|---|
| Ink | `#111111`, faint 60 px pixel grid. Hook, pivot and board scenes |
| Paper | `#f4f1e8`, same grid. Data scenes (number, bars) |
| Yellow | `#ffd800`, same grid. Pitch and sign-off |

- Palette: yellow `#ffd800`, red `#ff2e2e`, blue `#1a4dff`, green `#14b85a`, purple `#7a3cff`, pink
  `#ff5fa8`, cyan `#8be9ff`, plus ink, white and grey. Accent colour per tone: yellow on ink, red on paper,
  blue on yellow.
- Fonts: **Silkscreen** (700) for headlines, labels and stamps; **Inter** for sub lines and speech.
- Type system on every scene: **eyebrow** (`> LABEL`, letter-spaced, accent colour) then a **two-line headline**
  (first line ink, second line accent) then an optional sub line.
- **The bot** is a 12x12 sprite (hair, face, eyes and mouth, suit, shirt, tie) with a 1-cell dark grid line.
  Nine looks recolour it. The centre tile of the mosaic is the **clean vector bot** (no grid lines).
- **Cards** (stat, speech, ticker) have a 6 px ink border and a hard 12 to 16 px offset shadow.
- Pixel charts are stacks of square blocks with a 3 px ink outline; never smooth lines.

## 3. Motion

- Tiles pop in with a spring, staggered 2 frames apart. Headline lines step in (10 px steps, no easing).
- **Glitch bursts**: `burst` scrambles about half the cells for 12 frames every 2 s, then settles; the pivot
  scene scrambles constantly. Glitch is deterministic (hash of cell and frame), never `Math.random`.
- Numbers count up in about 30 frames; bars grow one block at a time; stamps slam from 2x to 1x with a rotation.
- Ticker scrolls at 6 px per frame.
- **Character rig** (design: [CHARACTER_RIG.md](CHARACTER_RIG.md); `PixelBot`, centre of `BotGrid`): talks from `scenes/lipsync.ts`, which `scripts/leaderbot_finalize_storyboard.py` bakes from the voiceover
  (shared `scripts/_lipsync.py`; mouth shapes need Rhubarb, see CLAUDE.md). Import `{ LIPSYNC, VISEMES } from "./lipsync"` and pass
  `mouth={LIPSYNC.<scene>} visemes={VISEMES.<scene>}`. Blinks follow the shared rig rhythm (`seed` varies it). The two sprite mouth rows swap per shape; the smooth
  vector bot opens an ink oval. A single `PixelBot` blinks only with `blink`, so a grid of nine stays still.
  `gestureAt={n}` and `walk={{ from, to }}` written as plain numbers also get a sound cue from `python -m src.cli sound <project> generate`.
- Transitions are **4-frame plain fades** (`scripts/leaderbot_finalize_storyboard.py`); scenes are 3 to 5 s.
  The pipeline's default 1.5 s cinematic blur is wrong for this style.

## 4. Story structure (25 to 35 s, 7 scenes)

1. **Meet the Bot** (ink): 3x3 mosaic with glitch bursts.
2. **The Big Number** (paper): one stat card counting up, clean bot.
3. **The Pitch** (yellow): speech bubble with a typed line, clean bot.
4. **Quarterly Bars** (paper): pixel bar chart.
5. **Board Vote** (ink): three bots, stamps YES / NO.
6. **The Pivot** (ink): fully glitching mosaic, the turn of the story.
7. **Bot Out** (yellow): big clean bot, ticker, disclaimer.

Drop or repeat the data scenes to fit the story; keep the hook, one stat or chart, and the sign-off.

## 5. Copy and data rules

- 6 to 12 spoken words per scene, short fragments, dry corporate-speak played straight.
- **Never invent numbers or claims.** Template values (12.4%, bar heights, the vote, the quote) are SAMPLE
  content (`SAMPLE CONTENT` tag). Replace each with a real, sourced figure and change the source line, or
  keep it clearly fictional and satirical. Never present made-up data as real, and do not use a real company,
  person or brand as the butt of a joke without a basis.
- The bot is a fictional character, not a real executive. Keep an "not business advice" line on the sign-off.

## 6. Pipeline notes (full video, portrait)

- Registry keys in `projects/<p>/scenes/index.ts` must equal the slug of each scene title
  (`_title_to_scene_key` in `src/cli/main.py`; leading The/A/An dropped); component names end in `Scene`;
  keys unquoted. `tests/test_leaderbot_template.py` checks the template.
- Storyboard order: `review_video`, `voiceover`, then `scripts/leaderbot_finalize_storyboard.py` (replaces the
  `storyboard` step), then `render`.
- Output loudness is about -20 LUFS; normalise for social with
  `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final_social.mp4`.
- The shorts scene generator hook (`src/short/style_bundles.py`) is Vantage-only; Leader Bot scenes are
  hand-adapted from the template.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (leaderbot style)

One Remotion scene per beat, **1080x1920 portrait**, built only from the leaderbot kit:
`import { CScene, Eyebrow, Headline, Sub, PixelBot, BotGrid, burst, StatCard, PixelBars, Speech, Stamp, Ticker, SampleTag, C } from "@remotion-components/leaderbot/kit";`
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export) and wrap content in
`<CScene tone="ink"|"paper"|"yellow">`. Type system: `Eyebrow`, then `Headline lines={["Line one.", "*Line two."]}`
(second line accent), then optional `Sub`. Headline top third (y 200 to 560), visual below (y 560 to 1500), content
inside x 60 to 1020 and y 160 to 1500. Flat colours and hard shadows only; original bot art; no real brands
or invented data. Everything animates in within about 30 frames.
<!-- LLM-BRIEF-END -->
