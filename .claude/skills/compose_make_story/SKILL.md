---
name: compose_make_story
description: Combine several style bundles into one complex story film made of chapters (for example a low-poly presenter introduces a washing-machine repair, an explainer chapter shows the anatomy and the part, then how to change it). Use when a video needs more than one style bundle, or when asked to join, combine or chain bundle videos into one story.
metadata:
  tags: compose, story, chapters, ffmpeg, video
---

# Make a composed story

Read `docs/compose_story_guide.md` first. A composed story is a set of ordinary chapter projects, one per style bundle, joined by
`scripts/compose_build.py`. Never import one bundle's kit into another bundle's scene (the guard hook denies it); never edit a chapter project
into a different bundle. Chapters are made with their own bundle skills.

## Steps

1. **Plan the chapters with the user.** Write the story arc as one script, split it into chapters, and propose a bundle per chapter (name the style guide that
   fits each). Offer the creative calls (which bundle, which voice, fade or cut) as options; the user decides.
2. **Scaffold**: `python scripts/compose_new_story.py <story> --chapters <bundle>:<id>,... --voice <voice>`
   (`--size 1080x1920` for a portrait story; `file:<id>` for an existing mp4). Creates `projects/<story>/story.json` and one project `<story>__<id>` per chapter.
3. **Make each chapter** with its bundle's skill (`lowpoly_make_video`, `markets_make_video`, `promo_make_video`, `launch_make_video`, `lyric_make_video`,
   `leaderbot_make_video`, `demo_make_video`, `storybook_make_video`), using the scaffolded project id and `video_make_core` for review, radio cut,
   voiceover, finalize and render. Use the same voice everywhere. Skip the scaffold step of those skills (already done).
4. **Check**: `python scripts/compose_build.py <story> --check`.
5. **Build**: `python scripts/compose_build.py <story>`; re-render one chapter with `--only <id>`.
6. **Verify**: contact sheet plus full-size frames at each chapter boundary, audio level across boundaries (`ebur128` per chapter vs joined).
7. **Deliver**: `python scripts/continuity_qc.py --project <story>`, read `qc/brief.md`, fix, re-run with `--reviewed`.
