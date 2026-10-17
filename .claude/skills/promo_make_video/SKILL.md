---
name: promo_make_video
description: Produce a vertical (1080x1920, mobile-first) SaaS product-launch promo video for the Promo channel (kinetic headlines, glass UI mockups, gradient stats) from the template scenes. Use when asked to make or restyle a Promo channel video.
metadata:
  tags: promo, saas, product-launch, mobile, remotion, video
---

# Make a Promo video

Style source of truth: `docs/promo_video_style_guide.md` (read it first). Kit:
`remotion/src/components/promo/kit.tsx`. Template scenes: `templates/promo_video/scenes/`.
Only for the Promo channel; other channels have their own skills (`vantage_make_short`, `markets_make_video`).

## Environment (Windows)

```powershell
$env:PYTHONUTF8 = "1"                 # required for CLI output
# ffmpeg on PATH (winget Gyan.FFmpeg); internet needed on first render for Google Fonts
.venv\Scripts\activate
```

## Workflow

1. **Project**: `python -m src.cli create <project> --title "<title>"`.
2. **Scaffold**: `python scripts/promo_new_video.py <project>`
   (copies the template scenes, writes starter SAMPLE narration for the placeholder brand, sets
   **1080x1920**, `"channel": "promo"`, edge TTS).
3. **Brief**: gather the real product name, one-line promise, 3 to 6 features, and any proof (numbers
   with a source). Do not copy another brand's copy, numbers or screens.
4. **Edit the scenes** in `projects/<project>/scenes/*.tsx`: brand name and address (`logo_reveal`,
   `sign_off`), headlines, mock content, chart data; remove `SampleTag` only where the numbers are
   real and sourced. Drop or reorder scenes to fit the story; keep hook, reveal, 3+ features, a proof
   scene, CTA and sign-off.
5. **Edit `narration/narrations.json`** to match: one entry per scene, 4 to 10 words.
   **Registry key rule**: each key in `scenes/index.ts` must equal the slug of that scene's `title`
   ("The Hook" gives `hook`; leading The/A/An dropped). Component names end in `Scene`, keys are
   unquoted. Rename keys when you rename titles; `tests/test_promo_template.py` shows the rule.
6. **Voice**: `python -m src.cli voiceover <project> --provider edge` (or `elevenlabs`).
7. **Storyboard and pacing**: `python scripts/promo_finalize_storyboard.py <project>`
   (trims TTS silence, builds the storyboard, 0.25 s buffers, 10-frame fades). Use this instead of
   the plain `storyboard` command.
8. **Render**: `python -m src.cli render <project>`. The portrait project config makes the render
   1080x1920 (`Resolution: 1080p (1080x1920)` in the log). Output `output/final.mp4`.
9. **Verify**:
   - size and decode: `ffprobe` shows 1080x1920, `ffmpeg -v error -i final.mp4 -f null -` prints nothing;
   - frames: `ffmpeg -i final.mp4 -vf "fps=1/2.2,scale=240:-1,tile=10x3" -frames:v 1 sheet.png`, then
     mid-scene frames at full size for detail. Check: text inside the safe zone (y 160 to 1500), no
     overlaps, headline complete when read muted, SAMPLE/placeholder text gone;
   - audio: `ffprobe` aac 48 kHz; `silencedetect=noise=-45dB:d=0.8`; `ebur128` loudness (about -20 LUFS).
10. **Social export**: `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac
    -b:a 192k final_social.mp4`.
11. **Promote reusable changes** to `templates/promo_video/` and the kit (`projects/` is gitignored).

## Pitfalls

- Render came out 1920x1080: the project config is not portrait (`video.resolution` must be 1080x1920).
- "Found 0 scene types in scenes/index.ts": component names do not end in `Scene`.
- Scene not found at render: the registry key is not the title slug (step 5).
- Default player transitions are 1.5 s cinematic blur; the finalize script overrides them.
- A transient "Target closed" message at the end of a render is harmless if the log says "Video rendered".
- Buttons are not clickable on TikTok; the sign-off should point to "link in bio".
