# MovieBook Style Bundle: Style Guide

Style for the **MovieBook** style bundle: a short narrative film with plot and spoken dialogue (landscape 1280x720),
built from locally generated shots. Each shot is a **Qwen-Image keyframe** turned into a **MiniMax H3 clip that carries
its own dialogue audio**, then joined in Remotion with subtitles. It runs on one 11 to 12 GB GPU, with no paid API.
Other style bundles have their own guide, kit and skill; do not mix styles. Not the Storybook bundle (painted stills
with a narrator) and not the Comic bundle (rotatable panels).

Implementation: kit `remotion/src/components/moviebook/kit.tsx` (pure timing in `timing.ts`), template plan
`templates/moviebook_video/plan.json`, scripts `scripts/moviebook_new_video.py`, `moviebook_build_scenes.py`,
`moviebook_keyframes_comfy.py`, `moviebook_clip_jobs.py`, `moviebook_clips_comfy.mjs`, `moviebook_voice_check.py`,
`moviebook_finalize_storyboard.py`, skill `.claude/skills/moviebook_make_video/`.

## 1. Why this shape

The approach comes from a hands-on report: MiniMax H3 at 8 steps on 11 GB VRAM, Qwen-Image 2.1 role keyframes for
character consistency, Qwen3-VL text encoding, voice anchoring for a male and a female lead, and Whisper reviewing the
script. Reported there: 1280x720, 24 fps, 40 s in 11 shots, 7 Chinese lines all verbatim correct, about 2.5 minutes per
90-frame segment, and a male voice anchored at 123.1 Hz measured at 142.9 and 146.8 Hz (16 and 19 percent off). The 40 s
are **not** one generation: the work is in splitting into shots and holding consistency. MovieBook is that workflow as a
bundle. The numbers above are the report's, not measured here (section 9 says what is verified).

## 2. Structure

- One **plan** (`projects/<p>/moviebook/plan.json`) is the single source of truth: style line, cast (name, gender,
  identity text, voice description, voice anchor), shots (title, visual, keyframe prompt, speaker, line, seed). Scenes,
  registry, dialogue captions and narration are generated from it by `moviebook_build_scenes.py`; never hand-edit them.
- One scene per shot, 3 to 6 s (90 frames at 24 fps is 3.75 s). A scene is one `ClipShot`: the clip plays once and holds
  its last frame if the scene runs longer. Shot id = slug of the shot title (registry key rule of the core workflow).
- At most **two speaking characters** and one language per film. One speaker per shot, one line per shot (7 to 25
  spoken words or 10 to 40 Chinese characters), so lip sync and the Whisper check stay clean.
- Cuts are 6-frame dissolves with 0.1 s between scenes (finalize sets it). Shots follow the dialogue, not a narrator.

## 3. Consistency rules

- **Identity text.** Every cast member has one `identity` string in the plan. The keyframe generator copies it verbatim
  into every shot that member is in, and the H3 caption repeats it. Change the string, never paraphrase it per shot.
  Outfit and hair go in the identity text, because a keyframe model only keeps what the prompt says.
- **Keyframe first.** Look at every `moviebook/keyframes/<id>.png` before spending 2 to 4 minutes on its clip. Reroll with
  `--only <id> --force --seed-offset N`. A bad keyframe makes a bad clip.
- **Voice anchor.** Each speaking character has `voice.description` (words, repeated in every caption) and `voice.anchor_hz`
  (a number measured from a reference recording, set with `moviebook_voice_check.py anchor`). The check compares each
  shot's median F0 with the anchor and fails above `voice.tolerance` (default 12 percent). Pitch is a proxy for identity:
  it catches a swapped or wrong-gender voice and big timbre jumps, not a quiet change of speaker. A 16 to 19 percent
  miss, as in the report, fails the shot; re-roll that clip with a new `clip_seed` rather than loosening the tolerance.
- **Dialogue check.** Whisper (language from `plan.language`) transcribes each clip and the character error rate against
  the scripted line must stay under `--max-cer` (default 0.08). Say the line was heard correctly only when the check ran
  without `--skip-asr`.
- **Never hide a miss.** `qc_voice.json` lists every failing shot and finalize refuses to run on a failing or stale
  report. Do not edit the report or the tolerance to get past it without telling the user.

## 4. Pipeline

1. `python -m src.cli create <p>` then `python scripts/moviebook_new_video.py <p>` (sample plan, six shots, two voices).
2. Edit `moviebook/plan.json` to the real story, then `python scripts/moviebook_build_scenes.py <p>`.
3. `python scripts/moviebook_keyframes_comfy.py <p>` (Qwen-Image through the ComfyUI HTTP API), review, reroll.
4. `python scripts/moviebook_clip_jobs.py <p>` then `node scripts/moviebook_clips_comfy.mjs <p>` (H3, one clip per shot).
   First time only: `node scripts/moviebook_clips_comfy.mjs <p> --inspect` and set `h3.frames_node` in the plan.
5. `python scripts/moviebook_voice_check.py anchor <p> <character> <audio-or-accepted-clip>` once per character, then
   `python scripts/moviebook_voice_check.py check <p>`; re-roll the shots it lists and re-check.
6. `python scripts/review_video.py <p> --brief`, then `python scripts/moviebook_finalize_storyboard.py <p>`.
7. `python -m src.cli render <p>`, then the frame checks and `continuity_qc.py` from the core workflow (refs: the keyframes).

There is no TTS step and no `voiceover` command: finalize extracts each clip's audio to `voiceover/<scene>.mp3`, so the
voice in the film is the voice that was generated with the face. Silence trimming is off (it would break lip sync).
`radio_cut.py` does not apply: shot length comes from the clips.

## 4a. In the web UI

MovieBook projects are driven from the UI (`python -m ui.server`, New Project, MovieBook card). The UI keeps its ten fixed
step slots and relabels them for this bundle (`MOVIEBOOK_VARIANTS` in `ui/server/steps.py`):

| UI step | What it runs | Panel |
|---|---|---|
| Story plan | scaffolds the sample plan once (`moviebook_new_video.py`) | edit cast identities, voices, lines, visuals and keyframe prompts; advanced raw `plan.json`; saves are validated |
| Scenes | `moviebook_build_scenes.py` (instant) | none |
| Keyframes (approval) | `moviebook_keyframes_comfy.py` | keyframe grid; **Re-roll** moves that shot's `seed` and regenerates only it |
| Clips (approval) | `moviebook_run_clips.py` (jobs, then the H3 runner) | clip players; **Re-roll** moves `clip_seed` and regenerates only that clip |
| Voice check and storyboard | `moviebook_run_finalize.py` (check, then finalize) | voice anchors (set from an accepted clip), per-shot pitch, deviation, script error and issues; a **Skip Whisper** box that says the dialogue is unchecked |
| Sound, Render, Verify | the standard steps | standard |

The UI never skips a failed check: a failing or stale `qc_voice.json` shows as a red banner and finalize still refuses.
Setting an anchor keeps `plan.json`'s modification time, because an anchor is a measurement and must not mark the keyframes
and clips stale; editing the plan or re-rolling a seed does mark later steps stale, on purpose. There is no voiceover step
in the UI for this bundle (the voice is the clips' own audio). Remaining gap: the UI runs the same unverified H3 dialogue
caption and Qwen-Image graph as the CLI (section 9), and has no control for `plan.h3.frames_node` (use the raw plan editor).

## 5. Look and kit

- Cinematic and photographic; the look is set by `plan.style_line` and the keyframe model, not by the kit.
- Kit: `ClipShot` (muted `OffthreadVideo`, hold-last-frame, 4-frame fade in, subtitle), `Subtitle` (pill, speaker name in
  a tone colour: female `#f2b6c6`, male `#9cc7e8`), `EndCard` (title plus one pill button over the last clip), optional
  children drawn over the clip. Palette tokens `INK #14110f`, `PAPER #f6efe3`, `ACCENT #e0803a`.
- Subtitles are always on (they carry the check: what you read is what the clip says). Safe zone: bottom 44 px design units.
  Latin text uses Inter; Chinese falls back to a system CJK font (Noto Sans SC, Microsoft YaHei, PingFang SC), so check the
  render on a machine that has one.
- The kit designs in 1280x720 and scales to the render size (the renderer uses 1920x1080).

## 6. Frame rate

Clips are 24 fps (`plan.fps`); every bundle renders through the 30 fps ScenePlayer, so Remotion retimes the clip by
time and finalize converts clip lengths to 30 fps frames (`clips.json`). 90 clip frames = 3.75 s = 112 scene frames.

## 7. Model and machine notes

- Plug the laptop in (battery power-caps the GPU 3x or worse, see `docs/TryComfyUIOptions.md`). One generation at a time.
- Qwen-Image 2.1 is under the Qwen Research License (see `docs/ComfyUIBasedStoryGeneration.md` section on licences and
  `THIRD_PARTY_NOTICES.md`): check it before any commercial use. Qwen3-VL is the H3 text encoder.
- The keyframe graph uses the standard ComfyUI Qwen-Image nodes and the model file names in `plan.keyframes`. If your
  Qwen-Image 2.1 files need other nodes, export your working graph in API format, put `{{prompt}}`, `{{negative}}`,
  `{{seed}}`, `{{width}}`, `{{height}}`, `{{prefix}}` where those values go, and pass `--workflow <file>`.
- Keep the plan's `frames` at about 90 (the report's speed) and the size at 1280x720 / 0.64 MP.

## 8. Registry keys

Registry keys in `scenes/index.ts` equal the slug of each scene title; component names end in `Scene`. The builder writes
both from the plan and fails on duplicate shot titles.

## 9. What is verified and what is not (read before trusting a first run)

Verified in this repo, without a GPU: plan validation, scene and registry generation, narration and caption generation,
keyframe prompt and graph building, H3 caption building, F0 estimation (synthetic tones), the pitch and dialogue
checks' maths (including the 16 and 19 percent cases), finalize (ffprobe, audio extraction, storyboard, no trimming),
`review_video.py`, and a full Remotion render of six synthetic clips with subtitles and a held last frame.

**Not verified, because it needs ComfyUI and the models:** the Qwen-Image graph against your 2.1 files; the H3 template
node ids for the length widget (use `--inspect`); the H3 **dialogue** caption (the `dialogue:` section and the lip-sync
sentence follow the ORB360 caption layout but have not been run, and the template has no reference-audio input that this
script knows of, so the voice anchor is words plus a pitch check, not an audio prompt); Whisper (not installed here:
`pip install faster-whisper`); real clip quality, speed and VRAM for dialogue. Run one shot first (`--only dawn`), listen to
it, check it with `moviebook_voice_check.py check <p> --only dawn`, and fix the caption section names with
`plan.h3.caption_template` if the model ignores them.
