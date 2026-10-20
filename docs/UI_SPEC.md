# Pipeline UI: v1 spec

Status: draft for review. Nothing is built yet.

## Build status

- **Backend: built** in `ui/server/` (step table, status from files, job runner with live logs, API).
  Run it with `.venv\Scripts\python.exe -m ui.server` (needs `pip install -e ".[ui]"`); API docs at
  `http://127.0.0.1:8765/api/docs`. Tests: `tests/ui/`.
- Added beyond this spec: status `done` for ungated steps (storyboard, review), a `supported` flag
  (Vantage projects are shown but not runnable), and `ui/server/verify.py` as the step 8 check.
- **Frontend: thin slice built** in `ui/web/` (Vite, React, TypeScript). Home (prompt, channel cards,
  typed or uploaded Markdown, environment strip, project list), the project overview with the stepper,
  a step panel (run, regenerate, approve, cancel, live log, JSON editor for script and narration), the
  source editor, and the Render step with a video player. Build with `cd ui\web && npm install &&
  npm run build`; then `python -m ui.server` serves it at `http://127.0.0.1:8765`. For development run
  `npm run dev` (port 5173, proxies `/api`).
- **Not yet built:** Markdown preview in the document editor, PDF and URL import, scene previews with
  the Remotion Player (Screen 5), the storyboard timeline (Screen 7), settings screen (Screen 9), a
  jobs history screen (Screen 10), and the treatment step.

## 1. Goal and scope

A local web app that takes a user from "one-line idea or source document" to a rendered video, one
reviewable step at a time. It is a wrapper over the existing `python -m src.cli` commands and the
`projects/<p>/` folder. It does not replace the CLI and adds no second source of truth.

In scope for v1:
- Single user, runs on their own machine (`localhost`), no accounts.
- Create or pick a project, pick a channel, run each pipeline step, review and edit its output, approve.
- Live progress and logs for the slow steps (voiceover, render).
- Preview of scenes and the final video.

Out of scope for v1: hosting, multi-user, cost dashboards, editing React scene code in the browser,
generated-video (diffusion) clips.

## 2. Principles

1. **Files are the state.** A step is "done" when its output file exists and is newer than its input.
   The UI reads the project folder; the CLI and the UI never disagree.
2. **Human gate before every slow or costly step.** Voiceover and render are never started by a
   side effect; the user presses a button on a screen that shows what will be used.
3. **Every step is re-runnable.** Regenerate one scene or one narration without redoing the rest.
4. **Errors show the real CLI output.** No hiding stderr behind a generic "something failed".
5. **One-line prompt is a first-class entry point**, not an afterthought (see Screen 1).

## 3. Architecture

```
Browser (React + Vite)
   |  HTTP + Server-Sent Events (progress)
FastAPI (local, 127.0.0.1)
   |  subprocess: .venv\Scripts\python.exe -m src.cli <command> <project>   (PYTHONUTF8=1)
   |  file reads/writes under projects/<p>/
projects/<p>/  (config.json, script/, narration/, scenes, voiceover/, storyboard/, output/)
```

- Backend runs the same commands as the CLI, as subprocesses, one job at a time per project.
  Reuse `src/pipeline/orchestrator.py` only if it covers a step more cleanly than the subprocess.
- Job record: `projects/<p>/.ui/jobs/<id>.json` (command, start, end, exit code, log path). This is the
  only new state, and it is only history.
- Preview: embed the Remotion Player for scenes; serve `output/final.mp4` with range requests.
- Frontend: React, since `remotion/` already uses it.

## 4. Pipeline model the UI shows

Steps follow the `config.json` `paths` block. Status comes from file checks.

| # | Step | CLI | Output the UI reads | Slow/costly | Gate |
|---|---|---|---|---|---|
| 0 | Treatment (new) | `video_from_prompt` skill (to build) | `TREATMENT.md` | LLM | approve |
| 1 | Script | `script <p>` | `script/script.json` | LLM | approve |
| 2 | Narration | `narration <p>` | `narration/narrations.json` | LLM | approve |
| 3 | Scenes | `scenes <p>` | scene `.tsx` + `scenes/index.ts` | LLM | review report clean |
| 4 | Review | `scripts/review_video.py <p> --brief` | printed report | no | 0 errors |
| 5 | Voiceover | `voiceover <p>` | `voiceover/manifest.json` + audio | TTS | approve |
| 6 | Storyboard | `storyboard <p>` or channel finalize script | `storyboard/storyboard.json` | no | none |
| 7 | Render | `render <p>` | `output/final.mp4` | CPU, long | approve |
| 8 | Verify and export | ffprobe, contact sheet, social export | `output/` | no | approve |

### One nine-step list, two variants

Every project shows the same nine steps. A step can be **required**, **optional** or **skipped**, and
its command depends on the project type. The type is read from `"channel"` in `config.json`
(absent or empty means a standard project).

| # | Step | Standard project | Channel project (Markets, Promo, Launch, Lyric, Leaderbot, Demo) |
|---|---|---|---|
| 0 | Treatment | optional (hidden until built) | optional (hidden until built) |
| 1 | Script | required, `script` | **skipped** (content gathering is part of step 3) |
| 2 | Narration | required, `narration` | required, edit `narration/narrations.json` (`narration` command only seeds it) |
| 3 | Scenes | required, `scenes` | required, `<channel>_new_video.py` scaffold, then edit scenes; Demo uses `demo_build_scenes.py` and is never hand-edited |
| 4 | Review | required | required, with the channel's rules from `CHANNELS` |
| 5 | Voiceover | required | required |
| 6 | Storyboard | `storyboard` | `<channel>_finalize_storyboard.py` (not the plain command) |
| 7 | Render | required | required |
| 8 | Verify and export | required | required |

A **skipped** step shows greyed with the reason, and counts as satisfied for the steps after it. The
mapping lives in one table in the backend (step id, applies-to, command, output file), so adding a
channel or an optional step is a one-row change. Demo has its own input (`manifest.json` and
screenshots) in place of narration editing; model it as a variant of steps 2 and 3, not a new step.

Step status values: `not started`, `ready` (inputs exist), `running`, `needs review`, `approved`,
`stale` (an earlier step changed after this one ran), `failed`, `skipped`.

## 5. Screens

### Screen 1: Home (the first screen)

Purpose: start something new or continue something. It must work for someone who has never seen the
CLI.

Layout, top to bottom:

1. **Prompt box**, large, with placeholder "Describe your video, e.g. a teacher explaining Physics to
   kids". Below it:
   - Channel selector (cards: Vantage, Markets, Promo, Launch, Lyric, Leaderbot, Demo, plus Auto).
     `Auto` lets the treatment step choose. Each card shows its format (portrait 1080x1920 or 16:9)
     and a one-line description from `CLAUDE.md`.
   - Target length (seconds), voice provider (edge, elevenlabs).
   - Button **Create treatment**.
2. **Or start from a document**: three ways in, all ending as `projects/<p>/input/source.md`
   (the `source.document` path in `config.json`):
   - **Type or paste** into a Markdown editor on the page (title field, text area, live preview).
     **Save** writes `input/source.md`. Editable later from Screen 2 until the script step is approved.
   - **Upload or drop** a `.md` or `.pdf`; PDFs are converted by the existing ingestion code.
   - **Paste a URL**; fetched by the existing URL ingestion.
   The typed text and the prompt box are the same thing at different lengths: a one-line prompt seeds
   `source.md` with that line.
3. **Continue a project**: list of existing projects (`list` command), each row showing title, channel,
   a step progress bar, last-run time, and a thumbnail if `output/final.mp4` exists. Click opens
   Screen 2.
4. **Environment check strip**: green or red chips for Python venv, Node, ffmpeg, Claude Code, TTS
   provider. A red chip links to the fix from `CLAUDE.md`. Shown here because a missing ffmpeg
   otherwise surfaces only at render time.

States: empty (no projects: the prompt box is the whole page), error (backend unreachable: single
banner with the command to start it).

### Screen 2: Project overview (stepper)

Persistent left rail listing steps 0 to 8 with status icons; the main area shows the current step.
Header: project name, channel badge, resolution and fps, target length. Top-right: **Open folder**,
**Settings** (Screen 9).

The main area on first open is a summary card for the next ready step: what it will do, what inputs it
uses, estimated cost (LLM, TTS, or render time), and a **Run** button. Steps with `stale` status show
why ("narration changed after this was generated") and a **Re-run** button.

### Screen 3: Treatment and script review

Two-pane: left, the treatment (idea, audience, duration, beat sheet, "unacceptable if") as editable
fields; right, the generated script as an ordered list of sections.

Actions: edit any field, **Regenerate section**, **Regenerate all**, **Approve and continue**.
Changing an approved item marks later steps `stale`.

### Screen 4: Narration review

One card per scene: scene title, narration text (editable), word count with the channel's allowed range
(from the `CHANNELS` dict in `review_video.py`), and a status chip (in range, too long, too short).
Actions per card: **Regenerate**, **Edit**. Global: **Approve narration**.

### Screen 5: Scenes and review

Grid of scene cards with a Remotion Player preview (scrub bar, play on hover). Each card shows the
scene title, registry key (and a warning if key and title slug differ), and on-screen text.

Right side panel: the pre-render review report: ERRORs (block), WARNs (advice), and the reviewer
checklist from `docs/video_review_checklist.md` as tick boxes the user must clear or explicitly accept.
Buttons: **Regenerate scene** (single scene command), **Run review**, **Continue** (disabled until 0
errors).

Editing scene code is not in v1 (decision). A button **Ask Claude to change this scene** takes a
free-text note, sends it to the `feedback` command, regenerates that scene, and shows the new preview
next to the old one with **Keep new** or **Revert**. Revert needs the previous `.tsx` saved first
(copy to `.ui/backup/` before each change). Later options are listed in section 9a.

### Screen 6: Voiceover

Table: scene, narration, audio player, duration, provider and voice. Actions: change voice for all or
one scene, **Regenerate one**, **Generate all** (shows an estimate and requires a click, because TTS
costs time or money). Progress per scene via SSE.

### Screen 7: Storyboard and timing

Horizontal timeline: scene blocks sized by duration, narration waveform under each, buffer and fade
gaps visible. Read-only in v1, except a per-scene "hold" adjustment if the storyboard format supports
it (check `src/storyboard/models.py` before promising this).

### Screen 8: Render and verify

- **Before render:** summary (resolution, fps, duration, scene count) and **Render** button.
  Optional low-quality preview render first (once the CLI supports it).
- **During:** progress bar, current frame and ETA, live log tail, **Cancel**.
- **After:** the video player, a contact sheet image, the automated checks list (size, decode, audio
  codec, loudness, silence gaps; see the post-render gate in the integration plan), buttons
  **Export social version**, **Reveal in folder**, **Download**.
- A "Target closed" message at the end of a render is a known harmless message; the UI should key off
  "Video rendered" in the log, not the exit code alone.

### Screen 9: Settings

Per-project: channel, resolution (portrait or 16:9), fps, TTS provider and voice, brand colors and font
(maps to the `style` block in `config.json`). Global: path to venv, LLM model id (currently
`claude-sonnet-5-5`), default channel. Changes write to `config.json`.

### Screen 10: Jobs and logs

Table of every job for the project: command, start, duration, result, link to the full log. Needed
because failed steps must be debuggable without a terminal.

## 6. Key flows

**A. New video from a prompt:** Screen 1 (prompt, channel, length) -> create project -> treatment
(Screen 3) -> approve -> script/narration (Screen 4) -> scenes and review (5) -> voiceover (6) ->
storyboard (7) -> render and verify (8).

**B. Continue a project:** Screen 1 list -> Screen 2 shows the next step, or `stale` steps first.

**C. Fix one scene after render:** Screen 5, regenerate that scene -> later steps show `stale` ->
re-run voiceover only if narration changed, then storyboard, then render.

## 7. API sketch

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | environment checks for the Home strip |
| GET | `/api/projects` | list with step statuses |
| POST | `/api/projects` | create (prompt or document, channel, length) |
| GET | `/api/projects/{p}` | config plus step statuses |
| PUT | `/api/projects/{p}/config` | update settings |
| GET/PUT | `/api/projects/{p}/{script,narration}` | read and edit the JSON |
| POST | `/api/projects/{p}/steps/{step}/run` | start a step; returns job id |
| POST | `/api/projects/{p}/steps/{step}/approve` | mark approved |
| GET | `/api/jobs/{id}/events` | SSE: progress and log lines |
| POST | `/api/jobs/{id}/cancel` | stop the subprocess |
| GET | `/api/projects/{p}/files/{path}` | audio, video, images (range requests) |

Only one running job per project; a second `run` returns 409 with the running job id.

## 8. Edge cases to handle

- Step run while its input changed: mark stale rather than silently using old data.
- Backend restarted mid-job: the job record shows `interrupted`; the step offers Re-run.
- Windows specifics: set `PYTHONUTF8=1`, read logs as UTF-8, use `.venv\Scripts\python.exe`.
- Channel projects have different step sets and a registry key rule; the review step must surface it.
- LLM steps shell out to Claude Code; if it is not logged in, the job fails with its message shown.
- Very long renders: the browser can close; the job continues and the page re-attaches on reload.

## 9. Decisions

1. **Channel flow:** one nine-step list with required, optional and skipped steps (section 4).
2. **Treatment step:** not in v1. Ship the thin slice first (section 10). The Home prompt only seeds
   `input/source.md`; Screen 3 shows the script half only.
3. **Scene editing:** "Ask Claude to change this scene" only. Options for later are in 9a.
4. **Hosting:** local only. Bind to `127.0.0.1`, no auth. Because the backend runs shell commands, it
   must never listen on another interface, and it must only run the fixed commands in the step table
   (no arbitrary command endpoint), with project names validated against `projects/` entries.
5. **Where it lives:** `ui/` folder in this repo (backend and frontend), started by one command.
6. **Document input:** typed or pasted Markdown is saved to `input/source.md` (Home, item 2).

### 9a. Scene editing options (beyond v1)

| Option | What the user does | Effort | Pros | Cons |
|---|---|---|---|---|
| Ask Claude (v1) | Types a note; Claude edits the scene | Low | Handles any change, no editor to build | Slow and costs tokens per tweak; result can surprise |
| Text-strings editor | Edits on-screen words in a form (headline, labels, numbers) | Medium | Fast, free, safe, covers most small fixes | Needs a reliable way to find strings in the `.tsx` (a rough extractor exists in `review_video.py`) |
| Props panel | Edits values (colors, durations, items) exposed as scene props | Medium to high | Live preview updates, no code touched | Scenes must be rewritten to take props; big change to templates and kits |
| Code editor (Monaco) with live preview | Edits the `.tsx` directly | Medium | Full control, no model cost | Users must know React; easy to break the registry key rule or syntax |
| Scene swap | Picks a different template scene from the kit for a beat | Medium | Fits the channel kits well | Limited to existing templates |
| Open in IDE | Button opens the file in VS Code | Very low | Power users already have this | Leaves the UI |

Suggested next step after v1: the **text-strings editor**, since most post-review fixes are wording or
numbers. Then scene swap. A props panel is a rewrite of the kits, so only do it if the same tweaks keep
recurring.

## 10. Build order

1. Backend: project list, status from files, step table (section 4), run a step as a job, SSE log.
   Test with `voiceover` and `render`.
2. **Thin slice (v1):** Screen 1 (Home with typed or uploaded document), Screen 2 (overview and
   stepper), Screen 8 (render and watch). Usable end to end; the middle steps run from the overview with
   a Run button and show their output files and the review report as plain text.
3. Screens 4, 5, 6 (full review screens for narration, scenes, voiceover).
4. Treatment (Screen 3 first half) once the prompt-to-storyboard skill exists.
5. Screens 7, 9, 10 and polish.
