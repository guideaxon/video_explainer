---
name: rubberhose_make_video
description: Produce a vertical (1080x1920, mobile-first) retro 1930s rubber-hose cartoon for the Rubberhose style bundle (Kip the kettle with noodle limbs, white gloves, pie-cut eyes, animated on twos, with film grain, gate weave, Art Deco title card and iris in/out) from the template scenes. Use when asked to make or restyle a Rubberhose style bundle video.
metadata:
  tags: rubberhose, retro, cartoon, 1930s, remotion, video
---

# Make a Rubberhose video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/rubberhose_video_style_guide.md` (read it first). Kit:
`remotion/src/components/rubberhose/kit.tsx`. Template scenes: `templates/rubberhose_video/scenes/`.
Scripts: `scripts/rubberhose_new_video.py`, `scripts/rubberhose_finalize_storyboard.py`.
Only for the Rubberhose style bundle; other style bundles have their own skills.

## Style Bundle details for the core workflow

- `<style_bundle>` = `rubberhose`.
- **Step 3, brief**: one small story with a character beat, one gag and a solution. It can be fictional; if it
  explains something real, every fact needs a source. Creative calls (character, voice, music) are offered as
  options; the user decides.
- **Step 4, scenes**: edit headlines, sign text, title card kicker and title, end card line. Keep the opening iris
  and title card, one gag, and the iris-out end card (`RScene iris="out"` on the last scene, centred on the face).
  Remove `SampleTag` with the sample text. Use literal numbers for `gestureAt` and `walk` so sound cues work.
- **Step 4, narration**: 6 to 14 words per scene, cheerful and short. Registry example: "That's All" gives `thats_all`.
- **Step 5, review extras**: headline lines at most 13 characters at 104 px; no fact stated without a source;
  Kip says what the screen shows.
- **Step 6, voice**: pick a warm, slightly old-fashioned voice; offer 2 or 3 options.
- **Step 7, pacing**: the finalize script sets 0.3 s buffers and 6-frame fades and bakes `scenes/lipsync.ts`.
  Set `RHUBARB_BIN` first so Kip gets real mouth shapes.
- **Step 8**: the log should say `Resolution: 1080p (1080x1920)`. The grain makes files big, so the scaffold sets
  `video.crf` to 24 in `config.json` and the render uses it (style guide section 6 has a smaller social re-encode).
- **Step 9, frames**: `fps=1/1.6,scale=216:-1,tile=9x2`, then mid-scene frames larger. Check the first and last frames
  are black (iris), mouths change between frames while Kip speaks, the headline is complete, props have settled,
  nothing is outside y 160 to 1500, SAMPLE tag gone. Scratches and dust specks are intentional.

## Pitfalls

- Everything must stay deterministic: never `Math.random`; use `hash3` from `film.ts`.
- Do not add blur, `feTurbulence` or blend-mode filters (render cost, see the style guide); texture comes from the
  one-time grain tile.
- Animate with the held clock (`useHeld`: `hf` / `d`) so motion steps on twos; index lip sync with the real `frame`.
- Draw new limbs with `hosePath`, never two segments (no elbows or knees).
- Fonts (Corben, Limelight, Yesteryear) load from Google Fonts: the first render needs internet.
