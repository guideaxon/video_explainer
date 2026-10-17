---
name: leaderbot_make_video
description: Produce a vertical (1080x1920, mobile-first) pixel-mosaic business explainer or satire video for the Leader Bot channel (3x3 glitching pixel bot grid, hard-shadow stat cards, pixel bar charts, stamps) from the template scenes. Use when asked to make or restyle a Leader Bot channel video.
metadata:
  tags: leaderbot, pixel, business, satire, remotion, video
---

# Make a Leader Bot video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the channel details below.
Do not continue from this file alone.

Style source of truth: `docs/leaderbot_video_style_guide.md` (read it first). Kit:
`remotion/src/components/leaderbot/kit.tsx`. Template scenes: `templates/leaderbot_video/scenes/`.
Scripts: `scripts/leaderbot_new_video.py`, `scripts/leaderbot_finalize_storyboard.py`.
Only for the Leader Bot channel; other channels have their own skills.

## Channel details for the core workflow

- `<channel>` = `leaderbot`.
- **Step 3, brief**: the one business story or joke (what the bot says, which number or chart backs it) and
  where each figure comes from. Real data needs a source and date; a clearly fictional satire needs no
  data but must not pose as real. Do not name real companies or people as targets without a basis.
- **Step 4, scenes**: edit stat values, bar labels and values, the speech line, vote stamps, ticker text;
  remove `SampleTag` only where the data is real and sourced (or the piece is plainly fictional). Keep the
  hook mosaic, one stat or chart, and the sign-off with the disclaimer line.
- **Step 4, narration**: 6 to 12 words per scene. Registry example: "Meet the Bot" gives `meet_the_bot`.
- **Step 5, review extras**: every number on screen matches the narration and the source; the sign-off says
  "Not business advice"; no real brand or person is mocked without a basis.
- **Step 7, pacing**: the finalize script sets 0.2 s buffers and 4-frame fades.
- **Step 8**: the log should say `Resolution: 1080p (1080x1920)`.
- **Step 9, frames**: `fps=1/1.6,scale=216:-1,tile=10x2`, then mid-scene frames larger. Sample the mosaic
  both during a glitch burst and after it settles. Check text is inside the safe zone (y 160 to 1500), the
  headline is complete, count-ups and bars have finished by scene end, stamps are not cut off, SAMPLE tag gone.

## Pitfalls

- Glitch must stay deterministic: never use `Math.random` in a scene.
- Fonts (Silkscreen, Inter) load from Google Fonts: the first render needs internet.
