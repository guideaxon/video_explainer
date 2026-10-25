---
name: scene3d_make_video
description: Produce a landscape (1920x1080) code-built 3D scene video for the Scene3d style bundle (soap bubbles from a wand, iridescent thin-film shading, breeze, pops with droplets, studio backdrop, caption pill) from a seeded, baked simulation, plus the same scene as a playable self-contained HTML page. Use when asked to make or restyle a Scene3d video, a bubble scene, or an interactive three.js toy built in code.
metadata:
  tags: scene3d, three-core, 3d, three, shaders, simulation, remotion, video, html
---

# Make a Scene3d video

## Requirements

You must use the `video_make_core` skill first and follow its workflow with the style bundle details below.
Do not continue from this file alone.

Style source of truth: `docs/scene3d_video_style_guide.md` (read it first). Design: `docs/scene3d_design.md`.
Kit: `remotion/src/components/scene3d/`; shared engine: `remotion/src/components/three-core/` (any bundle may use it).
Template: `templates/scene3d_video/`. Scripts: `scripts/scene3d_new_video.py`, `scripts/scene3d_finalize_storyboard.py`,
`scripts/three_core_bake_sim.mjs`, `scripts/three_core_check_determinism.py`, `scripts/three_core_build_html.mjs`.
Only for the Scene3d style bundle; do not mix kits (for several bundles in one film use `compose_make_story`).
Clean-room rule (design section 2): never study or copy a product whose licence or policy forbids it; build from physics.

## Style Bundle details for the core workflow

- `<style_bundle>` = `scene3d`; 1920x1080, 30 fps. Fill in `brief.md` first (premise, Must be true, sources, look, shots).
- **Step 2, scaffold**: writes four beats (blow, drift, pop, pool), `scenes/sim.spec.ts` (with `WATER` for the pool),
  `live/main.ts`, `live/pool.ts`, `brief.md`, and bakes `scenes/sim.json`.
- **Pool beat**: the setting changes from the studio sweep to teal water, which continuity QC reports as palette drift.
  Offer the options (keep it as a change of setting, warm the water to the studio palette, or a separate look) and let
  the user decide; drop the beat if the story does not need water. If the bake prints `BAKE FAILED`, fix the spec; never edit `sim.json` by hand.
- **Step 4, scenes**: per beat choose the shot (`SHOTS`), the look (one per video) and the simulation events in
  `sim.spec.ts` (emit, spawn, pop, popOldest, stopEmit). Offer looks and shots as options; the user decides.
  Keep narration in `narrations.json`; captions come from it.
- **Finalize (step 7)**: `python scripts/scene3d_finalize_storyboard.py <project>`: storyboard, captions, and a re-bake
  at the storyboard durations.
- **Determinism (before render)**: `python scripts/three_core_check_determinism.py <project> --frames <3 frames, one
  per scene, mid-beat>`. Tier 1 or 2 passes; record it in `brief.md`. Beyond Tier 2 blocks delivery. It uses the
  delivery backend from `remotion/scripts/delivery_gl.json` (ANGLE), the same one the render uses.
- **Render check**: `python -m src.cli render <project> --frames 60-61` (ANGLE is the default for scene3d), extract a
  frame and look at it: bubbles are films, not blobs; the action is in frame; the caption does not cover the wand.
- **Live page (optional deliverable)**: `node scripts/three_core_build_html.mjs <project> --title "<title>"` ->
  `scene.html`. Open it and try every control (Blow, aim, tap to pop, orbit, zoom, Reset).
- **Before delivery**: `python scripts/continuity_qc.py --project <project>`, read `qc/brief.md` and the contact sheet,
  then re-run with `--reviewed`.
