---
name: popart_make_video
description: Produce a vertical (1080x1920, mobile-first) comic pop-art video for the Popart style bundle (comic page with inked panels, Ben-Day halftone dots, starburst POW captions, speech balloons, caption boxes, speed lines, and the original hero Dot Dash who talks, blinks, gestures and walks) from the template scenes. Use when asked to make or restyle a Popart style bundle video. Not the Comic bundle (rotatable ComfyUI panels).
metadata:
  tags: popart, comic, halftone, ben-day, remotion, video
---

# Make a Popart video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/popart_video_style_guide.md` (read it first). Kit:
`remotion/src/components/popart/kit.tsx` (hero in `hero.tsx`, geometry in `ink.ts`). Template scenes:
`templates/popart_video/scenes/`. Scripts: `scripts/popart_new_video.py`, `scripts/popart_finalize_storyboard.py`.
Only for the Popart style bundle; other style bundles (including `comic`, the rotatable-panel product) have their own skills.

## Style Bundle details for the core workflow

- `<style_bundle>` = `popart`.
- **Step 3, brief**: the story as a comic: who (Dot Dash, or a renamed original hero), the problem, the "POW" turn,
  the fix, and one real number with its source and date. Fictional stories need no data but must not pose as real.
  No Marvel, DC or Lichtenstein lookalikes: the hero, lettering and compositions stay original.
- **Step 4, scenes**: edit caption-box text, balloon lines, bar labels and values, the starburst word and the
  stat; keep one panel layout idea per scene (full-page, two stacked panels, close-up plus strip). The default
  seven: Cover, The Setup, The Problem, POW, The Fix, The Numbers, The End. Drop or repeat to fit.
  Pass `LIPSYNC.<scene>` and `VISEMES.<scene>` (`./lipsync`) to every `Hero` that speaks. Write `gestureAt={n}` and
  `walk={{ from: a, to: b }}` as plain numbers so `sound generate` can cue them.
- **Step 4, narration**: 5 to 12 words per scene. Registry example: "The Setup" gives `setup`; "POW" gives `pow`.
- **Step 5, review extras**: every number on screen matches the narration and the source; no `SampleTag` or
  SAMPLE text left; balloon and caption text is upper case and short (a balloon holds about 4 words at 46 px).
- **Step 7, pacing**: the finalize script sets 0.25 s buffers and 3-frame fades (a hard cut between panels).
  It also bakes `scenes/lipsync.ts`; set `RHUBARB_BIN` first for real mouth shapes.
- **Step 8**: the log should say `Resolution: 1080p (1080x1920)`.
- **Step 9, frames**: `fps=1/1.6,scale=216:-1,tile=10x2`, then mid-scene frames larger. Check: all text inside
  y 160 to 1500 and x 60 to 1020; balloons not covering the hero's face; panel borders visible on all four sides;
  starburst not cut off by the panel edge (also at the end of its push-in); count-ups and bars finished; mouth
  moves with the voice.

## Pitfalls

- A `Hero`, `Balloon`, `Starburst` and `Sfx` draw in the parent's coordinates (an absolutely positioned SVG over
  the parent). Put them inside a `Panel` and use panel-local px; they are cropped by the panel and zoom with its push.
- Panel `push` scales everything about a point; keep burst and balloon margins at least 60 px from the panel edge.
- Never `Math.random`; use `h01(a, b)` from the kit helpers (`ink.ts`).
- Do not add blur, drop-shadow filters or turbulence: render cost stays flat only because there are none.
- Fonts (Bangers, Comic Neue) load from Google Fonts: the first render needs internet.
