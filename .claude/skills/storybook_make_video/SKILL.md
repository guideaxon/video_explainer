---
name: storybook_make_video
description: Produce a landscape (1280x720) illustrated storybook film for the Storybook style bundle (painted stills generated locally in ComfyUI, slow camera moves, dissolves, recurring cast, title end card) from the template scenes. Use when asked to make or restyle a Storybook style bundle video, or a film in the look of docs/launch_film_breakdown.md.
metadata:
  tags: storybook, illustration, comfyui, remotion, video
---

# Make a Storybook video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/storybook_video_style_guide.md` (read it first). Kit:
`remotion/src/components/storybook/kit.tsx`. Template scenes: `templates/storybook_video/scenes/`.
Scripts: `scripts/storybook_new_video.py`, `scripts/storybook_stills_comfy.py`,
`scripts/storybook_finalize_storyboard.py`. Only for the Storybook style bundle; do not mix kits.
Needs ComfyUI on `http://127.0.0.1:8188` (SD1.5 checkpoint `sd15\juggernaut_reborn.safetensors`); plug the laptop in.

## Style Bundle details for the core workflow

- `<style_bundle>` = `storybook`; resolution 1280x720, 30 fps.
- **Step 2, scaffold**: also writes `art/style.json` (style line, cast, negative prompt, one shot per scene).
  Edit the cast and shots to the real story first; flag shots that show the character with `"cast": true`.
- **Step 3**: the story needs a source (the user's brief or document). Never invent claims or numbers.
- **Radio cut**: `python scripts/radio_cut.py <project>` before generating art; fix timing first.
- **Stills**: `python scripts/storybook_stills_comfy.py <project>` (about 30 to 40 s per still). Look at every
  `art/<id>.png`. Reroll with `--only <id> --force --seed-offset N`. SD1.5 does not hold character identity or
  exact composition: expect to reroll, simplify the prompt, or crop. Put the best front and side views of the
  character in `art/refs/`.
- **Step 4, narration**: 5 to 14 words per scene; scene art is `art/<scene_id>.png`.
- **Finalize**: `python scripts/storybook_finalize_storyboard.py <project>`.
- **Before delivery**: `python scripts/continuity_qc.py --project <project> --refs projects/<project>/art/refs`, read `qc/brief.md` and the contact sheet, then re-run with `--reviewed`.
