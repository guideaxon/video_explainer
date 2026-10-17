---
name: markets_make_video
description: Produce a vertical (1080x1920, mobile-first) market-story explainer video for the Markets channel (charts, sectors, sentiment, money flows) in the Markets data-journalism style, from the template scenes. Use when asked to make or restyle a Markets channel video.
metadata:
  tags: markets, finance, charts, remotion, video
---

# Make a Markets video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the channel details below.
Do not continue from this file alone.

Style source of truth: `docs/markets_video_style_guide.md` (read it first). Kit:
`remotion/src/components/markets/kit.tsx`. Template scenes: `templates/markets_video/scenes/`.
Scripts: `scripts/markets_new_video.py`, `scripts/markets_finalize_storyboard.py`.
Only for the Markets channel; do not use it for Vantage (see `vantage_make_short`).

## Channel details for the core workflow

- `<channel>` = `markets`.
- **Step 3, gather real data** for every chart you keep (series, OHLC, sector moves, allocation, sentiment
  value, tickers) with a source and date. Never invent numbers. Footer source and date must be real.
- **Step 4, narration**: 8 to 14 words of insight per scene. Keep one chart per scene. Keep a title, at
  least one terminal moment and a sign-off with a "not financial advice" line.
  Registry example: "The Long Road Up" gives `long_road_up`.
- **Step 5, review extras**: every chart annotation and percentage matches the gathered data (sign shown,
  one decimal); no "SAMPLE DATA" footer left; the disclaimer is on the sign-off.
- **Step 7, pacing**: the finalize script sets 0.35 s buffers and 12-frame fades.
- **Step 9, frames**: `fps=1/2.4,scale=400:-1,tile=6x4`. Check annotations sit on the right data point,
  labels do not overlap, charts finish before the scene ends, SAMPLE footer text is gone.

## Adding a chart type

Add a data-driven component to the kit (props in, geometry inside, draw-on animation, colours from
`useTheme()`), then a template scene using it, then register it in `templates/markets_video/scenes/index.ts`
and `scripts/markets_new_video.py` (`SAMPLE_SCENES`); `tests/test_markets_template.py` checks they agree.
