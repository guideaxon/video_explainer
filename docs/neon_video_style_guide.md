# Neon Style Bundle: Video Style Guide

Style for the **Neon** style bundle: neon synthwave stories and explainers, **portrait 1080x1920 (9:16)**, 25 to 35 s,
starring **Tubo**, an original synth robot whose whole body is glowing tubes. Other style bundles have their own guide,
kit and skill; do not mix styles. Everything is drawn in code (no images, no `Math.random`), so renders repeat exactly.

Implementation: kit `remotion/src/components/neon/kit.tsx` (plus `core.ts` pure helpers, `glow.tsx`, `character.tsx`),
template scenes `templates/neon_video/scenes/`, scaffold `scripts/neon_new_video.py`, pacing
`scripts/neon_finalize_storyboard.py`, skill `.claude/skills/neon_make_video/` (requires `video_make_core`).

## 1. Format

- 1080 x 1920 at 30 fps; `video.resolution` must be portrait. Safe zone x 60..1020, y 160..1500.
- Eyebrow at y 200, headline from y 270 (96 to 150 px), visual from y 600. Default horizon y 1180; the grid below
  it is background only (keep text out of y > 1500).
- Headline: Orbitron 900 is about 0.92 em per caps character, so at 112 px a line holds about 9 characters
  (the kit shrinks longer lines to fit 940 px). Sub lines Tilt Neon 46 px, VHS labels VT323 42 to 58 px. Nothing under 30 px.
- No burned-in captions; every headline is a complete thought.

## 2. Look

| Element | Rule |
|---|---|
| Night | `#0b0118` deep purple-black, sky warming to a magenta haze at the horizon |
| Palette | hot pink `#ff2bd6`, cyan `#22e6ff`, purple `#9d4dff`, orange `#ff8a1f` (plus yellow for the sun, white cores) |
| Shapes | **stroke-only** tubes (a night fill may occlude what is behind; never a bright fill) |
| Glow | every stroke is stacked copies: wide faint halo, mid glow, the tube, white-hot core (`Neon`) |
| Floor | perspective grid receding to the horizon, scrolling toward the viewer (`Horizon`) |
| Sun | gradient disc with horizontal gaps that thicken downward and scroll; sinks in the outro |
| Mountains | wireframe ridge with strut lines, a notch in the middle for the sun |
| Atmosphere | seeded starfield that twinkles, scanlines, a slow VHS roll band, vignette |
| Type | **chrome** lines (sky-to-pink gradient, horizon cut, pink extrusion) then a `*` **neon outline** line |

Kit parts: `NScene`, `Horizon`, `Eyebrow`, `Headline`, `Sub`, `NeonText`, `NeonCounter` (stat), `EqBars` (equaliser
chart), `Cassette`, `VhsChip`, `Sign`, `Car`, `Neon`, `Tubo`.

## 3. Motion

- Headline lines switch on like a CRT (vertical squash) 6 frames apart; tubes power on with a stutter (`powerOn`).
- **Flicker** (`flickerAt(frame, seed)`): a tube buzzes off/on for 9 frames in about a third of 3 s slots; pure function of frame and seed.
- Floor speed: 0.02 to 0.04 depth units per frame when talking, 0.12 when driving. Sun stripes scroll at 0.004 per frame.
- Counters count up in about 36 frames; equaliser segments light bottom up (exact count = value/max of 14 rows), peak caps hover.
- **Character rig (Tubo)**: `mouth`/`visemes` from `scenes/lipsync.ts` (a distinct neon mouth for each Rhubarb shape A to H and X),
  blinks = the eye tubes flick off (`blinkAt`, `seed` varies it), gestures `wave`, `point`, `cheer`, `shrug` (`gestureAt={n}`),
  walk (`walk={{ from, to }}`, `walkTo`, feet land at multiples of PI, arms swing), a chest equaliser that follows the voice.
  Use literal numbers for `gestureAt` and `walk` so `python -m src.cli sound <p> generate` gets footstep and pop cues.
- Transitions: **10-frame plain fades**, 0.3 s buffers (`neon_finalize_storyboard.py`); scenes 3 to 5 s.

## 4. Story structure (25 to 35 s, 7 scenes)

1. **Drive In** (hook): the car drives toward the sunset on a fast grid, VHS chip, "Night drive".
2. **Title**: chrome + neon title, one neon sign line.
3. **Meet Tubo**: Tubo walks in and waves.
4. **The Big Number**: neon counter, Tubo points.
5. **Levels**: equaliser bar chart.
6. **Mixtape**: cassette reveal, Tubo cheers.
7. **Sunset** (outro): the sun sets, Tubo waves goodbye.

## 5. Copy and data rules

- 5 to 12 spoken words per scene. Never invent numbers: template values (300%, the bars, the label) are SAMPLE content
  with a `SampleTag`; replace with real, sourced data or keep it plainly fictional.
- Tubo and the car are original. Do not add real brands, band names or song titles.

## 6. Pipeline notes

- Registry keys must equal the slug of each scene title (`drive_in`, `title`, `meet_tubo`, `big_number`, `levels`, `mixtape`,
  `sunset`); components end in `Scene`; keys unquoted. `tests/test_neon_template.py` checks the template.
- Order: `review_video`, `radio_cut`, `voiceover`, `scripts/neon_finalize_storyboard.py` (bakes lip sync; set `RHUBARB_BIN`
  for mouth shapes), `render`.
- Fonts (Orbitron, VT323, Tilt Neon) load from Google Fonts: the first render needs internet.

## 7. Character: Tubo

Rounded CRT head with wedge sunglasses, antenna bulb, side bolts, rounded torso with a five-bar equaliser, tube arms and legs,
boots and hands. Body colour `color` (cyan), face, hand and boot accent `accent` (pink). Mouth tubes: A flat line, B slim pill with
centre line, C oval, D tall oval with tongue arc, E round, F small pucker, G teeth on lip, H oval with tongue, X smile.
About 690 px tall at scale 1; use scale 0.55 to 0.9.

## 8. Do and don't

- Do keep one hero colour per area: pink carries the floor and headline, cyan the character.
- Don't use `feGaussianBlur` or `filter: blur` on full-frame layers; don't put text over the bright sun without a night-filled sign.

## 9. Render cost: measured ms per frame

Glow is the main cost of this style, so the kit uses **no blur filters at all**: `Neon` paints each stroke 3 to 4 times
(wider copies at 10 to 30 percent opacity under the tube, plus a thin white core). Textures are CSS gradients and a
repeating-linear-gradient scanline layer. Measured on this machine, `remotion render --concurrency=1`, 60 frames, 1080x1920
(per-frame times from the verbose log): Drive In (fast grid, sun, mountains, car) about 80 to 100 ms per frame; Meet Tubo (grid, sun
and the walking robot) about 120 to 135 ms; Levels (grid and 56 outlined segments) about 75 to 95 ms. A full 29.5 s sample
(885 frames, bundling and audio included) rendered in 63 s. The grid is the heaviest part (about 35 lines, 3 copies each); lower
`far` in `gridRows` only if a scene needs more headroom.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (neon style)

One Remotion scene per beat, **1080x1920 portrait**, built only from the neon kit:
`import { NScene, Horizon, Eyebrow, Headline, Sub, NeonCounter, EqBars, Cassette, VhsChip, Sign, Car, Tubo, SampleTag } from "@remotion-components/neon/kit";`
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export) and wrap content in `<NScene>` with a `<Horizon />`
under the content. Type system: `Eyebrow`, then `Headline lines={["Chrome line.", "*Neon line."]}`, optional `Sub`. Headline in
the top third, visual y 600 to 1500, content inside x 60 to 1020 and y 160 to 1500. Stroke-only glowing shapes (use `Neon`), no blur
filters, original art, no real brands or invented data. Tubo takes `gesture`, `gestureAt`, `walk`, `mouth`, `visemes`
(import `LIPSYNC`, `VISEMES` from "./lipsync"). Everything animates in within about 30 frames.
<!-- LLM-BRIEF-END -->
