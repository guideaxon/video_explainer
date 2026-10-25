# Scene3D: Design for an Interactive 3D Scene Bundle

Status: **all phases (0 to 5) built** (2026-10-24). See section 15 for what was built, measured results, where the
build departs from this design, and what is still not verified. This is the master design document;
update it as decisions are made.
It incorporates the findings of a critical review against this repo and the open-source three.js r180 source
(downloaded and grepped, not run). Items deferred from that review are in the Appendix.

## 1. Purpose

Add one style bundle, `scene3d`, for short **code-built 3D scenes** that can be delivered two ways from the same source:

1. **Rendered video** — a frame-exact MP4 through Remotion, driven by a camera script, so it can join the normal
   narration, lip-sync and QC pipeline (and be a chapter in a composed story, `docs/compose_story_guide.md`).
2. **Interactive HTML** — one self-contained page the viewer can orbit, touch and play with.

It sits next to `isofigure` and `papercut` (HTML deliverables) and `lowpoly` (the only existing three.js bundle). It does
not replace them: `lowpoly` stays the talking presenter, `scene3d` is for places, objects and toys.

It is built as **two layers**:

- **`three-core`**, a shared engine with no visual style (deterministic time, simulation and bake, checks, HTML build).
  Any bundle may import it, as any bundle may import `rig`.
- **`scene3d`**, the first style bundle on top of it (shaders, look, camera language, templates, skill).

Non-goals: photogrammetry, downloaded art packs, a game engine, anything that needs a server.

## 2. Clean-room rule

This design was written from first principles:

- Pond Line (public page, no restrictive notice), `img2threejs` (Apache-2.0), `dioramas` (MIT code, CC BY 4.0 assets),
  and the open-source three.js repository.
- Textbook graphics and physics.

Practical rules:

1. No file, snippet, asset or description from a source whose licence or published policy forbids reuse or AI analysis
   goes into `docs/`, `templates/` or `remotion/`.
2. Every scene records its sources in its brief (section 9). A scene whose look cannot be explained from physics or an
   allowed source is rejected at review.
3. When a request says "like <their product>", we design from the user-facing requirement only (what the viewer does and
   sees), never from how another product does it.

## 3. Where it lives

### Why two layers

The repo's style rule draws the line. What does not change how a video looks may be shared (that is why `rig` is
allowed everywhere); what does change it must stay in one bundle.

| Layer | Contains | Must not contain |
|---|---|---|
| `three-core` (shared) | time contract and lint; seeded RNG; fixed-step simulation and the `sim.json` bake with its fail-closed checks; capability checks; picking against simulation bodies; live loop and input-to-event log; determinism and live-versus-video checks; HTML build with the three.js licence-header check | colours, look-defining shaders, post `look` presets, camera styles, fonts |
| `scene3d` (bundle) | thin-film, water and glass shaders; post `look`; palette; camera language and shot presets; templates; style guide; skill | engine code that another bundle would need |

A test greps `three-core/` for colour literals (`#rrggbb`, `rgb(`) and GLSL `gl_FragColor` / `vec3(` colour constants,
so the style boundary is checked rather than remembered.

### Paths

| Item | Path |
|---|---|
| Shared engine | `remotion/src/components/three-core/` (pure TypeScript where possible; React only in `video.tsx`) |
| Shared scripts | `scripts/three_core_bake_sim.mjs`, `scripts/three_core_build_html.mjs` (+ `.py` wrapper), `scripts/three_core_compare_frames.py` |
| Style guide | `docs/scene3d_video_style_guide.md` |
| Bundle kit | `remotion/src/components/scene3d/` |
| Templates | `templates/scene3d_video/` |
| Bundle scripts | `scripts/scene3d_new_video.py`, `scripts/scene3d_finalize_storyboard.py` |
| Skill | `.claude/skills/scene3d_make_video/` |
| Projects | `projects/<p>/scenes/` (scene files, `index.ts`, `sim.spec.ts`, baked `sim.json`), `live/main.ts`, `scene.html` (built), `brief.md`, `qc/` |

### Guard hook and registration

- Rule 3 of `.claude/hooks/guard.py` lists bundle kits in `KIT_IMPORT`. Add `scene3d` to that list; **do not** add
  `three-core` or `rig`, so every bundle may import them.
- Add the `CLAUDE.md` row and the other registrations when phase 4 ships, not before.
- `lowpoly` keeps working unchanged; it adopts `three-core` only in phase 5, as a separate change.

## 4. Core idea: the scene is a pure function of time

The scene is driven by a clock we control, never by wall time, so a frame can be rendered exactly and repeated.

> `renderScene(state(t), camera(t))` — everything visible at time `t` is computed from `t`, the seed and the logged inputs.

- **Fixed-step simulation, baked once.**
  - Physics and agents advance in fixed steps (default 1/60 s) from `t = 0` with a seeded RNG (mulberry32).
  - A Node step, `scripts/three_core_bake_sim.mjs`, runs the simulation **once** and writes `projects/<p>/sim.json`:
    per frame, body positions, orientations, ages, pop events and particle states.
  - Scenes read `sim.json` by frame number. They never re-simulate from zero.
  - Why: Remotion renders frames in **parallel browser tabs**. Replaying from `t = 0` in each tab would cost roughly
    the square of the frame count, and `Math.sin` and friends are not guaranteed identical across engine versions.
    One bake in one process is both cheap and consistent.
  - Live mode runs the **same simulation code** in the browser in real time; the bake is that code run ahead of time.
- **Inputs are events on the timeline.** Interactive play appends `{t, type, x, y}` to a log. The bake replays a
  recorded or scripted log, so a toy can appear in a film doing something a person actually did.
- **Scenes receive `t` and the step index only.** They must not read `performance.now()`, `Date.now()`, or r3f's
  `useFrame` `delta` and `clock` (wall time in live mode). Do not use three's `Clock` or `Timer` for simulation time.
  A lint test over scene and kit code (not `node_modules`) enforces this.
- **Video mode has no loop of its own.** Remotion owns the clock: `useCurrentFrame()` gives `t`, and `ThreeCanvas`
  renders on demand, as `lowpoly` already does. Live mode is a small rAF loop that feeds the same `(t) → scene`
  function. We do not build a second frame driver.

## 5. Architecture

```
three-core/                       (shared, no style)
  time.ts         frame <-> t, step index, the time contract
  rng.ts          mulberry32, seeded helpers
  sim.ts          fixed-step world: bodies, forces, spawners, pools, events (Node for the bake, browser live)
  checks.ts       the section 9 simulation checks (used by the bake)
  pick.ts         ray-sphere picking against simulation bodies
  capability.ts   WebGL2, float / half-float targets, derivatives
  camera.ts       shot table interpolation (data in, pose out; no shot presets)
  live.ts         the live loop and input -> event log (HTML mode only)
  video.tsx       thin wrapper over ThreeCanvas for video mode

scene3d/                          (bundle, the look)
  shade/*.ts      GLSL chunks (thin film, water, glass, fog, grade)
  look.ts         post look presets
  kit.tsx         stage, backdrop, bubbles, droplets, caption pill
```

A project scene declares its params, seed, simulation spec and shots, and draws with the `scene3d` kit.

- **Video mode (as built):** `three-core/video.tsx` (`StageView`): a plain canvas drawn synchronously by the shared
  `Stage` for Remotion's frame. *Changed from the original plan (`ThreeCanvas`)*: `ThreeCanvas` runs
  react-three-fiber's scheduler, which the live page does not have; one imperative `Stage` lets video and live share
  every line of scene code (risk 5). `lowpoly` keeps `ThreeCanvas`.
- **Post stack (as built):** the `postprocessing` library used imperatively (`scene3d/look.ts`), the same chain in both
  modes, rendered with `composer.render(0)` so no effect advances on a clock. *Changed from the plan*:
  `SafeEffectComposer` wraps the react-three-fiber `EffectComposer`, so it cannot be reused without r3f; its purpose
  (skip post when the context is gone) is covered by `Stage`'s capability check and its dispose on unmount.
- **Renderer:** **WebGL2 and GLSL only** (`ShaderMaterial` or `onBeforeCompile`) for v1. WebGPU/TSL is out of scope: it
  would add a second shader dialect, a second post stack and a second test matrix for scenes that cannot be video.
- **Capability check at start-up:** half-float or float renderable targets and derivatives. In live mode show a clear
  message; in video mode fail hard, because a missing extension can otherwise fail silently on some drivers.
- **Self-contained HTML:** `scripts/three_core_build_html.mjs` inlines a tree-shaken, minified three.js and the scene
  (esbuild or Vite) into one file that works offline. No import map to a CDN. The size budget goes in the brief.
  The bundler must **keep three.js's licence header** in the output (see "Licensing of three.js" below).
- **Decision gate (phase 0):** one frame with a custom shader and the post stack, rendered three times as PNG on this
  machine and compared with the tiered criteria in section 9. Plain three.js in Remotion needs no spike; `lowpoly`
  already does it with ANGLE (`remotion.config.ts`).

### Versions

- The repo was on `three 0.170.0` and is now pinned to `0.180.0` (section 15); the references use r180 and later. `postprocessing 6.38.2` supports
  `>= 0.157 < 0.183`, so **r180 is the target** and r183 or later is not allowed until `postprocessing` is upgraded.
- Pin one exact `three` version for the whole repo. Upgrade on a branch and run `vitest` plus one `lowpoly` sample
  render before merging; the change affects `lowpoly` and the existing three components' tests.
- Later three.js versions have API changes (for example `Clock` deprecation and removal of `PCFSoftShadowMap` by r186
  per the Dioramas notes), so never use a floating range.

### Licensing of three.js

Use the **official, unmodified three.js r180 release** (`three@0.180.0` from the npm registry, MIT licence). Checked in
the published package: `package.json` declares `"license": "MIT"`; the bundled `LICENSE` reads "Copyright © 2010-2025
three.js authors"; and each build file, including `three.module.min.js`, starts with a header:

```
/**
 * @license
 * Copyright 2010-2025 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
```

Rules:

1. Install it from the registry at the exact version (`"three": "0.180.0"`, no `^` or `~`). No forks, no patched
   copies, no vendored hand-edits. If a fix is needed, wrap or subclass it in our kit.
2. The MIT licence requires the copyright notice and permission text to be included in copies. In the rendered HTML
   the bundler must keep that header: use esbuild with `--legal-comments=inline` (or Vite's equivalent), and add a
   build check that fails if the string `SPDX-License-Identifier: MIT` and `Copyright 2010-2025 Three.js Authors` are
   missing from the output file.
3. Keep a copy of three.js's `LICENSE` text in the repo's third-party notices (the repo has no `THIRD_PARTY_NOTICES` file
   yet; add one in phase 2, listing `three`, `postprocessing`, `@react-three/fiber` and `@remotion/three` with their
   licences, as the Dioramas repo does).
4. Addons we import from `three/examples/jsm/` fall under the same licence and header; check each file's header when
   it is first used, and prefer core classes.
5. Rendered videos carry no code, so they need no notice. The HTML deliverable does.

## 6. Techniques (all first-principles)

Each is a small, testable module with a stated formula so a reviewer can check it.

- **Soap film / thin film colour.** Optical path difference `2·n·d·cosθt`; per colour channel with wavelengths
  `λ ≈ (650, 550, 450) nm`, reflected intensity `≈ 2 − 2cos(4π·n·d·cosθt / λ)` times the Fresnel term. Film thickness
  `d` varies with a slow noise field plus gravity drainage (thicker at the bottom). Gives iridescence from three cosines.
- **Fresnel.** Schlick approximation for cheap use, the exact unpolarised form for hero water or glass.
- **Absorption and in-scatter.** Beer–Lambert, `T = exp(−σ·path)` per channel, plus a tint term.
- **Water surface.** Sum of a few dispersion-correct waves for normals; planar mirror for reflection; refraction as a
  screen-space offset with a depth check. Caustics by refracting a ray grid and measuring cell area change (Jacobian),
  which needs derivatives and an additive half-float target (see the capability check, section 5).
- **Buoyant bodies.** Semi-implicit Euler: gravity, buoyancy, quadratic drag, a slow curl-noise breeze, soft world bounds.
- **Soft bodies by springs.** A pop or squash is a damped spring on scale with a shape-dependent target.
- **Particles.** Pooled instances with a fixed cap, seeded emit directions, lifetime and drag; a mobile cap lower than
  desktop.
- **Pointer picking.** Ray-sphere tests against the sim's own bodies (no scene-graph raycast), so picking is
  deterministic and costs nothing per frame.
- **Depth of field and bloom.** Bloom in HDR before tone mapping. *As built, no depth-of-field pass*: the bubbles do
  not write depth (order-independent transparency), so a depth-based blur would blur them with the backdrop behind
  them. The backdrop is drawn already out of focus (soft sweep, bokeh discs) instead.
- **Post grade.** White balance, saturation, split-tone, vignette, grain, as one node.

### Transparency

Bubbles, water and glass are translucent and overlap. three.js sorts transparent objects by object centre, and an
`InstancedMesh` is one object, so individual instances are not depth-sorted. Rules:

- Thin films are shaded as **order-independent premultiplied or additive reflection** plus a small transmission term,
  with `depthWrite: false`, and back and front faces rendered separately. Reflected light from stacked films adds, so
  this removes sorting problems by construction.
- Keep ordinary sorted blending only for the few cases that need it, and say so in the brief.

### Per-instance state

Pop progress, age and film thickness vary per instance. Uniforms per object break instancing, and
`instanceMatrix.needsUpdate` only covers matrices. Rule: per-instance values live in `InstancedBufferAttribute`s,
written once per frame into one typed array, with `needsUpdate` set on that attribute.

## 7. Post stack and look

One shared stack (section 5), set per scene by a `look` object (tone map, exposure, bloom, DoF, grade, grain). Defaults
are neutral; a scene must state its look in its brief. Glass and transmission need a defined background (a known gotcha).

## 8. Interaction model (live mode)

- One **primary action** per scene, discoverable within 3 seconds (a hint that fades after first use).
- Pointer: tap acts on the object under it, drag moves it, drag on empty space orbits, pinch or wheel zooms.
- Keyboard: every pointer action has a key (accessibility).
- A visible **Reset** that restores camera and initial state exactly (it replays from `t = 0` with the same seed).
- Sound is deferred (not in phases 0 to 4); when added it is optional and off until the viewer enables it.
- `prefers-reduced-motion`: fewer particles, slower camera, no flashes.
- Touch UI: stick or drag-to-look, 44 px minimum targets.

## 9. Brief, review and acceptance

Every scene starts as `projects/<p>/brief.md` (template in `templates/scene3d_scene/`):

1. **Premise** in one sentence and the **Must be true** line (one visible acceptance test, e.g. "a still frame reads
   as a photograph, not a render").
2. **Sources:** which techniques from section 6 it uses; any external assets and their licences.
3. **Primary action** and its three-second hint.
4. **Look:** palette, light direction, lens, post settings.
5. **Shots:** name, from/to camera, length. Declarative table: position, target, fov, ease.
6. **Budgets:** frame time, triangle and draw-call counts, texture memory, HTML size.

Review battery (reuses the repo's habits):

- `scripts/review_video.py` for video mode; `continuity_qc.py` before delivery (hash-checked `qc.json`, `--reviewed`).
- Headless screenshots at fixed times and at 3 viewport sizes into one contact sheet.
- **Determinism check (tiered, same machine, PNG, three renders of frame `n`):**
  1. Tier 1, ideal: all three PNGs are byte-identical.
  2. Tier 2, accepted with a recorded limit: per-pixel absolute difference at most 2 levels per channel (of 255) and
     a mean absolute difference below 0.05 levels, across all three pairs. The measured numbers go in the brief.
  3. Beyond Tier 2: delivery is blocked. Remove the usual causes first (any timer-derived uniform; grain, dither or
     noise not seeded from the frame index; shader or driver cache state; unordered floating-point reductions) and
     re-test.
  GPU-backed WebGL does not guarantee byte equality run to run, which is why Tier 2 exists; it must never be used to
  hide a real difference, so the limit is written down rather than assumed.
- **Test the delivery path, not a different one.** The check renders PNG, but delivery is JPEG today
  (`Config.setVideoImageFormat("jpeg")`). Either render `scene3d` projects with `--image-format=png` for delivery too
  (frames are intermediate; the MP4 encode follows), or run the check once more through the JPEG path and compare the
  encoded frames. Phase 0 settles which, by confirming the image format can be set per render without changing other
  bundles.
- **Live versus video check:** the same `t` in both modes compared with a **tolerance** (PSNR or SSIM threshold at a
  stated resolution), never byte equality. Device pixel ratio, MSAA, compositing and ANGLE differ between the modes.
- **Performance budget:** checked against the brief's budgets.
- **Simulation checks, run by `scripts/three_core_bake_sim.mjs` itself before any render** (phase 1, not deferred). The
  bake **fails closed**: on any error it exits non-zero, prints the failure, and writes no `sim.json`. Message form:
  `BAKE FAILED: <check> body=<id> frame=<n> value=<v> limit=<l>`.

  | Check | Rule | Severity |
  |---|---|---|
  | Finite values | every number in the output is finite (no NaN, no Infinity) | error |
  | Bounds | `max abs(position)` on each axis `< bound − margin`, margin = the larger of 2 % of that bound and one body radius | error |
  | Speed | no body exceeds `vmax` (default: 4 × the scene's expected terminal speed, set in the brief) | error |
  | Pool use | peak live particles `<= 0.9 × cap`; reaching the cap (dropped spawns) is an error, `>= 0.9 × cap` a warning | error / warn |
  | Body cap | live bodies never exceed the cap, and retirements never remove a body younger than its minimum lifetime | error |
  | Spawn overlap | at spawn, centre distance between any two new bodies `>= 0.5 × (r1 + r2)`; `< 0.9 × (r1 + r2)` is a warning | error / warn |
  | Bake stability | baking twice in the same process version gives byte-identical `sim.json` (hash compared) | error |

  The numeric defaults are starting values; each scene's brief may tighten them, never loosen them without a written
  reason.
- Always inspect mid-beat and end-of-beat frames, per `CLAUDE.md`.

## 10. Assets

Default is **no external assets**: geometry, textures and sound are generated in code, as in `papercut`. Optional paths,
each opt-in and each logged in the brief:

- Local generation (ComfyUI) for plates or textures, as `storybook` does.
- A paid image-to-3D service only through a script under `scripts/` that records request ids before polling (so the
  guard hook allows it and a crash does not pay twice).
- Third-party models only with a licence we can ship; attribution kept with the project.

## 11. Risks

1. **Shader and post-stack determinism in Remotion.** Plain three.js video already works (`lowpoly`, ANGLE). Unknown:
   custom `ShaderMaterial`, float render targets and the post stack on this machine, and whether run-to-run output is
   byte-identical at all (GPU-backed WebGL does not guarantee it). Phase 0 settles it with the tiered criteria in
   section 9; if float targets fail, drop caustics and keep the rest.
2. **Frame cost.** Heavy shaders at 1080p can take seconds per frame, and parallel tabs share GPU memory. Budget per
   scene; allow a half-resolution preview render; set Remotion concurrency deliberately.
3. **Scope.** A new bundle touches the table, guard hook, review script, sound rules and UI card. Do those as one
   checklist at ship time, as the five-style update did.
4. **Licence contamination.** Section 2. The guard is process, so review checks the brief's sources line.
5. **Interactive versus video drift.** One scene function and one simulation code path reduce it; the tolerance-based
   cross-mode check (section 9) detects what remains.
6. **Version drift.** Section 5, Versions: one pinned `three`, upgraded only on a branch with tests.

## 12. Phases

| Phase | Output | Exit check |
|---|---|---|
| 0 | Spike: one frame with a custom shader and the post stack, rendered three times as **PNG** in Remotion on this machine, compared. Also confirm the image format can be set per render (PNG for `scene3d`) and that `three@0.180.0` runs with the installed helpers | Tier 1 (byte-identical) or Tier 2 (max diff <= 2 levels, mean < 0.05) from section 9, with the measured numbers written into this document; if beyond Tier 2, the causes found and removed, or the limit recorded (for example "no float targets") |
| 1 | `sim.ts`, sim bake to `sim.json` **with the section 9 simulation checks**, one thin-film toy as a **video** scene through `ThreeCanvas` | Bake fails closed on a seeded bad input; bake hash stable; determinism check passes at its recorded tier; brief written; review battery runs |
| 2 | Live HTML build (bundled three.js with licence header kept, input, reset, touch), live-versus-video tolerance check, `THIRD_PARTY_NOTICES` | Offline file works; licence-header build check passes; cross-mode check passes; HTML size within budget |
| 3 | Water and caustics module, second scene | Performance budgets met |
| 4 | Bundle registration (table, guard, review, UI card), style guide, skill, scaffold | Checklist in the style of `ANIMATION_STYLES.md` completed |
| 5 | `lowpoly` adopts `three-core` (time contract, determinism check), as its own change | `lowpoly` sample render unchanged within Tier 2; its tests pass |

This order puts the proven video path first and the new bundled interactive page second. `three-core` and `scene3d`
are separate folders from the first commit; only `scene3d` uses the core until phase 5.

## 13. Worked example: the bubble toy (requirements only)

Defined by what the viewer sees and does, not by anyone's implementation:

- Hold a button to blow bubbles; drag to aim the stream; tap a bubble to pop it; **Reset** restores the start.
- Bubbles are iridescent spheres that wobble, drift upward on a soft breeze and pop with a small spray of droplets.
- Count is capped (lower on mobile); the oldest is retired quietly when the cap is hit.
- Look: soft backdrop, shallow depth of field, gentle bloom.

Built only from section 6: thin-film colour, Fresnel, buoyant bodies, spring wobble, pooled particles, deterministic
picking, order-independent transparency. Its brief lists those as its sources.

## 14. Open decisions (yours)

Taken as defaults when the feature was built (change any of them by saying so):

1. Phase 0 ran (results in section 15).
2. The bubble toy is the first scene; the water scene (phase 3) is the fourth template beat, `pool`.
3. Code-only textures; no ComfyUI.
4. Video-first order kept.
5. `lowpoly` adopted `three-core` without changing what it delivers (phase 5, section 15).

Still open: whether the `pool` beat's teal palette is an intended change of setting (continuity QC flags it as palette
drift; options in section 15); a sound palette for scene3d (sound was deferred, so it uses the default palette).

Decided: sound is deferred; WebGL2 and GLSL only for v1; the repo pins one `three` version, the official unmodified
r180 release (MIT, header kept); the simulation checks ship in phase 1; the engine is a shared `three-core` layer
with `scene3d` as its first bundle, and `lowpoly` adopts it later (phase 5).

## 15. As built (2026-10-24)

### What exists

| Layer | Files |
|---|---|
| `three-core` | `time.ts`, `rng.ts`, `sim.ts` (World, droplets in closed form, ray-sphere), `waves.ts` (dispersion-correct waves, ripple rings, droplet fall time), `bake.ts` (bake and checks), `camera.ts`, `stage.ts` (Stage, capability check, shader-error failure in video mode, `beforeRender` passes), `live.ts` (LiveLoop, EventLog, Orbit, gestures, QualityGovernor), `video.tsx` (StageView), `core.test.ts`, `waves.test.ts` |
| `scene3d` | `shade.ts` (thin film, backdrop), `water.ts` (pool surface, caustics pass), `look.ts` (looks incl. water, post chain, grade), `toy.ts` (BubbleSet, wand, optional water), `kit.tsx` (BubbleShot with `water`, Caption, SHOTS incl. `pool`), `live.ts` (startBubbleToy with `water`) |
| Template | `templates/scene3d_video/` (`scenes/` blow, drift, pop, pool, `sim.spec.ts` with `WATER`; `live/main.ts`, `live/pool.ts`; `brief.md`) |
| Scripts | `three_core_bake_sim.mjs`, `three_core_render_stills.mjs`, `three_core_check_determinism.py`, `three_core_build_html.mjs` (+ `.py`), `scene3d_new_video.py`, `scene3d_finalize_storyboard.py` |
| Registration | `CLAUDE.md` row and three-core section, guard `KIT_IMPORT`, `review_video.py` (rules plus a sim coverage check), `compose_new_story.py`, UI step table and New Project card, `render.mjs` and `remotion/scripts/delivery_gl.json` (delivery backend per bundle), skills `scene3d_make_video` and `lowpoly_make_video` (determinism step), `video_make_core` description, `HowToUse.md`, `ANIMATION_STYLES.md`, `THIRD_PARTY_NOTICES.md` |
| Tests | `core.test.ts` (17: bake stability, each fail-closed check, droplets, picking, camera, time contract lint over scene3d and lowpoly, style-boundary lint), `waves.test.ts` (5), `tests/test_scene3d_template.py` (11) |
| Demo | `projects/scene3d_demo` (gitignored): narrated 16.7 s video (four beats), `scene.html`, `pool.html` |

### Phase 3: water and caustics (as built)

- **Waves** (`three-core/waves.ts`): 10 seeded waves, wavelengths 8 to 70 cm, steepness 0.012 to 0.035, angular
  frequency from `w^2 = g k + (sigma/rho) k^3`. **Ripples**: a ring wave packet where a bubble pops on the surface
  (at once) or where its spray lands (after the closed-form fall time). Same formulas in GLSL and JS; a test checks the
  slope against a finite difference of the height.
- **Surface** (`scene3d/water.ts`): exact unpolarised Fresnel; reflection of the studio environment; refraction
  traced exactly to the flat floor, which is shaded in the surface shader (tiles, caustics, sun), with Beer-Lambert
  absorption down and back up and in-scatter. *Departs from section 6*: no screen-space refraction or depth check
  (a flat floor makes the exact trace cheaper and stable), and no planar mirror, so bubbles are not reflected in the
  water (v1).
- **Caustics**: a 400 x 400 grid of sun rays refracted onto the floor; area ratio from derivatives, additive into a
  1024^2 half-float map, faded to even light at its edges. Two bugs found by measuring rather than looking: (1) the
  grid was back-face culled by the mirrored mapping, so only folded cells drew (fix: double-sided); measured map mean
  after the fix **0.9999** (energy conserved), peak 10.5; (2) a shader that failed to compile was silently skipped in
  video (fix: `Stage` now throws in video mode on any shader error).
- **Scene**: `pool`, bubbles settling onto 0.6 m of water and popping on it, `pool` shot.

### Phase 5: lowpoly adopts three-core (as built)

- Its kit and template follow the time contract (frame-driven only; the lint now covers `lowpoly`), and its skill runs
  the determinism check before delivery.
- Delivery is **unchanged**: Lowpoly keeps Remotion's default GL backend. Measured: default backend Tier 1 on
  `lowpoly_demo` frames 45, 300, 600 (3 runs). Switching it to ANGLE would change under 0.5 % of pixels (anti-aliased
  edges, up to 170 levels), beyond Tier 2, so it was not done. `remotion/scripts/delivery_gl.json` records each
  bundle's delivery backend; `render.mjs` and the determinism check both read it (`scene3d: angle`, `lowpoly: auto`).
- `lowpoly` keeps `ThreeCanvas`; it does not use `Stage` (not needed for a frame-driven r3f scene).

### Measured results

- **three.js upgrade:** `three` and `@types/three` 0.170.0 -> 0.180.0 (exact). Remotion tests 337/337 before and
  after. `lowpoly_demo` on r180: frames 45 and 300 byte-identical across 3 fresh browsers (Tier 1); 37.6 and 35.7 dB
  PSNR against the old r170 `final.mp4` (lossy H.264), and the same picture by eye (the mouth differs; `lipsync.ts`
  appears to have been re-baked after that video was rendered). `stats-gl` still carries its own nested three 0.170
  (a drei dependency, not loaded by scene3d).
- **Phase 0 (custom shader, half-float post chain, ANGLE):** `scene3d_demo` frames 60, 170 and 270, 3 runs each in
  fresh browsers: **Tier 1, byte-identical**.
- **Backend matters:** the same frame under Remotion's default GL backend differs from ANGLE (max 81 levels, mean
  0.48). So `render.mjs` now renders scene3d with ANGLE unless `--gl` is given, the backend the check measures.
- **Delivery path:** delivery stays JPEG (quality 90) then H.264, shared with every bundle. The PNG check measures the
  renderer; JPEG encoding of identical pixels is expected to be identical, but that was not separately verified.
- **Bake:** 197 KB `sim.json` for three scenes (~150 frames each); no warnings.
- **Live page:** 581 KB, offline (no network requests in a Playwright run), licence notices kept and checked. Blow,
  aim, tap-to-pop, orbit and reset work in Chromium with no console errors.
- **Render:** 11.8 s at 1920x1080 in about 2 minutes on this machine (three beats); after phase 3, 16.7 s (500
  frames, four beats) in 43 s wall time, about 86 ms per frame including bundling and encoding. A plain
  `src.cli render` logs `GL renderer: angle (delivery_gl.json default for scene3d)`.
- **Determinism after phase 3:** frames 60, 170, 290, 410, 470 (410 and 470 in the pool, with caustics and ripples),
  3 runs each: **Tier 1**.
- **Performance budget (phase 3 exit):** live page at 1280x720 in headless Chromium (ANGLE, D3D11, no vsync): bubbles
  217 fps, 7.2 ms per GPU-synced frame; with the pool 202 fps, 8.1 ms. Budget: 16.7 ms (60 fps) live, 1 s per frame
  offline. Met on this machine; not measured on a laptop or phone.

### Not done, or not verified

- **Palette drift (continuity QC):** the `pool` beat's teal water departs from the studio palette of the other beats
  (drift 0.80 and 0.61 at 13 s and 15 s, threshold 0.35). Options: keep it as an intended change of setting; warm the
  `studio` look's water (sand tiles, less blue scatter) to stay in palette; or give the pool beat its own look and treat
  it as a new chapter. A creative call, so not changed; the QC was not marked reviewed.
- **Intermittent `ProtocolError: Page.bringToFront: Target closed`** printed by Remotion at about 90 % of some scene3d
  renders. Every such render still wrote a complete video (500 of 500 frames checked on one). It occurred in 3 of 6
  scene3d renders, with and without the canvas-per-build change in `StageView` (so that change did not cause it), and
  in 0 of 2 `lowpoly` renders. Cause not found; plausibly the browser tab closing while the last frames flush. Check the
  frame count of a scene3d render before delivery until this is understood.
- Bubbles are not reflected in the water.
- Touch gestures, `prefers-reduced-motion` and the quality governor were not tested on a device.
- `continuity_qc.py` ran on the three-beat demo (5 frames, 0 warnings, 0 errors; contact sheet consistent) and on the
  four-beat demo (8 frames, the two palette warnings above). Its human review was
  not signed off (`--reviewed`), and the demo is not a deliverable. One continuity gap found: each scene has its own
  simulation, so bubble positions do not carry across a cut (blow ends in a cluster by the wand, drift opens on a
  scattered field). Fix when needed: seed a scene's `initial` bodies from the previous scene's last baked frame.
- `radio_cut.py` and `sound generate` were not run; there is no scene3d sound palette.
- Determinism across machines (only same-machine runs were compared).

## Appendix: deferred items

Review findings that are real but best settled later, plus the review's verification record.

### A1. Thin-film maths assumptions — done
Stated in `docs/scene3d_video_style_guide.md` section 8. Still open: 8 to 16 wavelength samples or a baked lookup
texture for hero close-ups.

### A2. Mobile quality governor — done (untested on a device)
`QualityGovernor` in `three-core/live.ts`: measured frame time with hysteresis; level 1 drops bloom, level 2 drops the
pixel ratio to 1. Not tested on a phone or a slow GPU.

### A3. Pipeline fit
| Output | Steps that apply |
|---|---|
| Video | All `video_make_core` steps; finalize is `scene3d_finalize_storyboard.py` (captions only, no mouths, plus the re-bake); the determinism check before render |
| HTML (`scene.html`) | Scaffold, edit `sim.spec.ts` and `live/main.ts`, `three_core_build_html.mjs`; no narration, voiceover or storyboard |
| Composed chapter | As video; `compose_new_story.py` accepts `scene3d:<id>` |

### A4. What was verified, and what was not
Verified by reading the repo and the downloaded three.js r180 source:

| Fact | Evidence |
|---|---|
| The repo already renders three.js into video | `remotion/src/components/lowpoly/kit.tsx` uses `ThreeCanvas`; `remotion.config.ts` sets `setChromiumOpenGlRenderer("angle")` |
| Installed versions (at review time; `three` is now 0.180.0) | `three 0.170.0`, `@remotion/three 4.0.242`, `@react-three/fiber 8.18.0`, `postprocessing 6.38.2` |
| r180 fits the installed helpers | `postprocessing` peer range `>= 0.157.0 < 0.183.0`; r3f and `@remotion/three` accept `>=0.133` / `>=0.137` |
| A shared post wrapper exists | `remotion/src/components/three/SafeEffectComposer.tsx`, `ThreeSceneWrapper.tsx` |
| r180 has `Clock` and `Timer` in core | `Timer.connect(document)` uses the Page Visibility API |
| `InstancedMesh` carries matrices, optional colour and a morph texture only | `InstancedBufferAttribute` is the class for other per-instance values |
| `preserveDrawingBuffer` defaults to false | `three.module.js` |
| Official r180 is MIT with a full header | `three@0.180.0`: `package.json` licence `MIT`; `LICENSE` "Copyright © 2010-2025 three.js authors"; `three.core.js`, `three.module.js` and `three.module.min.js` each start with `@license Copyright 2010-2025 Three.js Authors`, `SPDX-License-Identifier: MIT` |
| The repo has no third-party notices file yet | no `LICENSE*` or `THIRD_PARTY*` at the repo root |
| Video frames are JPEG today | `Config.setVideoImageFormat("jpeg")` |

Not verified: no code was run and no frame was rendered. The statements about Remotion's parallel tabs, ANGLE behaviour
and float-target extensions come from how those tools are documented to work and from the repo's configuration; phase 0
is where to confirm them.

### A5. Kept from the original design, unchanged
The clean-room rule and the sources line in every brief; the "Must be true" acceptance line; pure-function time and a
fixed-step simulation; deterministic picking against simulation bodies; the review battery; no external assets by default.
