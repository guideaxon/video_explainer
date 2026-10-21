---
name: launch_make_video
description: Produce a vertical (1080x1920, mobile-first) playful consumer-app launch teaser for the Launch style bundle (evolving mascot, bold two-line headlines, phone mockups with floating chips, store pill) from the template scenes. Use when asked to make or restyle a Launch style bundle video.
metadata:
  tags: launch, app, mascot, mobile, remotion, video
---

# Make a Launch video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/launch_video_style_guide.md` (read it first). Kit:
`remotion/src/components/launch/kit.tsx`. Template scenes: `templates/launch_video/scenes/`.
Scripts: `scripts/launch_new_video.py`, `scripts/launch_finalize_storyboard.py`.
Only for the Launch style bundle; others have their own skills (`vantage_make_short`, `markets_make_video`,
`promo_make_video`).

## Style Bundle details for the core workflow

- `<style_bundle>` = `launch`.
- **Step 3, brief**: the real app name, mascot (or none), 3 to 5 real features, release status and store.
  Do not copy another brand's name, mascot, copy or screens. Do not invent features or numbers.
- **Step 4, scenes**: brand name and tagline (`finale`, `hook`), mascot name, feature headlines and chips
  (the four feature scenes use `Feature`), widget content. Remove `SampleTag`/sample numbers. If the app has
  no mascot, drop `evolve` and use a phone or icon hero; keep the type system (eyebrow, two-line headline,
  sub).
- **Step 4, narration**: 5 to 12 words per scene. Registry example: "Daily Mascot" gives `daily_mascot`.
- **Step 5, review extras**: only features and numbers the real app has; no other brand's name or mascot.
- **Step 7, pacing**: the finalize script sets 0.2 s buffers and 8-frame fades.
- **Step 8**: the log should say `Resolution: 1080p (1080x1920)`.
- **Step 9, frames**: `fps=1/1.4,scale=216:-1,tile=13x2`, then mid-scene frames larger. Check text is
  inside the safe zone (y 160 to 1500), nothing overlaps (tagline vs wordmark, chips vs phone), headline
  complete when read muted, no sample/placeholder text.

## Pitfalls

- The store pill is not clickable on social platforms: say "link in bio".
