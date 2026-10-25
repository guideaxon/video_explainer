---
name: clay_make_video
description: Produce a vertical (1080x1920, mobile-first) claymation-look explainer for the Clay style bundle (matte plasticine shapes with a fingerprint texture, stop-motion "on twos" motion, the clay character Tuck with replacement mouths, felt table-top set, clay letters and clay stat cards) from the template scenes. Use when asked to make or restyle a Clay style bundle video, or a video starring a clay character.
metadata:
  tags: clay, claymation, stop-motion, plasticine, remotion, video
---

# Make a Clay video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/clay_video_style_guide.md` (read it first). Kit:
`remotion/src/components/clay/kit.tsx` (plus `geom.ts`, `letters.ts`, `textures.ts`). Template scenes:
`templates/clay_video/scenes/`. Scripts: `scripts/clay_new_video.py`, `scripts/clay_finalize_storyboard.py`.
Only for the Clay style bundle; other style bundles have their own skills.

## Style Bundle details for the core workflow

- `<style_bundle>` = `clay`.
- **Step 3, brief**: one cosy story with a small mishap: what Tuck explains, which number or chart backs it, and
  where each figure comes from. Real data needs a source and date; a fictional story needs no data but must not
  pose as real.
- **Step 4, scenes**: edit stat values, bar labels and values, the bubble line, sub lines. Keep the set pieces
  (lamp, mug, plant, pot) only where the story uses them. Keep the hook (Tuck walks in), one stat or chart, the
  mishap and the sign-off. Remove `SampleTag` only where data is real and sourced (or the story is plainly fiction).
  Pass `mouth={LIPSYNC.<key>} visemes={VISEMES.<key>}` to every `Tuck`; use literal numbers in `gestureAt={n}` and
  `walk={{ from: a, to: b }}` so `sound generate` adds pops and footsteps.
- **Step 4, narration**: 6 to 12 words per scene. Registry example: "The Coin Pot" gives `coin_pot`; "Hello Tuck" gives `hello_tuck`.
- **Step 5, review extras**: every number on screen matches the narration and its source; headline lines fit
  (they shrink to 920 px, so very long lines get small: keep each line under about 14 characters); text is inside y 160..1500.
- **Step 7, pacing**: the finalize script sets 0.3 s buffers and 6-frame fades and bakes `lipsync.ts`. Rhubarb
  (`RHUBARB_BIN`) gives the real mouth shapes; without it Tuck uses openness only (still talks, fewer distinct mouths).
- **Step 8**: the log should say `Resolution: 1080p (1080x1920)`. Expect about 0.5 s per frame (see the guide).
- **Step 9, frames**: contact sheet `fps=1/1.6,scale=216:-1,tile=10x2`, then mid-scene and end-of-scene frames at
  full size. Check: texture visible but not noisy, outlines boil between held poses (compare frames 1 apart: 2 or 3
  frames are identical), Tuck's mouth matches the voice, count-ups and the topple have finished, SAMPLE tags gone.

## Pitfalls

- Never use `Math.random`; the boil is a seeded hash of the pose index.
- Do not add `filter` blurs or `feTurbulence`: the texture is baked once (`textures.ts`); soft shadows are gradients.
- Animate with the held clock (`useClayClock().hf`), not the raw frame, or the stop-motion feel is lost.
- Fredoka loads from Google Fonts: the first render needs internet.
- Never import another bundle's kit or its character.
