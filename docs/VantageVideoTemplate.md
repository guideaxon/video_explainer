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

## Compare with PostAll - https://postall.live/evidence/   https://github.com/qingxuantang/postall
PostAll and video_explainer aren't direct competitors. They cover different stages of content production, so the comparison is mostly about where each one is strong.

## What each one is
- **PostAll** is a text-and-image content automation pipeline. It generates posts from a brand voice and content pillars. A second AI, the "Director", grades them. Posts that pass are scheduled and published to Twitter/X, LinkedIn, Instagram, Pinterest, Threads and Xiaohongshu. It runs as a daemon and has an RLHF-style feedback loop.
- **video_explainer** (ours) turns documents into narrated, animated videos using Python and Remotion/React. We have five channel styles (vantage, markets, promo, launch, lyric), each with a style guide, component kit, templates and skill.

## Where PostAll is stronger
- **Publishing:** it goes all the way to the platform APIs. We stop at a rendered file.
- **Automated quality gate:** the Director checks brand fit, factual accuracy, fabricated testimonials and compliance. It returns per-issue fixes, not just a score. We rely on manual frame inspection.
- **Feedback loop:** engagement feeds back into later generation. We have nothing like it.
- **Timeliness checks:** it catches stale references. We have no equivalent.
- **Operations:** scheduling, rate limiting, crash recovery, a Telegram bot and Docker packaging.
- **Agent-friendly CLI:** `postall-agent` returns JSON, and skill files are discoverable over HTTP.
- **Multiple LLM providers:** Claude, GPT-4 and Gemini. We only shell out to Claude Code.

## Where we are stronger
- **Video:** PostAll doesn't produce video at all. Ours is a full pipeline of storyboard, narration, voiceover and Remotion rendering.
- **Craft and consistency:** each channel has its own style guide, kit and templates, and styles are never mixed. PostAll's per-brand control is mostly a config file plus prompts.
- **Visual verification:** we inspect rendered frames at mid-beat and end-of-beat. PostAll's Director only reviews content for quality, not rendered output.
- **Deterministic output:** templates and kits give predictable, on-brand results. Pure LLM generation drifts more.
- **Code-driven animation:** React components are reusable and testable, and they give precise timing control.

## Cons of each
- **PostAll:**
  - Its output is shallow, with text plus a Gemini image per post.
  - It needs API keys for every platform. Instagram needs a Meta Business setup.
  - Region restrictions can block some providers.
  - Timeliness depends on a curated list.
  - The page gives no detail on how the Director scores posts or how the RLHF loop works, so we have no evidence of how well it works in practice.
- **Ours:**
  - Heavy manual steps. Markets, Promo, Launch and Lyric scenes are hand-adapted from templates.
  - Windows-specific setup (Python 3.14, ffmpeg via winget, `PYTHONUTF8`).
  - No publishing, scheduling or analytics.
  - No automated quality or fact check.
  - One LLM backend.
  - Rendering is slow and compute-heavy.
  - `projects/` is gitignored, so nothing is versioned except templates.

## What we could borrow
1. **A Director-style review step** on narration and storyboard, before rendering. It would check brand fit, claims, fabricated stats and stale references, and return per-issue fixes.
2. **A publish stage** for Shorts, Reels and TikTok, with scheduling and a retry-safe queue. Only worth building if distribution is a goal.
3. **A JSON agent CLI**, so other agents can drive our pipeline.
4. **A feedback loop** that feeds video performance back into scene generation.

I only read the repo's README page, not its source, so the Director and RLHF details are unverified. I can look at the code if you want those details.

I read the actual source (the Director and the learning module) and the live evidence page. In short, the scoring is a prompt plus a weighted average, the learning loop is only partly wired up, and I found no evidence it works.

## How the Director scores posts
- **Who scores:** an LLM does, through a prompt in `director.py`. It tries Claude CLI, then Claude API, then Gemini. If none is available, it falls back to a regex rule-based scorer.
- **Criteria:** it scores 10 criteria from 0 to 1. They are brand voice, platform fit, quality, engagement potential, risk, factual accuracy, truth, relevance, strategic fit and GEO (optimizing for AI-search discovery).
- **Composite:** a hardcoded weighted average, scaled to 0–10. GEO carries 20%, brand voice 15%, and most others 5–10%.
- **Decision thresholds:** 8.5 or above is approve and schedule. 8.0–8.5 is approve with notes. 6.0–8.0 is request revision. Below 6.0, it goes to a human.
- **Hard overrides:**
  - Risk above 0.7 escalates to a human.
  - Factual accuracy below 0.5 rejects the post.
  - A length gate catches overlong posts.
- **Fabricated testimonials:** the prompt tells the model to give truth a score of 0 if a post has a user story with no referenced source material. That is a sensible check, but it only works if the model follows the prompt.
- **Factual accuracy is lenient on purpose.** The prompt says not to penalize plausible claims the model can't verify, and to assume the creator has the source material. So it checks plausibility and internal consistency, not truth.
- **Weak spots:**
  - If the model's reply can't be parsed, the Director substitutes default scores of about 0.7 instead of failing. That can quietly produce passable-looking numbers.
  - The fallback rule-based scorer uses keyword matching.
  - Some patterns look tuned to one original brand (e.g. "#1 planner", "link in bio").
  - The code comments mention thresholds being "raised" and tuned to a particular workflow, so the 8.5 cutoff looks hand-picked.

## How the RLHF loop works
It is a rule-scoring system, not real RLHF, and no model is trained.
1. A SQLite library holds text "rules" (writing guidelines).
2. At generation time it picks the top-scoring rules, plus a 15% share of low-confidence rules for exploration. These are injected into the prompt.
3. After a post, a feedback signal from -1 to +1 is added to the score of every rule used on that post.
4. Confidence is `applications × 0.1`, capped at 1.0.

Problems:
- **Only one signal is live: Telegram ratings from a human.** Engagement feedback is a `TODO` stub that returns `None`. Director-score feedback is also a stub, and both are commented out in the aggregator.
- **No credit assignment.** Every rule applied to a post gets the same signal, so good and bad rules are indistinguishable until there is a lot of data.
- **Scores grow without bound.** Score is a running sum, so rules that have been used more drift upward. It isn't normalized.
- Because the Director is not connected to the loop, the quality gate and the learning loop are separate systems.
- **It is mislabeled.** It's a rules bandit over prompt snippets.

## How well it works in practice
- **The evidence page shows no outcomes.** It lists 25 LinkedIn posts from about 7 weeks, all marked "approve", with scores from 8.6 to 9.0 (mean about 8.8).
- **Nothing is shown on whether the posts did well.** There are no impressions, likes, clicks or follower growth. There are no rejected posts either, so we can't tell what the gate filters out.
- **Scores can't be checked.** The same model family writes and grades the posts, with no human or baseline comparison. A narrow 8.6–9.0 band is what you'd expect when a model grades its own output.
- **The repo has no validation.** It has two test files, both for the length gate, and nothing that checks Director scores against anything.
- **Claims on the page can't be verified.** The X/Twitter posts mentioned don't appear in the timeline. The page was generated well after the newest post, with no explanation.

## What this means for us
- The Director idea is worth copying as a pre-render review of narration and storyboard: per-issue fixes with location, original text and replacement, plus the fabricated-claims check.
- Don't copy the weighted composite or the 8.5 threshold. Hard pass/fail checks (fabricated stats, banned claims, length) are more trustworthy than a self-graded average.
- If we ever add a feedback loop, it needs real platform metrics, normalized scores and a baseline. PostAll's version has none of these yet.

I cloned the repo into a scratch folder, not into our project. I didn't run any of its code.