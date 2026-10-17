# Markets Channel: Video Style Guide

Style for the **Markets** channel: **portrait 1080x1920 (9:16, mobile-first)** market-story explainers about rallies, sectors,
sentiment and money flows. Other channels (for example Vantage) have their own guide, kit and
skill; do not mix styles.

Derived from the reference clip `projects/samples/2/CMAF_96.mp4` ("BULL RUN", Market Story Nº ##),
which is only 170x96 px and 16:9; the channel re-lays that look out for phones. Structure, surfaces, chart types and colour logic are read from it directly;
fonts and exact hex values are close approximations (marked below).

Implementation: kit `remotion/src/components/markets/kit.tsx`, template scenes
`templates/markets_video/scenes/`, scaffold `scripts/markets_new_video.py`, pacing
`scripts/markets_finalize_storyboard.py`, workflow skill `.claude/skills/markets_make_video/`.

## 1. Look

Data journalism with personality: the chart is the hero, a hand-written note adds the human voice.

| Token | Paper (narrative charts) | Terminal (live data moments) |
|---|---|---|
| Surface | cream `#f4ecc8`, faint 135° hatching, soft vignette | navy `#0b1230`, fine dot grid |
| Ink | `#1c2340` | `#e8ecf8` |
| Up / Down | `#1f9d55` / `#d64545` | `#2ee08a` / `#ff5d5d` |
| Accents | amber `#e0a82e`, blue `#3b6fd8` | amber `#f4c14e`, blue `#6f9cff` |

- Alternate surfaces. **Paper** for explaining (trends, composition, comparisons). **Terminal** for
  "now" data: today's move, sentiment gauge, global flows. Never two terminal scenes in a row
  more than twice; the contrast is the rhythm.
- **Colour is data**: green up, red down, amber/blue for categories. Do not use green or red for
  decoration.
- Fonts (approximated from the reference): **Libre Baskerville** lowercase chapter headers,
  **Playfair Display 900** for the title card and sign-off, **Inter** for labels and numbers,
  **Caveat** for hand-written annotations. Loaded through `@remotion/google-fonts` (needs internet
  on first render).
- Annotations: one to two per chart, in Caveat, in blue (red for bad news), with a curved arrow
  drawn onto the data point: "breakout!", "gap up!", "growth engine!", "uh-oh", "hold your nerve",
  "risk on".
- Title card: ticker tapes top and bottom, big serif "BULL RUN", rippling concentric rings.
  Sign-off: the bull mascot (line art that fills in) and "stay bullish".

## 2. Layout (1080 x 1920, portrait)

- The project config must be portrait (`video.resolution` 1080x1920); the `render` command then uses
  the 9:16 presets (4k = 2160x3840, 1440p, 1080p, 720p, 480p). `scripts/markets_new_video.py` sets it.
- Chapter header top-left (lowercase serif, 60 px, may wrap to two lines), small caps metadata under
  it (22 px), footer `MARKET STORY Nº xx · <source>` at y 1520. Margins 80 px.
- One chart per scene in the standard box (`CHART`: x 160, y 380, 820 x 820), annotations inside or
  just below it. Bars, heatmap and donut use the full width (x 80 to 1000).
- **Safe zone:** keep content inside y 160 to 1500 and x 60 to 1020; platform UI covers the bottom
  ~400 px and the right edge.
- Phone-readable sizes: axis and tick labels 22 px, value labels 28 to 30 px, annotations 58 to 64 px,
  big numbers 230 px, title 230 px stacked on two lines ("BULL / RUN"). Nothing below 20 px.
- Burned-in captions are not part of this pipeline; make each chapter header a complete thought.

## 3. Motion

- Charts always build themselves: lines draw on, candles grow one by one, bars extend, donut
  sweeps, gauge needle sweeps with overshoot, counters tick up, heatmap tiles pop in.
- Annotations arrive after the data finishes (about 60% into the scene).
- Ambient motion: ticker tape scrolls, rings expand, dots travel along network links.
- Transitions are **short plain fades (12 frames)**, set by `scripts/markets_finalize_storyboard.py`.
  The pipeline's default 1.5 s cinematic blur and light-leak transitions are wrong for this style.

## 4. Story structure (about 45 to 60 s, 11 scenes of 3 to 6 s)

1. **Title** ("BULL RUN")
2. **The long run**: long-horizon line chart, one breakout annotation
3. **How it is built**: candles and volume
4. **Today's number**: terminal, big ticking percentage, a one-word read ("risk on")
5. **Who led**: horizontal bars by sector (sorted, red for losers)
6. **Where money sits**: donut allocation
7. **Sentiment**: fear/greed gauge
8. **Heatmap**: the big names today
9. **Money never sleeps**: global network (terminal)
10. **The drop and the climb back**: drawdown and recovery, "hold your nerve"
11. **Sign-off**: mascot, "stay bullish", disclaimer

Drop or reorder chapters to fit the story; keep a title, at least one terminal moment and a sign-off.

## 5. Copy and data rules

- Narration 8 to 14 words per scene, one sentence of insight per chart. Plain language.
- **Never invent numbers.** The template data is SAMPLE data (footer says "SAMPLE DATA"). Replace
  every series, ticker and percentage with real, sourced data, and change the footer source to the
  real source and date. Always keep a "not financial advice" line on the sign-off.
- Percentages: sign always shown (`+4.2%`, `-0.6%`), one decimal.

## 6. Pipeline notes (full video, not shorts)

- Registry keys in `projects/<p>/scenes/index.ts` must equal the slug of the scene title
  (`_title_to_scene_key` in `src/cli/main.py`: leading "The/A/An" dropped, punctuation removed).
  Component names must end in `Scene` and keys must be unquoted (regex-parsed).
- Storyboard order: `voiceover`, then `scripts/markets_finalize_storyboard.py` (replaces the
  `storyboard` step), then `render`.
- Edge TTS adds about 0.9 s of silence per clip and the player adds 1.0 s per scene; without the
  finalize script a 52 s narration becomes a 73 s video with about 2 s of dead air per scene.
- Resolution comes from the project config: portrait 1080x1920 gives a 1080x1920 render; a landscape
  config would render 16:9 but the kit's coordinates are portrait-only.
- Output loudness is about -20 LUFS. For social upload normalise:
  `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final_social.mp4`.
- The shorts generator hook (`src/short/channel_styles.py`) is Vantage-only; this channel uses the
  full-video path and hand-adapted template scenes. The scene generator is not wired to this style.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (markets style)

One Remotion scene per chapter, **1080x1920 portrait**, built only from the markets kit:
`import { MScene, Layer, LineChart, CandleChart, HBars, Donut, Gauge, Heatmap, BigNumber, Network, Annotation, Ticker, Ripples, BullHead, Title, Kicker, THEMES } from "@remotion-components/markets/kit";`
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export). Wrap everything in
`<MScene theme="paper"|"terminal" chapter="lowercase chapter title" meta="UPPERCASE SOURCE">` and put
charts inside `<Layer>`. Use ONE chart per scene with real data passed as props. Add one or two
`Annotation`s after the data has drawn (`from` about 60% into the scene). Colours come from the kit
(green up, red down). Never invent data; copy numbers from the provided source.
<!-- LLM-BRIEF-END -->
