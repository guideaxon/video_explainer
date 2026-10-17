## Vantage Video Template

There are `docs/VIDEO_PRODUCTION_GUIDELINES.md` and `docs/SHORTS.md`, plus a `.claude/skills` folder, but no `CLAUDE.md`. 
I'd use three layers.

**1. A written style guide, for humans and for me**
Add `docs/STYLE_EDITORIAL_LINEART.md`, linked from `VIDEO_PRODUCTION_GUIDELINES.md`. 

It should cover:
- **Look:** the two themes (parchment `#d9ceb4` and navy `#0a1127`), the accent colors, the fonts (Cinzel and IBM Plex Mono), and the HUD (brackets, timeline, labels).
- **Layout:** the 1080x1920 canvas, with the 1660px themed area and the caption band below it.
- **Motion:** line art that draws on, headlines that stagger in, and one accent word per headline.
- **Story structure:** parchment for the problem, a flip to navy for the product, then the loop or features, then the call to action.
- **Copy rules:** about 40 seconds, hook in the first 3 seconds, a specific call to action (never "full breakdown in the description"), and no technical stack.
- **Pitfalls:** all the gotchas from this build.

**2. Reusable code, so the style isn't re-invented each time**
Move `kit.tsx` and the `local()` wrapper out of the Vantage project into a shared place, for example `remotion/src/shorts/editorial/`. Each new video then only writes its six beat scenes. Also fix the generator so it produces this style by default: the prompt in `src/short/custom_scene_generator.py` is what created the empty, emoji-heavy scenes. I'd rewrite it to use this kit.

**3. A project skill, so any future session follows it**
Add a `CLAUDE.md` at the repo root, plus a skill in `.claude/skills/` such as `make-short`. It would hold the workflow I just did: write `source.md`, run script and narration, edit the narration, hand-build the scenes with the kit, render, then review frames. It would also record two Windows notes:
- Set `PYTHONUTF8=1`.
- Put ffmpeg on PATH.

**Known gotchas to record**
- The `claude-sonnet-4-20250514` model is retired, so use `claude-sonnet-5-5`.
- The scenes registry must be `.tsx`, and it needs the `local()` frame wrapper.
- The renderer needs a `projects/<name>/scenes/index.ts` stub, even for shorts.
- Short script and storyboard files don't validate duration. Keep narration to about 70–80 words for 40 seconds.

I'd build all three. This would take 20–30 minutes of edits: the doc, moving the kit to the shared folder, and the skill. The generator-prompt rewrite is the riskiest part, because I'd have to test it against a second video. 

## Markets based template
This clip follows a **financial data-journalism style**, like a market-explainer infographic. The topic is a stock market rally, with the title "BULL RUN — Market Story Nº ##". I'm judging from 40 one-second frames at 170x96, so I can read the structure and colors but not the small text, and I can't judge the audio because there isn't any.

## The theme
- **Subject:** a market story told chart by chart, with a bull mascot as the sign-off ("stay bullish").
- **Two surfaces, alternated:**
  - **Cream "paper"** with faint diagonal hatching, used for the narrative charts. Headers are lowercase serif ("the long road up", "how a rally is built", "who led the charge", "where the money sits", "the drop, the climb back").
  - **Dark navy "terminal"** slides for the live-data moments: the big **+12.4%** NASDAQ number, the fear-o-meter gauge and the "money never sleeps" network graph.
- **Color means something:** green for up, red for down, amber and blue for categories, so color carries the data and is not decoration.
- **Chart-led:** there's a new chart type every ~4 seconds. The types are line, candlesticks with volume, horizontal bars, donut, gauge, treemap heatmap and network graph.
- **Hand-written annotations** in a script font with arrows, like "breakout!", "gap up!", "growth engine!", "uh-oh" and "hold your nerve". They add personality on top of the clean data.
- **Motion:** charts draw themselves on, candles and bars grow in, a counter ticks from +0.0% to +12.4%, and the gauge needle sweeps. Concentric ripple rings mark the title and the mascot, and a ticker tape runs across the opening.
- **Structure:** a title card, then eight or nine short chapters, then a mascot sign-off. It's 16:9 at about 40 seconds.

## How it differs from your first sample
| | Sample 1 (editorial film) | Sample 2 (market explainer) |
|---|---|---|
| Hero | A narrative statement plus line-art illustration | The data chart itself |
| Type | Cinzel caps, one accent word, mono HUD | Lowercase serif headers, tiny sans labels, script annotations |
| Color | Parchment/midnight with a single accent | Semantic green, red, amber and blue |
| Feel | Cinematic and reflective | Informative and playful |
| Format | 16:9 film | 16:9 explainer |

The Vantage style is based on sample 1. Sample 2's ideas that could carry over are the paper-versus-terminal alternation, the hand-written annotations with arrows, and the gauge and big-number readouts, but only for channels that show data.

## Next step
To build this as its own channel, I'd follow the same pattern as Vantage:
- a `<name>_video_style_guide.md`,
- a `remotion/src/components/<name>/` kit with chart primitives,
- `templates/<name>_short/`,
- a skill, and
- an entry in `channel_styles.py` and the `CLAUDE.md` table.

What should this channel be called (for example `markets_`)? Is it 16:9 or vertical, and what content will it cover? I'd also ask for a higher-resolution copy, because I'm inferring fonts and exact colors from a 170-pixel-wide clip.

## 