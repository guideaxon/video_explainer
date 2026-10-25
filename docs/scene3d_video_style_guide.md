# Scene3d Style Bundle: Style Guide

Code-built 3D scenes, delivered two ways from the same source: a narrated landscape video (1920x1080, 30 fps) and a
self-contained HTML page the viewer can play with. The first scene set is soap bubbles: a wand, iridescent films that
wobble, drift on a breeze and pop into droplets, in front of a soft studio sweep. Design and rationale:
`docs/scene3d_design.md`. Engine (shared, no style): `remotion/src/components/three-core/`. Kit (the look):
`remotion/src/components/scene3d/`.

No ComfyUI, no art files, no downloaded models: everything is geometry, shaders and a seeded simulation.

## 1. Look

- **Looks** (`look` prop, `LOOKS` in `look.ts`): `studio` (lavender-to-peach sweep, warm bokeh; default), `garden`
  (green shade, low sun, gold bokeh), `dusk` (deep blue, coral key, city-light bokeh). One look per video.
- **Backdrop**: an out-of-focus studio sweep with a few soft bokeh discs. It is drawn already blurred; there is no
  depth-of-field pass, so bubbles in front of it stay sharp.
- **Bubbles**: thin soap films. Clear in the middle, colour toward the rim and in fine bands, sharp glints from the key
  light. Never solid, never opaque.
- **Post**: HDR bloom, Neutral tone mapping (keeps hues; AgX greyed the palette in testing), then a grade with
  saturation, warmth, vignette and film grain seeded by the frame.
- **Caption pill**: bottom centre, the look's caption colours, one line where possible.

## 2. Structure

Four template beats, each one shot: `blow` (the wand blows two streams, camera eases toward the wand), `drift`
(bubbles already in the air ride the breeze, camera tracks across), `pop` (the oldest bubbles pop one by one, camera
pushes in a little), `pool` (bubbles settle onto a shallow pool and pop on the surface; caustics on the tiles). A video
can repeat or reorder them; each scene has its own simulation spec.

The `pool` beat changes the setting from the studio sweep to teal water; continuity QC reports that as palette drift.
Decide per video whether that change is wanted (see `docs/scene3d_design.md` section 15 for the options).

## 2a. Water (the `pool` beat)

- `WATER` in `sim.spec.ts`: rest `level` and `floor` (metres), `waves` (seeded, wavelengths and steepness), `ripples`,
  and the `caustics` area. Pass it as `water={WATER}` to `BubbleShot`; the scene's sim `bounds.min[1]` must equal the
  water level, so a bubble that touches the water pops on it.
- Keep steepness (a k) at or below about 0.04 for indoor water: steeper waves over half a metre focus light into lines
  thinner than a pixel. Caustic brightness is energy-conserving (mean 1); never scale it to "look brighter", lower
  the floor's `sun` and `ambient` in the look instead.
- The floor is flat and tiled; there are no walls and nothing under the water. Bubbles are not reflected in the water.
- Formulas: waves `w^2 = g k + (sigma/rho) k^3`; exact unpolarised Fresnel (n = 1.333); refraction traced to the floor;
  Beer-Lambert absorption with the look's `water.sigma` (per metre, r g b); caustics from the area ratio of refracted
  sun rays (`remotion/src/components/scene3d/water.ts`).

## 3. Simulation rules

- Every scene's motion comes from `scenes/sim.spec.ts` (`SIMS.<scene>`), baked into `scenes/sim.json` by
  `node scripts/three_core_bake_sim.mjs <project>`. The finalize step re-bakes at the storyboard durations.
- Change what happens by editing **events**: `emit` (a blown stream from the wand), `spawn` (one bubble), `pop` (a ray,
  as a tap would), `popOldest`, `stopEmit`. Never hand-edit `sim.json`.
- The bake **fails closed** (writes nothing) on any of: non-finite values, a bubble outside the box margin, speed over
  `vmax`, droplet pool exhausted, the body cap retiring a bubble younger than `minLifetime`, a scripted spawn on top of
  another bubble, or two bakes that differ. Fix the spec; do not loosen a limit without writing why in `brief.md`.
- Keep the action in frame: a smaller `bounds` box keeps bubbles in a medium shot (see the `pop` template).

## 4. Camera

Shot presets in `kit.tsx` (`SHOTS`): `wide`, `wand`, `drift`, `close`, `medium`, `pool` (above the water looking down at
the caustics, easing up toward the bubbles). Slow, eye level or a little below the
bubbles, looking up. Each shot eases from its `from` pose to its `to` pose over the scene. A custom shot is a
`{ from, to, ease }` object with positions in metres.

## 5. Copy rules

- 6 to 16 spoken words per beat (`scripts/review_video.py`). The caption shows the narration.
- Physics claims in narration must be true (soap film colour comes from interference, bubbles pop when the film thins
  or touches something). Cite a source in the brief for anything beyond that.

## 6. Registry keys

Registry keys equal the slug of each scene title (`Blow` -> `blow`), component names end in `Scene`, and every key has
an entry in `SIMS` (the review script checks that `sim.json` covers every scene).

## 7. The live page

`node scripts/three_core_build_html.mjs <project>` writes `projects/<project>/scene.html` from `live/main.ts`: one file,
works offline, three.js (MIT) and postprocessing (Zlib) bundled with their licence notices kept (the build checks).
Controls: hold **Blow** (or Space), drag while blowing to aim (or arrows), tap a bubble to pop (or P for the one in the
centre), drag elsewhere to look around, wheel or pinch to zoom, **Reset** (or R). E saves the session's events as
`events.json`; put them in a scene's `events` to replay that session in the film. Reduced motion halves the breeze and
the droplets. A frame-time governor drops bloom, then resolution, on slow devices.
The pool version: `node scripts/three_core_build_html.mjs <project> --entry live/pool.ts --out pool.html --title "Bubble pool"`.

## 8. Thin-film model and its assumptions

`I(lambda) ~ 2 R (1 - cos(4 pi n d cos(theta_t) / lambda))`, `sin(theta_t) = sin(theta_i) / n`, `n = 1.33`, Schlick
Fresnel with `R0 = 0.02`, sampled at 650, 550 and 450 nm. Assumptions: the two reflections have equal amplitude,
polarisation is ignored, three wavelengths stand in for the spectrum (bands are slightly pastel). Thickness 180 to
800 nm: drainage makes horizontal bands, a slow noise field bends them, and the film thins with age. For hero
close-ups, 8 to 16 wavelength samples or a baked lookup texture would be closer to a real spectrum.

## 9. Determinism and QC

- Before delivery: `python scripts/three_core_check_determinism.py <project> --frames a,b,c` (three PNG renders per
  frame in fresh browsers). Tier 1 is byte-identical; Tier 2 allows max 2 levels and mean < 0.05; anything else
  blocks delivery. Record the tier in `brief.md`. Include a `pool` frame if the video has one.
- Renders and the check both use the bundle's delivery backend from `remotion/scripts/delivery_gl.json` (ANGLE for
  scene3d). A shader that fails to compile fails the render (it is never skipped).
- Then `scripts/continuity_qc.py` as for every bundle.

## 10. Extending the look

New looks go in `LOOKS` (`look.ts`); new shaders in `shade.ts`; new set pieces in `toy.ts`. Engine changes (time,
simulation, checks, build) go in `three-core` and must stay free of colours and look-defining shaders (a test checks).
