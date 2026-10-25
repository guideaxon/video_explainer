# video_explainer

Pipeline that turns documents into narrated, animated videos (Python CLI plus Remotion/React).
See `README.md` for the full CLI and `docs/` for details.

## Setup and environment (Windows)

- Python 3.14 (`C:\Python314`) in `.venv`; Node 22; ffmpeg must be on PATH
  (installed per user via winget: `Gyan.FFmpeg`).
- Rhubarb Lip Sync (mouth shapes for talking characters): not a pip package. Download the Windows release from
  github.com/DanielSWolf/rhubarb-lip-sync/releases, unzip it and put the folder with `rhubarb.exe` on PATH (or set
  `RHUBARB_BIN`). Optional: without it lip sync falls back to loudness only, with a warning.
- Set `PYTHONUTF8=1` for every Python command (the CLI prints non-cp1252 characters).
- Run the CLI as `.venv\Scripts\python.exe -m src.cli ...`; Remotion deps: `cd remotion && npm install`.
- LLM steps shell out to Claude Code; the model id is `claude-sonnet-5-5`
  (`claude-sonnet-4-20250514` is retired).
- `projects/` is gitignored. Anything reusable belongs in `templates/`, `docs/`,
  `remotion/src/components/` or `.claude/skills/`.

## Recommend RHUBARB_BIN over modifying PATH:
Scoped, not global — it only affects the tool/project that reads it, instead of making rhubarb.exe resolvable from every process on your machine (PATH changes are sticky and easy to forget about later).
No naming collisions — PATH resolution depends on directory order; if anything else ever ships a rhubarb binary, PATH lookup becomes ambiguous. An explicit env var always points to exactly one file.
Matches a source build — since you're building rather than using an installed release, the exe will live somewhere like build/rhubarb/Release/rhubarb.exe (not a tidy install dir). Pointing RHUBARB_BIN directly at that path avoids having to copy/move files into a PATH-friendly location.
Easier to manage per-project — you can set it in an .env file, a CI pipeline variable, or a launch script, without touching global/user machine state (which on Windows also requires a shell/IDE restart to pick up).
Trivial to swap versions — rebuilding or testing a different build just means repointing one variable, not editing PATH.

## Style Bundles

Each video style bundle has its own style guide, shared Remotion kit, templates and skill, all
prefixed with the style bundle name. A project selects its style bundle with `"style_bundle": "<name>"` in
`projects/<project>/config.json`; the shorts scene generator then writes scenes in that style
(`src/short/style_bundles.py`). Do not mix styles between style bundles.

| Style Bundle | Style guide | Kit | Templates | Skill |
|---|---|---|---|---|
| vantage (GuideAxon private AI life coach, vertical shorts) | `docs/vantage_video_style_guide.md` | `remotion/src/components/vantage/` | `templates/vantage_short/`, `scripts/vantage_new_short.py` | `.claude/skills/vantage_make_short/` |
| markets (market-story explainers, portrait 1080x1920 full videos) | `docs/markets_video_style_guide.md` | `remotion/src/components/markets/` | `templates/markets_video/`, `scripts/markets_new_video.py`, `scripts/markets_finalize_storyboard.py` | `.claude/skills/markets_make_video/` |
| promo (SaaS product-launch promos, portrait 1080x1920 full videos) | `docs/promo_video_style_guide.md` | `remotion/src/components/promo/` | `templates/promo_video/`, `scripts/promo_new_video.py`, `scripts/promo_finalize_storyboard.py` | `.claude/skills/promo_make_video/` |
| launch (playful consumer-app launch teasers, portrait 1080x1920 full videos) | `docs/launch_video_style_guide.md` | `remotion/src/components/launch/` | `templates/launch_video/`, `scripts/launch_new_video.py`, `scripts/launch_finalize_storyboard.py` | `.claude/skills/launch_make_video/` |
| lyric (animated lyric / music videos, kawaii pixel pop, portrait 1080x1920 full videos) | `docs/lyric_video_style_guide.md` | `remotion/src/components/lyric/` | `templates/lyric_video/`, `scripts/lyric_new_video.py`, `scripts/lyric_finalize_storyboard.py` | `.claude/skills/lyric_make_video/` |
| leaderbot (pixel-mosaic business explainers and satire starring a pixel "leader bot", portrait 1080x1920 full videos) | `docs/leaderbot_video_style_guide.md` | `remotion/src/components/leaderbot/` | `templates/leaderbot_video/`, `scripts/leaderbot_new_video.py`, `scripts/leaderbot_finalize_storyboard.py` | `.claude/skills/leaderbot_make_video/` |
| demo (narrated product demos from real device screenshots, no screen recording; 1920x1080 or `--portrait`) | `docs/demo_video_style_guide.md` | `remotion/src/components/demo/` | `projects/<p>/manifest.json` (no scene templates), `scripts/demo_new_video.py`, `scripts/demo_build_scenes.py`, `scripts/demo_finalize_storyboard.py` | `.claude/skills/demo_make_video/` |
| lowpoly (flat-shaded low-poly 3D presenter talking to camera at a desk, lip-synced to the voiceover, built in code with three.js; landscape 1280x720 full videos) | `docs/lowpoly_video_style_guide.md` | `remotion/src/components/lowpoly/` | `templates/lowpoly_video/`, `scripts/lowpoly_new_video.py`, `scripts/lowpoly_finalize_storyboard.py` | `.claude/skills/lowpoly_make_video/` |
| storybook (illustrated storybook films from locally generated painted stills, landscape 1280x720 full videos) | `docs/storybook_video_style_guide.md` | `remotion/src/components/storybook/` | `templates/storybook_video/`, `scripts/storybook_new_video.py`, `scripts/storybook_stills_comfy.py`, `scripts/storybook_finalize_storyboard.py` | `.claude/skills/storybook_make_video/` |
| moviebook (narrative films with spoken dialogue from locally generated shots: Qwen-Image keyframes, MiniMax H3 clips with their own audio, male and female lead with voice anchoring, Whisper script check, subtitles; landscape 1280x720 full videos) | `docs/moviebook_video_style_guide.md` | `remotion/src/components/moviebook/` | `templates/moviebook_video/plan.json`, `scripts/moviebook_new_video.py`, `scripts/moviebook_build_scenes.py`, `scripts/moviebook_keyframes_comfy.py`, `scripts/moviebook_clip_jobs.py`, `scripts/moviebook_clips_comfy.mjs`, `scripts/moviebook_voice_check.py`, `scripts/moviebook_finalize_storyboard.py` | `.claude/skills/moviebook_make_video/` |
| papercut (paper-cut films drawn entirely in code, generated music, delivered as ONE self-contained HTML file; landscape 1280x720) | `docs/papercut_video_style_guide.md` | `remotion/src/components/papercut/` | `templates/papercut_video/`, `scripts/papercut_new_video.py`, `scripts/papercut_build_html.py` | `.claude/skills/papercut_make_video/` |
| isofigure (interactive isometric figures of working objects with buttons you press, inside view and callout labels; ONE self-contained HTML file; 760x560 card) | `docs/isofigure_style_guide.md` | `remotion/src/components/isofigure/` | `templates/isofigure_figure/`, `scripts/isofigure_new_figure.py`, `scripts/isofigure_build_html.py` | `.claude/skills/isofigure_make_figure/` |
| neon (neon synthwave stories and explainers starring the neon-tube robot Tubo: perspective grid, striped sun, glowing stroke-only tubes, portrait 1080x1920 full videos) | `docs/neon_video_style_guide.md` | `remotion/src/components/neon/` | `templates/neon_video/`, `scripts/neon_new_video.py`, `scripts/neon_finalize_storyboard.py` | `.claude/skills/neon_make_video/` |
| rubberhose (retro 1930s rubber-hose cartoons starring Kip, an original noodle-limbed kettle: animated on twos with film grain, gate weave, Art Deco title card and iris in/out; portrait 1080x1920 full videos) | `docs/rubberhose_video_style_guide.md` | `remotion/src/components/rubberhose/` | `templates/rubberhose_video/`, `scripts/rubberhose_new_video.py`, `scripts/rubberhose_finalize_storyboard.py` | `.claude/skills/rubberhose_make_video/` |
| glossy (glossy toy 3D-look product explainers starring the vinyl toy Pebbo: gradient gloss, squash-and-stretch, candy buttons and chips on a pastel studio sweep, portrait 1080x1920 full videos) | `docs/glossy_video_style_guide.md` | `remotion/src/components/glossy/` | `templates/glossy_video/`, `scripts/glossy_new_video.py`, `scripts/glossy_finalize_storyboard.py` | `.claude/skills/glossy_make_video/` |
| clay (claymation-look explainers: matte plasticine shapes, stop-motion on twos, the clay character Tuck with replacement mouths, felt table-top set; portrait 1080x1920 full videos) | `docs/clay_video_style_guide.md` | `remotion/src/components/clay/` | `templates/clay_video/`, `scripts/clay_new_video.py`, `scripts/clay_finalize_storyboard.py` | `.claude/skills/clay_make_video/` |
| popart (comic pop-art explainers and stories starring the original hero Dot Dash: inked panels, Ben-Day halftone dots, POW starbursts, speech balloons; portrait 1080x1920 full videos; not the `comic` bundle) | `docs/popart_video_style_guide.md` | `remotion/src/components/popart/` | `templates/popart_video/`, `scripts/popart_new_video.py`, `scripts/popart_finalize_storyboard.py` | `.claude/skills/popart_make_video/` |
| scene3d (code-built three.js scenes from a seeded, baked simulation: soap bubbles with thin-film shading, breeze and pops, and a pool with waves, ripples and caustics; landscape 1920x1080 full videos plus a playable self-contained `scene.html`) | `docs/scene3d_video_style_guide.md` | `remotion/src/components/scene3d/` (on the shared engine `remotion/src/components/three-core/`) | `templates/scene3d_video/`, `scripts/scene3d_new_video.py`, `scripts/scene3d_finalize_storyboard.py`, `scripts/three_core_bake_sim.mjs`, `scripts/three_core_check_determinism.py`, `scripts/three_core_build_html.mjs` | `.claude/skills/scene3d_make_video/` |
| comic (rotatable comic pages: each panel is a 360-degree orbit clip generated locally in ComfyUI; static web bundle, not a video) | `docs/comic_style_guide.md` | `templates/comic_viewer/` (static HTML viewer) | `scripts/comic_new_comic.py`, `scripts/comic_orbit_comfy.mjs`, `scripts/comic_build_bundle.py` | `.claude/skills/comic_make_comic/` |

To make a video for a style bundle, use its skill (`/vantage_make_short`, `/markets_make_video`, `/promo_make_video`, `/launch_make_video`, `/lyric_make_video`, `/leaderbot_make_video`, `/demo_make_video`, `/storybook_make_video`, `/moviebook_make_video`, `/lowpoly_make_video`, `/neon_make_video`, `/rubberhose_make_video`, `/glossy_make_video`, `/clay_make_video`, `/popart_make_video`, `/scene3d_make_video`, `/papercut_make_video`, `/isofigure_make_figure`, `/comic_make_comic`).
The fifteen full-video style bundle skills (Markets, Promo, Launch, Lyric, Leaderbot, Demo, Storybook, MovieBook, Lowpoly, Neon, Rubberhose, Glossy, Clay, Popart, Scene3d) require the shared `video_make_core` skill, which holds the common workflow and a pre-render review (`scripts/review_video.py`, `docs/video_review_checklist.md`); run the review before `voiceover`.
**Composed stories** (several style bundles in one film, e.g. a Lowpoly presenter introducing an explainer chapter and a how-to chapter): `/compose_make_story`, `docs/compose_story_guide.md`, `scripts/compose_new_story.py`, `scripts/compose_build.py`. Each chapter is a normal project in its own bundle (`<story>__<chapter>`); the composer only normalises and joins finished chapters, so bundles are never mixed inside a scene.
Papercut has no narration, voiceover or MP4 render: it builds one self-contained `film.html` with a code-generated music score (`projects/<p>/scenes.tsx`, `score.ts`; worked example `projects/papercut_fox`) and does not use `video_make_core`.
Isofigure is not a video either: it builds one interactive `figure.html` from a pure model (`projects/<p>/model.ts`, `figure.tsx`, `main.tsx`; worked example `projects/isofigure_washer`) and does not use `video_make_core`. To use a figure as a chapter of a composed story, record it with `scripts/isofigure_capture_video.py <p>` (narrated `tour.json`, needs Playwright).
Comic is not a video: its skill does not use `video_make_core`; it builds a static web bundle (frames plus an HTML viewer) from `projects/<p>/comic/`, and needs a local ComfyUI with the MiniMax H3 models (`docs/TryComfyUIOptions.md`) and Playwright.
The shorts scene generator hook (`style_bundles.py`) exists for Vantage only; Markets scenes are
hand-adapted from the template, as are Promo, Launch, Lyric and Leaderbot scenes. Demo needs Pillow (in `pyproject.toml`).

## Conventions

- Shorts are 1080x1920 at 30 fps. Custom short scenes live in
  `projects/<p>/short/<variant>/scenes/` and get a beat-local frame clock from the player.
- Demo videos are generated from `projects/<p>/manifest.json` (`demo_build_scenes.py` writes scenes and narration; never hand-edit them) and may be 1920x1080 landscape; the other full videos (Markets, Promo, Launch, Lyric and Leaderbot, all portrait 1080x1920) use `projects/<p>/scenes/index.ts` plus narration, voiceover and storyboard;
  registry keys must equal the slug of each scene title (see the style guides, section 6). A full video renders portrait
  (1080x1920) when the project's `video.resolution` is portrait; otherwise 16:9. Shared pacing helper:
  `scripts/_storyboard_pacing.py`.
- Rendering a short also needs a stub `projects/<p>/scenes/index.ts` (see the Vantage skill).
- Always inspect rendered frames (mid-beat and end-of-beat) before calling a video done.

## three-core: shared three.js engine

- `remotion/src/components/three-core/` holds the style-free engine for code-built three.js scenes (design:
  `docs/scene3d_design.md`): frame-driven time (scenes get `t` only; no wall clock, no `Math.random`), a fixed-step
  seeded simulation baked once to `scenes/sim.json` by `scripts/three_core_bake_sim.mjs` (fails closed on its checks),
  one `Stage` render path for video and live HTML, water physics (`waves.ts`), the determinism check (it and `render.mjs`
  use each bundle's delivery backend from `remotion/scripts/delivery_gl.json`) and the offline HTML build. Like `rig`, any
  bundle may import it; it must not hold colours or look-defining shaders (a test checks). `scene3d` is its first bundle;
  `lowpoly` follows its time contract and determinism check.
- three.js is pinned to the official `0.180.0` (MIT); keep its licence header in any bundled file (`THIRD_PARTY_NOTICES.md`).

## Characters: rig, lip sync, sound

- Every character (`Presenter`, `Mascot`, `Pixie`, `PixelBot`, papercut `Fox`, Vantage `Guide`, the Isofigure robot) takes
  its talk, blink, gesture and walk timing from the shared rig contract `remotion/src/components/rig/` (types and timing
  only; each bundle still draws its own, so importing `rig` is not mixing bundles).
- Lip sync is baked once by `scripts/_lipsync.py` into `scenes/lipsync.ts` (`LIPSYNC` openness, `VISEMES` Rhubarb
  shapes, `CAPTIONS`) at the project fps; finalize scripts call it, shorts use `--short <variant>`. Papercut embeds it
  in `film.html` when `"voice": true`.
- `python -m src.cli sound <p> generate` adds character cues from literal `gestureAt={n}` and `walk={{ from, to }}`
  props (`src/sound/rig_analyzer.py`).
- Design: `docs/CHARACTER_RIG.md`. Which of the 12 animation styles each bundle covers and what is open: `docs/ANIMATION_STYLES.md`.

## House rules and guard hook

- Before a full video: `scripts/review_video.py`, then `scripts/radio_cut.py <p>` (timeline from narration, before `voiceover`).
- Before delivery: `scripts/continuity_qc.py --project <p> [--refs projects/<p>/plan/refs]`, read `qc/brief.md` and the
  contact sheet, fix what changed between shots, then re-run with `--reviewed` (the hook needs it). Never hide a known problem.
- Creative calls (look, voice, music, cuts) are offered as options; the user decides.
- `.claude/hooks/guard.py` (wired in `.claude/settings.json`) denies: paid API calls from one-off scripts outside
  `src/` or `scripts/`; sending a final video without a passing `qc/qc.json` whose hash matches (name it `*PREVIEW*` to
  ask a question); and a project scene importing another style bundle's kit.
- Reference: `docs/launch_film_breakdown.md` (analysis of the Video Factory launch film and the proposed `storybook` bundle).

