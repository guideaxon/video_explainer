---
name: launch_make_video
description: Produce a vertical (1080x1920, mobile-first) playful consumer-app launch teaser for the Launch channel (evolving mascot, bold two-line headlines, phone mockups with floating chips, store pill) from the template scenes. Use when asked to make or restyle a Launch channel video.
metadata:
  tags: launch, app, mascot, mobile, remotion, video
---

# Make a Launch video

Style source of truth: `docs/launch_video_style_guide.md` (read it first). Kit:
`remotion/src/components/launch/kit.tsx`. Template scenes: `templates/launch_video/scenes/`.
Only for the Launch channel; others have their own skills (`vantage_make_short`, `markets_make_video`,
`promo_make_video`).

## Environment (Windows)

```powershell
$env:PYTHONUTF8 = "1"                 # required for CLI output
# ffmpeg on PATH (winget Gyan.FFmpeg); internet needed on first render for Google Fonts
.venv\Scripts\activate
```

## Workflow

1. **Project**: `python -m src.cli create <project> --title "<title>"`.
2. **Scaffold**: `python scripts/launch_new_video.py <project>`
   (copies the template scenes, writes starter SAMPLE narration for the placeholder app, sets
   **1080x1920**, `"channel": "launch"`, edge TTS).
3. **Brief**: the real app name, mascot (or none), 3 to 5 real features, release status and store.
   Do not copy another brand's name, mascot, copy or screens. Do not invent features or numbers.
4. **Edit the scenes** in `projects/<project>/scenes/*.tsx`: brand name and tagline (`finale`,
   `hook`), mascot name, feature headlines and chips (the four feature scenes use `Feature`), widget
   content. Remove `SampleTag`/sample numbers. If the app has no mascot, drop `evolve` and use a
   phone or icon hero instead; keep the type system (eyebrow, two-line headline, sub).
5. **Edit `narration/narrations.json`** to match: one entry per scene, 5 to 12 words.
   **Registry key rule**: each key in `scenes/index.ts` must equal the slug of that scene's `title`
   ("Daily Mascot" gives `daily_mascot`; leading The/A/An dropped). Component names end in `Scene`,
   keys unquoted. Rename keys when you rename titles; `tests/test_launch_template.py` shows the rule.
6. **Voice**: `python -m src.cli voiceover <project> --provider edge` (or `elevenlabs`).
7. **Storyboard and pacing**: `python scripts/launch_finalize_storyboard.py <project>`
   (trims TTS silence, builds the storyboard, 0.2 s buffers, 8-frame fades). Use this instead of the
   plain `storyboard` command.
8. **Render**: `python -m src.cli render <project>`. The portrait project config gives 1080x1920
   (`Resolution: 1080p (1080x1920)` in the log). Output `output/final.mp4`.
9. **Verify**:
   - size and decode: `ffprobe` shows 1080x1920; `ffmpeg -v error -i final.mp4 -f null -` prints nothing;
   - frames: `ffmpeg -i final.mp4 -vf "fps=1/1.4,scale=216:-1,tile=13x2" -frames:v 1 sheet.png`, then
     mid-scene frames larger. Check: text inside the safe zone (y 160 to 1500), nothing overlapping
     (tagline vs wordmark, chips vs phone), headline complete when read muted, no sample/placeholder text;
   - audio: `ffprobe` aac 48 kHz; `silencedetect=noise=-45dB:d=0.8`; `ebur128` loudness (about -20 LUFS).
10. **Social export**: `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac
    -b:a 192k final_social.mp4`.
11. **Promote reusable changes** to `templates/launch_video/` and the kit (`projects/` is gitignored).

## Pitfalls

- Render came out 1920x1080: the project config is not portrait (`video.resolution` must be 1080x1920).
- "Found 0 scene types in scenes/index.ts": component names do not end in `Scene`.
- Scene not found at render: the registry key is not the title slug (step 5).
- Default player transitions are 1.5 s cinematic blur; the finalize script overrides them.
- A transient "Target closed" message at the end of a render is harmless if the log says "Video rendered".
- The store pill is not clickable on social platforms: say "link in bio".
