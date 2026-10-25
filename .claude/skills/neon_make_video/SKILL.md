---
name: neon_make_video
description: Produce a vertical (1080x1920, mobile-first) neon synthwave video for the Neon style bundle (perspective grid floor, striped sun, wireframe mountains, glowing tube shapes, chrome and neon type, the neon-tube robot Tubo) from the template scenes. Use when asked to make or restyle a Neon style bundle video.
metadata:
  tags: neon, synthwave, retro, remotion, video
---

# Make a Neon video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/neon_video_style_guide.md`. Kit: `remotion/src/components/neon/kit.tsx`.
Template scenes: `templates/neon_video/scenes/`. Scripts: `scripts/neon_new_video.py`, `scripts/neon_finalize_storyboard.py`.
Only for the Neon style bundle; other bundles have their own skills.

## Style Bundle details for the core workflow

- `<style_bundle>` = `neon`.
- **Step 3, brief**: the story in one line, the one number or chart (with source and date) or a plainly fictional story.
- **Step 4, scenes**: edit the counter value and label, bar labels and values, the sign and cassette text, headlines.
  Keep the hook (Drive In), title, one data scene and the Sunset outro. Use literal `gestureAt={n}` and `walk={{ from, to }}`.
  Remove `SampleTag` only when data is real and sourced (or plainly fictional).
- **Step 4, narration**: 5 to 12 words per scene. Registry example: "Meet Tubo" gives `meet_tubo`.
- **Step 5, review**: `review_video.py` knows the neon bundle only once it is registered; every number on screen matches narration and source.
- **Step 7, pacing**: the finalize script sets 0.3 s buffers and 10-frame fades and bakes lip sync (set `RHUBARB_BIN` for mouth shapes).
- **Step 8**: the log should say `Resolution: 1080p (1080x1920)`.
- **Step 9, frames**: `fps=1/1.6,scale=216:-1,tile=10x2`, then mid-scene frames at full size. Check the headline is complete and inside
  the safe zone, counter and bars finished, text not hidden by the sun, no flicker caught at the sampled frame, Tubo's mouth moving.

## Pitfalls

- Never add `feGaussianBlur` or `filter: blur` on large layers: render time multiplies. Use `Neon` (stacked strokes).
- No `Math.random`: use `hash3` from `core.ts` (flicker and stars must repeat).
- Registry keys must equal the title slug; component names end in `Scene`.
- Headline lines over about 9 characters shrink automatically at 112 px; keep lines short.
- Fonts load from Google Fonts: first render needs internet.
