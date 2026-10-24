---
name: lowpoly_make_video
description: Produce a landscape (1280x720, rendered 1920x1080) explainer or story video starring the flat-shaded low-poly 3D presenter for the Lowpoly style bundle (talking-head at a desk, lip sync from the voiceover, gestures, caption pill, end card) from the template scenes. Use when asked to make or restyle a Lowpoly style bundle video, or a video where a low-poly character talks to camera.
metadata:
  tags: lowpoly, 3d, presenter, three, remotion, video
---

# Make a Lowpoly video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/lowpoly_video_style_guide.md` (read it first). Kit: `remotion/src/components/lowpoly/`.
Template scenes: `templates/lowpoly_video/scenes/`. Scripts: `scripts/lowpoly_new_video.py`,
`scripts/lowpoly_finalize_storyboard.py`. Only for the Lowpoly style bundle; do not mix kits (for several bundles in one film use `compose_make_story`).
No ComfyUI, no art files: the character and room are code.

## Style Bundle details for the core workflow

- `<style_bundle>` = `lowpoly`; resolution 1280x720 design space (the renderer outputs 1920x1080), 30 fps.
- **Step 2, scaffold**: writes six beats (hello, problem, idea, steps, twist, finale), SAMPLE end-card text and a captions-only `scenes/lipsync.ts`.
- **Step 3**: the story needs a source (the user's brief or document). Never invent claims or numbers.
- **Step 4, scenes**: per beat choose `shot`, `move`, `mood`, `look`, one `gesture`/`gestureAt`; replace the SAMPLE end card.
  Keep the narration in `narrations.json` only: captions and mouth movement are generated from it.
  Offer the creative choices (framing, tone of voice, gestures) as options; the user decides.
- **Voice**: use one voice for the whole video (`tts.voice_id`); when the video is a chapter of a composed story, the story's voice.
- **Finalize (step 7)**: `python scripts/lowpoly_finalize_storyboard.py <project>` instead of the generic storyboard command. It also writes `scenes/lipsync.ts`
  (re-run it after every voiceover change, or the mouth will not match).
- **Render check**: render a few frames first, `python -m src.cli render <project> --frames 100-101`, extract one with ffmpeg and look at it
  (face readable, mouth moving, caption not covering hands, nothing clipped). The full render is slow (WebGL); run it in the background.
- **Before delivery**: `python scripts/continuity_qc.py --project <project>`, read `qc/brief.md` and the contact sheet, then re-run with `--reviewed`.
