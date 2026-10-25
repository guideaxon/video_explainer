---
name: moviebook_make_video
description: Produce a landscape (1280x720) narrative film with spoken dialogue for the MovieBook style bundle (Qwen-Image keyframes, MiniMax H3 image-to-video clips with their own dialogue audio, a male and a female lead with voice anchoring, Whisper script check, subtitles) on a local 11 to 12 GB GPU. Use when asked to make or restyle a MovieBook video, or a short film with plot and dialogue from generated shots.
metadata:
  tags: moviebook, film, dialogue, comfyui, minimax-h3, qwen-image, remotion, video
---

# Make a MovieBook video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/moviebook_video_style_guide.md` (read it first, including section 9: what is verified).
Kit: `remotion/src/components/moviebook/kit.tsx`. Template plan: `templates/moviebook_video/plan.json`.
Scripts: `scripts/moviebook_new_video.py`, `moviebook_build_scenes.py`, `moviebook_keyframes_comfy.py`,
`moviebook_clip_jobs.py`, `moviebook_clips_comfy.mjs`, `moviebook_voice_check.py`, `moviebook_finalize_storyboard.py`.
Only for the MovieBook style bundle; do not mix kits. Needs ComfyUI on `http://127.0.0.1:8188` with the MiniMax H3
models (`docs/TryComfyUIOptions.md`) and Qwen-Image 2.1, Playwright with Chrome, and `pip install faster-whisper` for the
dialogue check. Plug the laptop in.

## Style Bundle details for the core workflow

- `<style_bundle>` = `moviebook`; 1280x720; clips 24 fps, composition 30 fps. **No voiceover step** and no radio cut:
  the dialogue audio is each clip's own audio; finalize extracts it. Do not run `src.cli voiceover`.
- **Step 2, scaffold**: also writes `moviebook/plan.json` (cast, voices, shots) and builds scenes and narration from it.
  The plan is the source of truth: edit it, then `python scripts/moviebook_build_scenes.py <project>`. Never hand-edit
  `scenes/*.tsx`, `index.ts`, `dialogue.ts` or `narration/narrations.json`.
- **Step 3**: the story needs a source (the user's brief). Never invent claims, numbers or real people. Original
  characters only. Offer look, voices and cuts as options; the user decides.
- **Cast**: at most two speaking characters, one language, one speaker and one line per shot. Put outfit and hair in
  the character's `identity` text and never paraphrase it.
- **Keyframes**: `python scripts/moviebook_keyframes_comfy.py <project>`; look at every `moviebook/keyframes/<id>.png`;
  reroll with `--only <id> --force --seed-offset N`.
- **Clips**: `python scripts/moviebook_clip_jobs.py <project>`, then `node scripts/moviebook_clips_comfy.mjs <project>`.
  Do **one shot first** (`--only <id>`), listen to it, and only then run the rest. On the first run use `--inspect` and set
  `plan.h3.frames_node`. If a clip over 8 minutes, check AC power, then restart ComfyUI.
- **Voice**: once per character, `python scripts/moviebook_voice_check.py anchor <project> <character> <audio>` (use the
  first accepted clip); then `python scripts/moviebook_voice_check.py check <project>`. Re-roll every shot it lists with a
  new `clip_seed` in the plan. Report failures to the user as they are; never raise the tolerance or edit `qc_voice.json`
  to pass. `--skip-asr` means the dialogue was not checked: say so.
- **Review**: `python scripts/review_video.py <project> --brief` (clips and plan present, resolution, placeholder text).
- **Finalize**: `python scripts/moviebook_finalize_storyboard.py <project>` (measures clips, extracts audio, no silence
  trimming, 0.1 s buffer, 6-frame dissolves). It refuses a missing, silent, failing or stale voice check.
- **Verify**: render, then look at mid-shot and end-of-shot frames of every scene (subtitle matches the clip, face and
  outfit consistent shot to shot), listen for voice swaps at the cuts, then
  `python scripts/continuity_qc.py --project <project> --refs projects/<project>/moviebook/keyframes`, read `qc/brief.md`
  and the contact sheet, fix what changed between shots, and re-run with `--reviewed`.
