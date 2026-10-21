---
name: promo_make_video
description: Produce a vertical (1080x1920, mobile-first) SaaS product-launch promo video for the Promo style bundle (kinetic headlines, glass UI mockups, gradient stats) from the template scenes. Use when asked to make or restyle a Promo style bundle video.
metadata:
  tags: promo, saas, product-launch, mobile, remotion, video
---

# Make a Promo video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/promo_video_style_guide.md` (read it first). Kit:
`remotion/src/components/promo/kit.tsx`. Template scenes: `templates/promo_video/scenes/`.
Scripts: `scripts/promo_new_video.py`, `scripts/promo_finalize_storyboard.py`.
Only for the Promo style bundle; other style bundles have their own skills (`vantage_make_short`, `markets_make_video`).

## Style Bundle details for the core workflow

- `<style_bundle>` = `promo`.
- **Step 3, brief**: gather the real product name, one-line promise, 3 to 6 features, and any proof
  (numbers with a source). Do not copy another brand's copy, numbers or screens.
- **Step 4, scenes**: brand name and address (`logo_reveal`, `sign_off`), headlines, mock content, chart
  data; remove `SampleTag` only where the numbers are real and sourced. Keep hook, reveal, 3+ features, a
  proof scene, CTA and sign-off.
- **Step 4, narration**: 4 to 10 words per scene. Registry example: "The Hook" gives `hook`.
- **Step 5, review extras**: no invented proof (customers, results, numbers) and no leftover placeholder
  brand or `lumenstage.example` address.
- **Step 7, pacing**: the finalize script sets 0.25 s buffers and 10-frame fades.
- **Step 8**: the log should say `Resolution: 1080p (1080x1920)`.
- **Step 9, frames**: `fps=1/2.2,scale=240:-1,tile=10x3`, then mid-scene frames at full size. Check text is
  inside the safe zone (y 160 to 1500), no overlaps, headline complete when read muted, SAMPLE/placeholder
  text gone.

## Pitfalls

- Buttons are not clickable on TikTok; the sign-off should point to "link in bio".
