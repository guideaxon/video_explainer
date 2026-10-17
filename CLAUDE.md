# video_explainer

Pipeline that turns documents into narrated, animated videos (Python CLI plus Remotion/React).
See `README.md` for the full CLI and `docs/` for details.

## Setup and environment (Windows)

- Python 3.14 (`C:\Python314`) in `.venv`; Node 22; ffmpeg must be on PATH
  (installed per user via winget: `Gyan.FFmpeg`).
- Set `PYTHONUTF8=1` for every Python command (the CLI prints non-cp1252 characters).
- Run the CLI as `.venv\Scripts\python.exe -m src.cli ...`; Remotion deps: `cd remotion && npm install`.
- LLM steps shell out to Claude Code; the model id is `claude-sonnet-5-5`
  (`claude-sonnet-4-20250514` is retired).
- `projects/` is gitignored. Anything reusable belongs in `templates/`, `docs/`,
  `remotion/src/components/` or `.claude/skills/`.

## Channels

Each video channel has its own style guide, shared Remotion kit, templates and skill, all
prefixed with the channel name. A project selects its channel with `"channel": "<name>"` in
`projects/<project>/config.json`; the shorts scene generator then writes scenes in that style
(`src/short/channel_styles.py`). Do not mix styles between channels.

| Channel | Style guide | Kit | Templates | Skill |
|---|---|---|---|---|
| vantage (GuideAxon private AI life coach, vertical shorts) | `docs/vantage_video_style_guide.md` | `remotion/src/components/vantage/` | `templates/vantage_short/`, `scripts/vantage_new_short.py` | `.claude/skills/vantage_make_short/` |
| markets (market-story explainers, portrait 1080x1920 full videos) | `docs/markets_video_style_guide.md` | `remotion/src/components/markets/` | `templates/markets_video/`, `scripts/markets_new_video.py`, `scripts/markets_finalize_storyboard.py` | `.claude/skills/markets_make_video/` |
| promo (SaaS product-launch promos, portrait 1080x1920 full videos) | `docs/promo_video_style_guide.md` | `remotion/src/components/promo/` | `templates/promo_video/`, `scripts/promo_new_video.py`, `scripts/promo_finalize_storyboard.py` | `.claude/skills/promo_make_video/` |
| launch (playful consumer-app launch teasers, portrait 1080x1920 full videos) | `docs/launch_video_style_guide.md` | `remotion/src/components/launch/` | `templates/launch_video/`, `scripts/launch_new_video.py`, `scripts/launch_finalize_storyboard.py` | `.claude/skills/launch_make_video/` |
| lyric (animated lyric / music videos, kawaii pixel pop, portrait 1080x1920 full videos) | `docs/lyric_video_style_guide.md` | `remotion/src/components/lyric/` | `templates/lyric_video/`, `scripts/lyric_new_video.py`, `scripts/lyric_finalize_storyboard.py` | `.claude/skills/lyric_make_video/` |

To make a video for a channel, use its skill (`/vantage_make_short`, `/markets_make_video`, `/promo_make_video`, `/launch_make_video`, `/lyric_make_video`).
The shorts scene generator hook (`channel_styles.py`) exists for Vantage only; Markets scenes are
hand-adapted from the template, as are Promo, Launch and Lyric scenes.

## Conventions

- Shorts are 1080x1920 at 30 fps. Custom short scenes live in
  `projects/<p>/short/<variant>/scenes/` and get a beat-local frame clock from the player.
- Full videos (Markets, Promo, Launch and Lyric, all portrait 1080x1920) use `projects/<p>/scenes/index.ts` plus narration, voiceover and storyboard;
  registry keys must equal the slug of each scene title (see the channel style guides, section 6). A full video renders portrait
  (1080x1920) when the project's `video.resolution` is portrait; otherwise 16:9. Shared pacing helper:
  `scripts/_storyboard_pacing.py`.
- Rendering a short also needs a stub `projects/<p>/scenes/index.ts` (see the Vantage skill).
- Always inspect rendered frames (mid-beat and end-of-beat) before calling a video done.
