# Composed Stories: Several Style Bundles in One Film

A composed story is a film made of **chapters**; each chapter is a complete video project in its own style bundle.
Example: "How to replace a washing machine drain pump" =
`lowpoly:intro` (the presenter introduces the job) → `markets:anatomy` or another explainer bundle for the exploded parts view →
`lowpoly:the_part` (the presenter names the part and what it does) → `demo:steps` or `lowpoly:steps` (how to change it) → `lowpoly:outro`.

## Why chapters, not mixed scenes

Style bundles must not mix (`CLAUDE.md`, guard rule 3 in `.claude/hooks/guard.py`): a scene may only import its own bundle's kit, and each bundle
has its own palette, fonts, resolution and pacing. Chapters keep that rule intact. Every chapter is reviewed, voiced and rendered by its bundle's own skill,
so existing and future bundles compose without code changes; the composer only joins finished videos.

## Layout

```
projects/<story>/story.json              the story: target size, fit, transition, voice, chapter list
projects/<story>__<chapter>/             one normal project per chapter (its bundle's files)
projects/<story>/build/<chapter>.mp4     chapters normalised to the story's size, fps and audio
projects/<story>/output/final.mp4        the joined film
projects/<story>/plan/compose.json       what was joined, and from where
```

`story.json` fields: `target` (`width`, `height`, `fps`), `fit` (`blur-pad` default, `pad`, `crop`), `transition` (`fade` or `cut`, `seconds`),
`voice`, and `chapters` (`id`, `bundle`, `project` or `file`, `title`). A chapter with `"bundle": "file"` points at an mp4 inside `projects/<story>/`
(for example a recording of an Isofigure or Papercut HTML film, which have no video render of their own).

## Rules that make the film feel like one story

1. **One narrator, one voice.** Every chapter uses the same TTS voice (`story.json` `voice`, copied into each chapter's `tts.voice_id`).
   The presenter appears in the first and last chapters at least, and may reappear between chapters to hand over ("now let's look inside").
2. **One thread of narration.** Write the whole script first as a single document, then split it into chapters. Each chapter's last line sets up the next; no chapter repeats an intro.
3. **Orientation.** Pick the story's target size by where it will be watched. A portrait bundle (Markets, Promo, Launch, Lyric, Leaderbot) inside a landscape story
   sits on a blurred copy of itself (`blur-pad`), which reads as a "screen inside the scene". If most chapters are portrait, make the story portrait instead.
4. **Handover.** Use a 0.5 s crossfade between bundles (default). Use `cut` only if both neighbours end and start on a hard visual beat.
5. **Loudness.** Chapters are normalised to 48 kHz stereo; run the social export loudness step (`video_make_core` step 10) on the joined file, not on chapters.
6. **Facts.** Every claim in any chapter needs a source; the anatomy chapter must match the real part names used in the how-to chapter.

## Workflow

1. Decide the chapter list and bundles (offer options; the user decides the look of each chapter). Not every bundle fits every job: pick the one whose
   style guide matches the content (parts and anatomy → an explainer bundle; real device screens → Demo; the human voice → Lowpoly).
2. Scaffold: `python scripts/compose_new_story.py <story> --chapters lowpoly:intro,markets:anatomy,lowpoly:the_part,demo:steps,lowpoly:outro --voice <voice>`.
3. Write the full script once; then, for each chapter, follow that bundle's skill (`lowpoly_make_video`, `markets_make_video`, ...) with project id `<story>__<chapter>`,
   including its review, radio cut, voiceover, finalize and render steps. Do not re-scaffold chapter projects.
4. Check: `python scripts/compose_build.py <story> --check` (projects exist, bundle matches, one voice).
5. Build: `python scripts/compose_build.py <story>` (renders missing chapters, normalises, joins). `--only <id>` re-renders one chapter; `--rerender` all.
6. Inspect frames at every chapter boundary and mid-chapter; check the audio has no jump in loudness or voice across boundaries.
7. Before delivery, `python scripts/continuity_qc.py --project <story>`, read `qc/brief.md`, re-run with `--reviewed` (the send-file hook requires it).

## Isofigure chapters

An `isofigure` chapter is the interactive figure recorded to video: `projects/<p>/tour.json` lists narrated steps (what the presenter-voice says, which parts to press, when to Look inside), and
`python scripts/isofigure_capture_video.py <p>` plays them in headless Chromium and writes `output/final.mp4` with the voice (edge TTS, the story's voice). The timeline comes from the speech lengths, so picture and words match.
`compose_build.py` calls it automatically. Needs Playwright (`npm i -g @playwright/test`).

## Not built yet

- Papercut films have no video render: record them to mp4 yourself and use a `file` chapter.
- Cross-chapter continuity of look inside one chapter pair (matching a palette between bundles) is a creative call: offer it as an option.
