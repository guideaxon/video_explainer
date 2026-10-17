---
name: lyric_make_video
description: Produce a vertical (1080x1920, mobile-first) animated lyric / music video for the Lyric channel (kawaii retro-pixel pastel pop: bubble and slam type, retro windows, props, a pixel character) from the template scenes. Use when asked to make or restyle a Lyric channel video.
metadata:
  tags: lyric, music-video, kawaii, pixel, mobile, remotion, video
---

# Make a Lyric video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the channel details below.
Do not continue from this file alone. Steps 6 and 7 are overridden here (audio choice, see below).

Style source of truth: `docs/lyric_video_style_guide.md` (read it first). Kit:
`remotion/src/components/lyric/kit.tsx`. Template scenes: `templates/lyric_video/scenes/`.
Scripts: `scripts/lyric_new_video.py`, `scripts/lyric_finalize_storyboard.py`.
Only for the Lyric channel; others have their own skills (`vantage_make_short`, `markets_make_video`,
`promo_make_video`, `launch_make_video`).

## Channel details for the core workflow

- `<channel>` = `lyric`.
- **Step 3, lyrics first**: write the real lyrics (yours or licensed; never another song's). Split them into
  lines, one scene per line or couplet, each with a visual gag (prop) in mind.
- **Step 4, scenes**: lyric text, props, background per scene, character hat/pose. Add or drop scenes; keep
  a cold open, a title moment, an emotional beat, a big finish and credits. Remove `SampleTag`.
- **Step 4, narration**: one entry per scene, the spoken/sung line (no word range is checked).
  Registry example: "Rise and Shine" gives `rise_and_shine`.
- **Step 5, review extras**: lyrics are original or licensed, none copied from another song; credits scene
  names the real author; no "SAMPLE LYRICS" tag left.
- **Steps 6 and 7, audio** (replace the core steps), pick one:
  - Spoken lines: `python -m src.cli voiceover <project> --provider edge`, then
    `python scripts/lyric_finalize_storyboard.py <project>`.
  - A real song: slice it into `projects/<project>/voiceover/<scene_id>.mp3` clips (one per scene,
    `ffmpeg -ss <s> -t <len> -i song.mp3 -c:a libmp3lame ...`), then
    `python scripts/lyric_finalize_storyboard.py <project> --no-trim` (no silence trimming).
- **Step 9, frames**: sample near the END of each scene (animations must have landed), e.g.
  `ffmpeg -ss <scene_start+scene_len*0.8> -i final.mp4 -frames:v 1 f.png`, montage with hstack/vstack.
  Check every key reveal is complete, text is inside the safe zone (y 160 to 1500), no prop covers text
  (stamps vs rows), nothing is cut off. For TTS, `ebur128` about -20 LUFS.

## Pitfalls

- Reveals that start after ~60% of a scene's length are cut off by the next scene (scenes are 2 to 5 s).
- Trimming a song with the default finalize step cuts the music: use `--no-trim` for song clips.
