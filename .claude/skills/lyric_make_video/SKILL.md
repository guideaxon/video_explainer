---
name: lyric_make_video
description: Produce a vertical (1080x1920, mobile-first) animated lyric / music video for the Lyric channel (kawaii retro-pixel pastel pop: bubble and slam type, retro windows, props, a pixel character) from the template scenes. Use when asked to make or restyle a Lyric channel video.
metadata:
  tags: lyric, music-video, kawaii, pixel, mobile, remotion, video
---

# Make a Lyric video

Style source of truth: `docs/lyric_video_style_guide.md` (read it first). Kit:
`remotion/src/components/lyric/kit.tsx`. Template scenes: `templates/lyric_video/scenes/`.
Only for the Lyric channel; others have their own skills (`vantage_make_short`, `markets_make_video`,
`promo_make_video`, `launch_make_video`).

## Environment (Windows)

```powershell
$env:PYTHONUTF8 = "1"                 # required for CLI output
# ffmpeg on PATH (winget Gyan.FFmpeg); internet needed on first render for Google Fonts
.venv\Scripts\activate
```

## Workflow

1. **Project**: `python -m src.cli create <project> --title "<title>"`.
2. **Scaffold**: `python scripts/lyric_new_video.py <project>`
   (copies the template scenes, writes starter SAMPLE narration, sets **1080x1920**,
   `"channel": "lyric"`, edge TTS).
3. **Lyrics first**: write the real lyrics (yours or licensed; never another song's). Split them into
   lines, one scene per line or couplet, each with a visual gag (prop) in mind.
4. **Edit the scenes** in `projects/<project>/scenes/*.tsx`: lyric text, props, background per scene,
   character hat/pose. Add or drop scenes; keep a cold open, a title moment, an emotional beat, a big
   finish and credits. Remove `SampleTag`.
5. **Edit `narration/narrations.json`**: one entry per scene, the spoken/sung line.
   **Registry key rule**: each key in `scenes/index.ts` must equal the slug of that scene's `title`
   ("Rise and Shine" gives `rise_and_shine`; leading The/A/An dropped). Component names end in `Scene`,
   keys unquoted. Rename keys when you rename titles; `tests/test_lyric_template.py` shows the rule.
6. **Audio**, pick one:
   - Spoken lines: `python -m src.cli voiceover <project> --provider edge`, then
     `python scripts/lyric_finalize_storyboard.py <project>`.
   - A real song: slice it into `projects/<project>/voiceover/<scene_id>.mp3` clips (one per scene,
     `ffmpeg -ss <s> -t <len> -i song.mp3 -c:a libmp3lame ...`), then
     `python scripts/lyric_finalize_storyboard.py <project> --no-trim` (no silence trimming).
7. **Render**: `python -m src.cli render <project>`. The portrait config gives 1080x1920
   (`Resolution: 1080p (1080x1920)` in the log). Output `output/final.mp4`.
8. **Verify**:
   - size and decode: `ffprobe` shows 1080x1920; `ffmpeg -v error -i final.mp4 -f null -` prints nothing;
   - frames: sample near the END of each scene (animations must have landed), e.g.
     `ffmpeg -ss <scene_start+scene_len*0.8> -i final.mp4 -frames:v 1 f.png`, montage with hstack/vstack.
     Check: every key reveal complete, text inside the safe zone (y 160 to 1500), no prop covering
     text (stamps vs rows), nothing cut off;
   - audio: `ffprobe` aac 48 kHz; for TTS `ebur128` about -20 LUFS.
9. **Social export**: `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac
   -b:a 192k final_social.mp4`.
10. **Promote reusable changes** to `templates/lyric_video/` and the kit (`projects/` is gitignored).

## Pitfalls

- Reveals that start after ~60% of a scene's length are cut off by the next scene (scenes are 2 to 5 s).
- Render came out 1920x1080: the project config is not portrait (`video.resolution` must be 1080x1920).
- "Found 0 scene types in scenes/index.ts": component names do not end in `Scene`.
- Scene not found at render: the registry key is not the title slug (step 5).
- Trimming a song with the default finalize step cuts the music: use `--no-trim` for song clips.
- A transient "Target closed" message at the end of a render is harmless if the log says "Video rendered".
