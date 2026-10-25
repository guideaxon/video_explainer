# Clay Style Bundle: Video Style Guide

Style for the **Clay** style bundle: cosy claymation explainers starring **Tuck**, an original plasticine figure on a
table-top set, **portrait 1080x1920 (9:16, mobile-first)** for TikTok, Reels and Shorts, 25 to 40 s. Other style
bundles have their own guide, kit and skill; do not mix styles. Everything is drawn in code (no image files, no
`Math.random`), and the look follows `docs/AnimationStyleGaps.md` sections 4 and 5.6.

Implementation: kit `remotion/src/components/clay/kit.tsx` (helpers `geom.ts`, `letters.ts`, `textures.ts`, tests
`clay.test.ts`), template scenes `templates/clay_video/scenes/`, scaffold `scripts/clay_new_video.py`, pacing
`scripts/clay_finalize_storyboard.py`, workflow skill `.claude/skills/clay_make_video/` (requires `video_make_core`).

## 1. Format: mobile first

- **1080 x 1920 at 30 fps.** The project config must be portrait (`video.resolution` 1080x1920).
- One full-frame SVG per scene (`ClayScene`). Eyebrow at y 168, headline y 250 to 560, a sub line or speech bubble at
  y 600 to 860, stat card at y 600 to 980, **wall visual to y 1240, felt table top y 1240 to 1530** (Tuck and props stand
  on `TABLE_Y` = 1420). The table apron below 1530 stays empty (platform UI covers it).
- **Safe zone:** content inside y 160 to 1500, x 60 to 1020.
- Sizes: headline cap height up to 118 px (lines shrink to fit 920 px), eyebrow 30 px, sub and bubble text 44 px,
  bar labels 32 px, stat label 36 px, stat number cap up to 220 px. Nothing under 24 px.
- No burned-in captions. Each headline must be a complete thought (it must read muted).

## 2. Look

Matte, soft-shaded plasticine on felt and cardboard, lit by a warm lamp.

- **Clay shapes**: every shape is a lumpy closed path (`blobPath`: smooth spline through control points, each pushed in
  or out by a fixed seeded lump of 2 to 5 percent) filled with a soft radial gradient (lighter upper left, darker lower
  right, no specular highlight), a baked fingerprint and lump texture multiplied over it, and a faint darker rim.
  Soft two-step drop shadows fall down-right (light from the upper left); contact shadows are radial gradients, never blurs.
- **Palette** (`CLAY`): teal `#3d9a91`, mustard `#e2a42b`, coral `#e5674b`, red `#c94434`, cream `#f1e1c2`, white `#f9f1e2`,
  brown `#8c5b3b`, chocolate `#4e3123`, green `#68a64c`, blue `#4d7cc0`, purple `#8a6ab4`, pink `#ec97a6`, gold `#e8b636`.
- **Sets** (`ClayScene tone=`): `card` (corrugated cardboard wall, green felt table: hook and data), `night` (deep blue
  felt wall, mustard felt table: evening and gag scenes), `rose` (dusty rose felt wall, teal felt table: numbers and
  wrap-up). Felt gets fibre texture and a stitched edge; cardboard gets flutes. `lamp={x}` stands the clay desk lamp
  on the table; it switches on at `lampOn` and pools warm light (a flickering gradient). Every scene has a warm glow and a vignette.
- **Type**: Fredoka 500/600 for small text (eyebrow felt ribbon, cardboard sub tags, bubbles, labels).
  Headlines and numbers are **clay letters**: chunky snakes rolled from rounded strokes (`letters.ts`), each letter
  slightly rotated and offset, with the clay texture. `Title rainbow` gives every letter its own colour (hook only);
  otherwise line 1 is white or cream and `*line 2` uses the set's accent clay.
- **Cards**: cardboard (stat card, bubble, tags) cut with slightly wobbly edges and an offset shadow; labels on felt
  strips with white stitching.
- **Character**: Tuck, a teal bean with a mustard bobble hat, bead eyes under heavy clay lids, coral nose, cream belly,
  pink cheeks with freckles and red shoes. Original; no resemblance to existing clay characters. About 700 px tall at
  scale 1; use scale 0.5 to 0.85.
- Props: `Mug` (cotton-wool steam), `Plant`, `Pot` (coin pot), `Coin`, `Stack` / `Bars` (hand-stacked pucks as a bar
  chart), `Lamp`. Add new props to this kit, never import another bundle's.

## 3. Motion: stop-motion on twos

- **Held-frame clock.** The pipeline is fixed at 30 fps. The kit animates on `hf = heldFrame(frame)`, built from
  `Math.floor(frame * 12 / 30)`: 12 poses per second, so every animation holds 2 or 3 real frames and then jumps. Use
  `useClayClock()` (`frame`, `hf`, `pose`) in any new component and evaluate animation at `hf`. Springs, count-ups,
  falls, walks, steam and the lamp flicker all run on `hf`.
- **Boil.** Each pose change adds a seeded 1 to 2 px shift to outline points and positions (`boil`, `blobPath`), as if
  the animator touched the clay. Same pose, same shift: renders are repeatable.
- Entrances squash and stretch in a few poses (letters press in two frames apart, props pop with a spring on held frames).
- **Gag**: `Stack toppleAt` knocks the tower over (top pucks first, tumbling); `Title sagAt` droops and squishes the
  headline. One mishap per video.
- **Tuck rig** (shared contract `remotion/src/components/rig/`, timing only; drawing is Tuck's own):
  - Talks from `scenes/lipsync.ts` (`mouth={LIPSYNC.<key>} visemes={VISEMES.<key>}`), baked at 30 fps by
    `scripts/clay_finalize_storyboard.py`. The arrays are indexed with the held frame, so the mouth holds for the held
    pose. **One replacement mouth piece per Rhubarb shape**, as real claymation swaps sculpted mouths: A pressed-lips
    snake, B slight gap with teeth, C open with tongue, D wide open, E rounded, F puckered clay lip ring, G teeth on a
    lower-lip roll, H tongue up, X resting smile. Brows lift while he talks.
  - Blinks on the shared rhythm (`blinkAt`, `seed` varies it) with clay lids sliding down over the bead eyes.
  - Gestures `wave`, `point`, `shrug`, `cheer` (and `rest`) from `gestureAt={n}`, easing in over 14 frames, from
    `gestureFrom` back. Walk: `walk={{ from, to }}` with `x` and `walkTo`: feet land at multiples of PI, body bob, arms
    swing. Write `gestureAt` and `walk` as plain numbers so `python -m src.cli sound <p> generate` adds pops and footsteps.
  - `look` (`camera`, `left`, `right`, `up`, `down`) moves the pupils. `hat` recolours the bobble hat.
  - Face crop for thumbnails: render `<Tuck x={540} y={1100} scale={1} />` in a `ClayScene` and crop the square
    (300, 380) to (780, 860) of the 1080x1920 frame.
- Transitions are **6-frame plain fades with 0.3 s buffers** (`scripts/clay_finalize_storyboard.py`): a quick change of
  set-up, as between stop-motion shots. The pipeline's default 1.5 s cinematic blur is wrong for this style.

## 4. Story structure (28 to 35 s, 7 scenes)

1. **Hello Tuck** (card, lamp): lamp clicks on, Tuck walks in and waves; rainbow clay title.
2. **The Big Number** (rose): clay stat card counts up, Tuck points.
3. **The Coin Pot** (night, lamp): coins drop into the pot, speech bubble, Tuck shrugs.
4. **Four Stacks** (card): clay bar chart of stacked pucks, Tuck points.
5. **The Plan** (rose): mug, plant and Tuck cheering.
6. **Oops** (night, lamp): the tower topples, the headline droops, Tuck shrugs.
7. **Tuck Out** (rose): Tuck cheers, cardboard sign-off.

Drop or repeat scenes to fit the story; keep the walk-in, one stat or chart, the mishap and the sign-off.

## 5. Copy and data rules

- 6 to 12 spoken words per scene, warm and a little dry, short fragments.
- **Never invent numbers or claims.** Template values (12.4%, the bar heights, the coins) are SAMPLE content
  (`SAMPLE CONTENT` tag). Replace each with a real, sourced figure, or keep the piece plainly fictional.
- Tuck is a fictional character: keep the sign-off plainly "made by hand", not a claim of authority.

## 6. Pipeline notes (full video, portrait)

- Registry keys in `projects/<p>/scenes/index.ts` must equal the slug of each scene title (`_title_to_scene_key` in
  `src/cli/main.py`; leading The/A/An dropped); component names end in `Scene`; keys unquoted.
  `tests/test_clay_template.py` checks the template (keys, files, imports only the clay kit and `rig`, literal rig props).
- Order: `review_video`, `radio_cut`, `voiceover`, `scripts/clay_finalize_storyboard.py` (replaces `storyboard`), optional
  `sound generate`, `render`. Rhubarb: set `RHUBARB_BIN` or put it on PATH, else mouth openness only.
- Fredoka loads from Google Fonts: the first render needs internet.
- Output loudness is about -20 LUFS; normalise for social with
  `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final_social.mp4`.

## 7. Render cost

- **No SVG filters at all.** Textures (clay lumps and fingerprint whorls, felt fibres, cardboard flutes) are seeded noise
  drawn **once** to a 256 px offscreen canvas per page (`textures.ts`, cached), turned into a PNG data URL and used as a
  tiled SVG `<pattern>` overlaid on shapes. Shadows and light are radial and linear gradients. Nothing uses `feTurbulence`
  or blur. Rendering waits (`delayRender`) until the texture images are decoded.
- Cost scales with path count (a Tuck is about 40 textured paths, a headline about 6 per letter).
- Measured at 1080x1920 on the development machine: about 80 ms per frame for the heaviest scene (Oops: Tuck, lamp, topple, 9 pucks; 120 frames, single thread, Chrome via Remotion), and a full 32 s 7-scene sample (961 frames) rendered in 72 s including bundling and encoding.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (clay style)

One Remotion scene per beat, **1080x1920 portrait**, built only from the clay kit:
`import { ClayScene, Eyebrow, Title, Sub, Bubble, StatCard, ClayNumber, Bars, Stack, Mug, Plant, Pot, Coin, Tuck, SampleTag } from "@remotion-components/clay/kit";`
and `import { LIPSYNC, VISEMES } from "./lipsync";`. Export `XxxScene: React.FC<{ startFrame?: number }>` (default
export) and wrap content in `<ClayScene tone="card"|"night"|"rose" lamp={x}?>`; children are SVG elements in a
1080x1920 user space (not HTML). Type system: `Eyebrow`, then `Title lines={["Line one", "*Line two."]}` (second line
accent), then optional `Sub` or `Bubble`. Headline y 250 to 560, visual y 560 to 1240, table y 1420 (props stand on it),
content inside x 60 to 1020 and y 160 to 1500. Tuck: `<Tuck x scale from? gesture="wave|point|shrug|cheer" gestureAt={n} walk={{ from: a, to: b }} walkTo={x} mouth={LIPSYNC.key} visemes={VISEMES.key} seed />`;
use literal numbers for `gestureAt` and `walk`. Matte plasticine only: no gradients of your own, no blurs, no real
brands or invented data. Everything animates in within about 30 frames, on the held clock inside kit components.
<!-- LLM-BRIEF-END -->
