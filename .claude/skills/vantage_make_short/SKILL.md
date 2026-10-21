---
name: vantage_make_short
description: Produce a vertical TikTok/Reels/Shorts video for the Vantage style bundle (GuideAxon private on-device AI life coach) in the Vantage editorial line-art style. Use when asked to make, redo or restyle a Vantage short or marketing video.
metadata:
  tags: vantage, shorts, tiktok, remotion, video
---

# Make a Vantage short

Style source of truth: `docs/vantage_video_style_guide.md` (read it first, in full). Shared
building blocks: `remotion/src/components/vantage/kit.tsx`. Reference scenes:
`templates/vantage_short/scenes/`. Only use this skill for the Vantage style bundle.

## Environment (Windows)

```powershell
$env:PYTHONUTF8 = "1"                       # required for CLI output
# ffmpeg must be on PATH (winget Gyan.FFmpeg, user scope)
.venv\Scripts\activate
```

## Workflow

1. **Project**: `python -m src.cli create <project>` (skip if it exists). Set the TTS provider to
   `edge` (free) or `elevenlabs` in `projects/<project>/config.json`, and `target_duration_seconds` to 45.
2. **Source**: write `projects/<project>/input/source.md` as marketing copy: problem, on-device
   solution, Plan/Act/Reflect, three pillars, CTA. Only true claims (see guide section 5).
3. **Script and narration**: `python -m src.cli script <project>` then `narration <project>`.
4. **Short script**: `python -m src.cli short script <project> --mode summary --duration 45 --variant <v>`.
   Then **edit `short/<v>/short_script.json`** by hand: set `condensed_narration` (70 to 80 words,
   follows the 6-beat structure in the guide), `cta_narration` ("... Link in bio."),
   `cta_text`, `hook_question`. The generated CTA ("full breakdown in the description") is wrong
   for this style bundle.
5. **Voice**: `python -m src.cli short voiceover <project> --variant <v> --provider edge`.
   Check the duration is about 36 to 45 s.
6. **Scaffold scenes**: `python scripts/vantage_new_short.py <project> --variant <v>`
   (copies the reference scenes, sets `"style_bundle": "vantage"`, adds the renderer stub).
   Alternative: let the generator write them with the style (`python -m src.cli short storyboard
   <project> --variant <v>` after setting the style bundle); review the result critically, it is a
   starting point, not final.
7. **Storyboard**: `python -m src.cli short storyboard <project> --variant <v> --skip-custom-scenes`
   (builds beats from the word timestamps; keeps your hand-edited scenes). Then read
   `short/<v>/storyboard/shorts_storyboard.json` for each beat's `start_seconds` and word timings.
8. **Adapt the scenes** in `projects/<project>/short/<v>/scenes/Beat*.tsx` to the narration:
   headline, art and labels per beat, theme flip on the pivot word, CTA on the last beat.
   Registry keys must match beat ids in the storyboard (`beat_1` to `beat_N`).
9. **Render**: `python -m src.cli render <project> --short --variant <v>`
   (output `short/<v>/output/short.mp4`).
10. **Review frames**, not only the first frame of each beat:
    `ffmpeg -ss <t> -i short.mp4 -frames:v 1 -vf scale=360:-1 f<t>.png` at mid-beat and end-of-beat,
    montage with `hstack`/`vstack`. Check: text legible and inside 90 px margins, nothing below
    y = 1660, no overlaps, entrance animations visible, theme flip lands on the right word,
    audio and captions in sync. Fix and re-render.
11. **Promote reusable changes** to `templates/vantage_short/` and the guide (projects/ is gitignored).

## Pitfalls

- "No custom short scenes found" in the render log: scenes not picked up. Check the paths and
  that `deriveShortsSceneDir` handles Windows paths (it does since the fix in `render-utils.mjs`).
- Renders need internet the first time for Google Fonts (Cinzel, IBM Plex Mono).
- Buttons and URLs in the video are not clickable on TikTok; use "link in bio".
- Do not use emoji or the generic dark-theme `styles.ts` colours in scenes.
- Do not commit generated media (`projects/` is ignored); commit templates, docs, kit and code.
