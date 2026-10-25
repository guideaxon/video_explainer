---
name: glossy_make_video
description: Produce a vertical (1080x1920, mobile-first) glossy toy 3D-look product explainer or launch teaser for the Glossy style bundle (a shiny vinyl toy character, gradient gloss, springy squash-and-stretch motion, candy buttons, chips and bars on a pastel studio sweep) from the template scenes. Use when asked to make or restyle a Glossy style bundle video, or a video starring a glossy vinyl toy.
metadata:
  tags: glossy, toy, vinyl, product, remotion, video
---

# Make a Glossy video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/glossy_video_style_guide.md` (read it first). Kit:
`remotion/src/components/glossy/kit.tsx`. Template scenes: `templates/glossy_video/scenes/`.
Scripts: `scripts/glossy_new_video.py`, `scripts/glossy_finalize_storyboard.py`.
Only for the Glossy style bundle; other style bundles have their own skills.

## Style Bundle details for the core workflow

- `<style_bundle>` = `glossy`.
- **Step 3, brief**: the product or idea in one line, the problem it solves, three steps or features, one proof figure
  (with source and date) and the call to action. Pebbo is a placeholder: rename the toy to the product's mascot
  or keep it as a generic toy, never as a real brand's character.
- **Step 4, scenes**: edit headlines (14 characters per line at most), chip and step labels, the stat and bar
  values, the button label and the store line; recolour the toy (`color`, `accent`) to the brand if asked. Remove
  `SampleTag` only where the data is real and sourced. Keep the hook (Unboxing), one proof scene and the end card.
  Pass `mouth` and `visemes` from `./lipsync` to every `Toy` that should talk, and use literal numbers for `gestureAt`
  and `walk` so the sound step can add pops and footsteps.
- **Step 4, narration**: 6 to 12 words per scene, friendly, second person. Registry example: "Too Much Stuff" gives
  `too_much_stuff`; "The Big Number" gives `big_number`.
- **Step 5, review extras**: every number on screen matches the narration and the source; no real brand, store badge
  or person; the headline lines fit (no wrapping into the visual).
- **Step 7, pacing**: the finalize script sets 0.25 s buffers and 10-frame fades and bakes `scenes/lipsync.ts`. Set
  `RHUBARB_BIN` first so the toy gets all nine mouth shapes (else it only opens and closes).
- **Step 8**: the log should say `Resolution: 1080p (1080x1920)`.
- **Step 9, frames**: `fps=1/1.8,scale=216:-1,tile=10x2`, then mid-scene and end-of-scene frames at full size. Check:
  the toy is whole and not clipped by the box or the frame, the lid has left the Unboxing scene by its end,
  count-ups and bars have finished, the button label and chips are inside x 60 to 1020, text is inside y 160 to 1500,
  the face decal reads (mouth shape changes while the toy speaks), SAMPLE tag gone.

## Pitfalls

- Gradient ids: every SVG block must prefix ids with `useGlossId()`. A literal `id="body"` makes the second toy on a
  frame take the first one's colour or turn black.
- No blur filters (`feGaussianBlur`, `filter: blur`) on large layers: shadows and sheen are radial gradients. Keep it so.
- A `Toy` inside `ToyBox` is clipped at the box bottom and drawn in the box's coordinates: give it the same `x` as
  the box and a `y` about 150 below the box's top edge, `enter="rise"`, with `from` equal to the box's `openAt`.
- Pass `walkTo` with `walk`, and keep `walk.from` after the entrance has settled; the toy stands still before it.
- Fonts (Fredoka, Nunito) load from Google Fonts: the first render needs internet.
- Never use `Math.random`: confetti and everything else is seeded and deterministic.
