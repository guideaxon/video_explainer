---
name: video_make_core
description: Shared workflow for the full-video style bundles (Markets, Promo, Launch, Lyric, Leaderbot, Demo, Storybook, Lowpoly): project, scaffold, pre-render review, voiceover, finalize, render, verify, export. Not invoked directly; a style bundle skill (markets_make_video, promo_make_video, launch_make_video, lyric_make_video) loads it first and supplies the style bundle details.
metadata:
  tags: video, remotion, workflow, core
---

# Core workflow for full-video style bundles

A style bundle skill hands you these values; use them wherever `<...>` appears:
`<style_bundle>`, style guide `docs/<style_bundle>_video_style_guide.md`, kit `remotion/src/components/<style_bundle>/`,
templates `templates/<style_bundle>_video/`, scripts `scripts/<style_bundle>_new_video.py` and
`scripts/<style_bundle>_finalize_storyboard.py`, plus the style bundle's data step, narration length, pacing and
frame-sheet settings. Not for Vantage shorts (`vantage_make_short`).
Read the style guide first.

## Environment (Windows)

```powershell
$env:PYTHONUTF8 = "1"                 # required for CLI output
# ffmpeg on PATH (winget Gyan.FFmpeg); internet needed on first render for Google Fonts
.venv\Scripts\activate
```

## Workflow

1. **Project**: `python -m src.cli create <project> --title "<title>"`.
2. **Scaffold**: `python scripts/<style_bundle>_new_video.py <project>` (copies template scenes, writes starter
   SAMPLE narration, sets **1080x1920**, `"style_bundle": "<style_bundle>"`).
3. **Gather real content** (style bundle skill says what): every number, name, feature or proof needs a source.
   Never invent any.
4. **Edit scenes** in `projects/<project>/scenes/*.tsx` and **`narration/narrations.json`** (one entry per
   scene, length per the style bundle skill). Drop or reorder scenes to fit the story.
   **Registry key rule**: each key in `scenes/index.ts` must equal the slug of that scene's `title`
   ("The Hook" gives `hook`; leading The/A/An dropped, punctuation removed). Component names end in
   `Scene`; keys are unquoted. Rename keys when you rename titles.
5. **Pre-render review** (before any voiceover or render):
   `python scripts/review_video.py <project> --brief`.
   Fix every ERROR. Then do the reviewer pass from `docs/video_review_checklist.md` on the printed brief
   (claims against your gathered sources, fabricated proof, narration vs screen, style, stale text) and fix
   or explicitly accept each issue. Re-run until there are 0 errors.
   Then the **radio cut**: `python scripts/radio_cut.py <project>` fixes the scene timeline from the narration
   alone (`plan/radio_cut.json`). Fix any ERROR (planned scene shorter than its speech) before spending time on
   voice or render.
6. **Voice**: `python -m src.cli voiceover <project> --provider edge` (or `elevenlabs`).
7. **Storyboard and pacing**: `python scripts/<style_bundle>_finalize_storyboard.py <project>` (trims TTS
   silence, builds the storyboard, sets the style bundle's buffers and fades). Use it instead of the plain
   `storyboard` command.
   The bundles with a talking character (Launch, Lyric, Leaderbot, Lowpoly) also bake `scenes/lipsync.ts` here
   (shared `scripts/_lipsync.py`; Rhubarb Lip Sync adds mouth shapes, else loudness only, with a warning).
   **Sound effects (optional)**: `python -m src.cli sound <project> library --generate` once, then
   `python -m src.cli sound <project> generate` writes cues into the storyboard: kit entrances, plus character cues
   from the rig (a pop at each literal `gestureAt={n}`, a footstep per step of a literal `walk={{ from, to }}`).
   Re-run it after changing scene timing.
8. **Render**: `python -m src.cli render <project>` (output `output/final.mp4`). A transient "Target
   closed" message at the end is harmless if the log says "Video rendered".
9. **Verify** (inspect frames before calling it done):
   - size and decode: `ffprobe` shows 1080x1920; `ffmpeg -v error -i final.mp4 -f null -` prints nothing;
   - frames: a contact sheet, `ffmpeg -i final.mp4 -vf "fps=<style bundle rate>,scale=<w>:-1,tile=<cols>x<rows>"
     -frames:v 1 sheet.png`, then read it, plus mid-scene and end-of-scene frames at full size. Check the
     style bundle's visual points (safe zone, overlaps, labels, animations finished, placeholder text gone);
   - audio: `ffprobe` shows aac 48 kHz; `silencedetect=noise=-45dB:d=0.8` shows about 1 s gaps only at
     scene boundaries; `ebur128` loudness about -20 LUFS.
10. **Social export**: `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k
    final_social.mp4`.
11. **Promote reusable changes** to `templates/<style_bundle>_video/` and the kit (`projects/` is gitignored).

## Common pitfalls

- Render came out 1920x1080: `video.resolution` in the project config is not 1080x1920.
- "Found 0 scene types in scenes/index.ts": component names do not end in `Scene`.
- Scene not found at storyboard or render: the registry key is not the title slug (step 4).
- Default player transitions are 1.5 s cinematic blur; the finalize script overrides them.
- Template scenes carry SAMPLE text and tags; `review_video.py` flags them, do not ship with them.

## Characters and render cost

- Characters share the rig contract in `remotion/src/components/rig/` (types and timing only); each kit draws its
  own. Never import another bundle's character to get a feature: add it to this bundle's kit.
- Large SVG blur and turbulence filters (glow, grain, watercolour bleed) are slow at 1080x1920. Keep blurs on small
  layers, bake static textures to images once, and note the render time per frame (`npx remotion render ... --log=verbose`)
  in the style guide when a scene adds one.

## Adding a style bundle check

Style-bundle-specific hard checks live in the `STYLE_BUNDLES` dict in `scripts/review_video.py` (narration word range,
required phrases). Add rules there, not in the style bundle skill text.
