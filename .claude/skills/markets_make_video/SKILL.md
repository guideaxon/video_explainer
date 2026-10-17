---
name: markets_make_video
description: Produce a vertical (1080x1920, mobile-first) market-story explainer video for the Markets channel (charts, sectors, sentiment, money flows) in the Markets data-journalism style, from the template scenes. Use when asked to make or restyle a Markets channel video.
metadata:
  tags: markets, finance, charts, remotion, video
---

# Make a Markets video

Style source of truth: `docs/markets_video_style_guide.md` (read it first). Kit:
`remotion/src/components/markets/kit.tsx`. Template scenes: `templates/markets_video/scenes/`.
Only for the Markets channel; do not use it for Vantage (see `vantage_make_short`).

## Environment (Windows)

```powershell
$env:PYTHONUTF8 = "1"                 # required for CLI output
# ffmpeg on PATH (winget Gyan.FFmpeg); internet needed on first render for Google Fonts
.venv\Scripts\activate
```

## Workflow

1. **Project**: `python -m src.cli create <project> --title "<title>"`.
2. **Scaffold**: `python scripts/markets_new_video.py <project>`
   (copies the template scenes, writes starter SAMPLE narration, sets **1080x1920**, `"channel": "markets"`).
3. **Gather real data** for every chart you keep (series, OHLC, sector moves, allocation, sentiment
   value, tickers) with a source and date. Never invent numbers.
4. **Edit the scenes** in `projects/<project>/scenes/*.tsx`: replace the SAMPLE data, chapter titles,
   annotations and footer source. Drop or reorder chapters as the story needs. Keep one chart per scene.
5. **Edit `narration/narrations.json`** to match: one entry per scene, 8 to 14 words of insight.
   **Registry key rule**: each scene key in `scenes/index.ts` must equal the slug of that scene's
   `title` ("The Long Road Up" gives `long_road_up`; leading The/A/An dropped). Component names end in
   `Scene`; keys are unquoted. If you rename titles, rename keys.
6. **Voice**: `python -m src.cli voiceover <project> --provider edge` (or `elevenlabs`).
7. **Storyboard and pacing**: `python scripts/markets_finalize_storyboard.py <project>`
   (trims TTS silence, builds the storyboard, sets 0.35 s buffers and 12-frame fades). Use this
   instead of the plain `storyboard` command.
8. **Render**: `python -m src.cli render <project>` (output `output/final.mp4`).
   A transient "Target closed" message at the end is harmless if it says "Video rendered".
9. **Verify**:
   - size and decode: `ffprobe` shows 1080x1920; `ffmpeg -v error -i final.mp4 -f null -` prints nothing;
   - frames: `ffmpeg -i final.mp4 -vf "fps=1/2.4,scale=400:-1,tile=6x4" -frames:v 1 sheet.png`
     and read it. Check annotations sit on the right data point, labels do not overlap, charts
     finish before the scene ends, SAMPLE footer text is gone;
   - audio: `ffprobe` shows aac stereo 48 kHz; `silencedetect=noise=-45dB:d=0.8` shows gaps of about
     1 s only at scene boundaries; `ebur128` loudness (expect about -20 LUFS).
10. **Social export** (loudness): `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11
    -c:a aac -b:a 192k final_social.mp4`.
11. **Promote reusable changes** to `templates/markets_video/` and the kit (`projects/` is gitignored).

## Adding a chart type

Add a data-driven component to the kit (props in, geometry inside, draw-on animation, colours from
`useTheme()`), then a template scene using it, then register it in `templates/markets_video/scenes/index.ts`
and `scripts/markets_new_video.py` (`SAMPLE_SCENES`); `tests/test_markets_template.py` checks they agree.

## Pitfalls

- Render came out 1920x1080: the project config is not portrait (`video.resolution` must be 1080x1920).
- "Found 0 scene types in scenes/index.ts" means component names do not end in `Scene`.
- Storyboard type mismatch (scene not found) means key does not equal the title slug (step 5).
- Default player transitions are 1.5 s cinematic blur; the finalize script overrides them.
- Template scenes carry "SAMPLE DATA" text; do not ship with it.
