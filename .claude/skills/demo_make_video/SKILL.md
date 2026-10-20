---
name: demo_make_video
description: Produce a narrated, captioned product demo video from device screenshots (phone, tablet, laptop) for the Demo channel, with no screen recording, from a manifest (camera zooms, highlights, cursor, step tracker, intro and outro). Use when asked to make a product demo from screenshots.
metadata:
  tags: demo, product-demo, screenshots, remotion, video
---

# Make a Demo video

## Requirements

You must use the `video_make_core` skill for the shared steps (review, voiceover, finalize, render, verify,
export) but **steps 2 to 4 are replaced here** (manifest instead of template scenes).

Style source of truth: `docs/demo_video_style_guide.md` (read it first). Kit:
`remotion/src/components/demo/kit.tsx`. Scripts: `scripts/demo_new_video.py`, `scripts/demo_build_scenes.py`,
`scripts/demo_finalize_storyboard.py`. Only for the Demo channel; other channels have their own skills.

Python needs **Pillow** and **numpy** (both in `pyproject.toml`):
- Pillow decodes the png/jpg/webp screenshots, reads their pixel size (aspect ratio picks the device frame
  and prevents stretching) and downsamples them to a 160 px thumbnail so analysis is fast on 4K captures.
- numpy turns that thumbnail into an (N, 3) RGB array: mean luminance chooses the light or dark theme, and a
  saturation-weighted hue histogram over the vivid pixels gives the brand accent colour.
Both are used only by `analyze_image` in `scripts/_demo_manifest.py`; rendering does not need them.

## Inputs to collect from the user

Screenshots (one per step, file names in order, e.g. `01_login.png`; optional `logo.png`), the product name,
the audience, the maximum length, and an optional script or voice recordings. If there is no script, write it
from what is visible in the screenshots. Never invent features, numbers or results.

## Workflow

1. **Project**: `python -m src.cli create <project> --title "<title>"`.
2. **Scaffold**: `python scripts/demo_new_video.py <project> --screenshots <dir> --name "<Product>"` (add
   `--portrait` for 1080x1920). It copies the screenshots, detects device, theme and accent colour, writes a
   draft `manifest.json` with TODO text, and sets the project config (`"channel": "demo"`).
3. **Read every screenshot** (use the Read tool on each image). Then fill `manifest.json`: for each step a
   `title`, an on-screen `caption` (at most 8 words, `*word` for the accent), a `narration` line (5 to 30 spoken
   words, only what that screen shows), and where it helps a `focus` region, a `highlight` and a `cursor`
   path, with coordinates read off the image. Fill intro and outro (headline, sub line, call to action). Keep
   the total inside the user's maximum length (about 2.5 spoken words per second plus 0.5 s between scenes).
4. **Generate**: `python scripts/demo_build_scenes.py <project>` (validates the manifest, writes scenes and
   narration). Re-run after every manifest edit.
5. **Pre-render review**: `python scripts/review_video.py <project> --brief`; fix every ERROR, then do the
   reviewer pass from `docs/video_review_checklist.md`, **comparing each caption and narration line with its
   screenshot**. Anything not visible in the image or the brief is unsupported: remove or reword it.
6. **Voice**: `python -m src.cli voiceover <project> --provider edge` (or `elevenlabs`), or the user's own
   recordings with `--provider manual --audio-dir <dir>`.
7. **Pacing**: `python scripts/demo_finalize_storyboard.py <project>` (add `--keep-audio` for own recordings).
8. **Render**: `python -m src.cli render <project>`; the log should say `Resolution: 1080p (1920x1080)`
   (or 1080x1920 for portrait). A transient "Target closed" message is harmless if the log says "Video rendered".
9. **Verify**: follow `video_make_core` step 9 with `fps=1/2.2,scale=640:-1,tile=3x3` for the sheet. Check:
   the screenshot is whole and unstretched, the zoom lands on the intended region, highlight and cursor sit on
   the real element, subtitles do not overlap the device, text is readable, the intro and outro are complete.
10. **Export**: `video_make_core` step 10. Promote reusable changes to the kit and docs, not `projects/`.

## Pitfalls

- "manifest: ... placeholder text left in": a TODO from the scaffold is still in the manifest.
- Image looks stretched: `aspect` in the manifest differs from the file; re-run the scaffold or fix the number.
- Zoom shows the wrong area: `focus` is x, y of the top-left corner, in 0..1 of the screenshot, not the centre.
- Scene files are generated; edits to `scenes/*.tsx` are overwritten by `demo_build_scenes.py`.
- Screenshots can contain personal data; check and blur it before use.
