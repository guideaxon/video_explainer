# Storybook Style Bundle: Style Guide

Style for the **Storybook** style bundle: a short illustrated film (landscape 1280x720, 30 fps) told as one
continuous visual metaphor with a recurring small cast, hand-painted still artwork and slow camera moves. Reference
for the look and structure: `docs/launch_film_breakdown.md`. Other style bundles have their own guide, kit and skill;
do not mix styles. Do not copy another film's characters, set or copy: take the structure and technique only.

Implementation: kit `remotion/src/components/storybook/kit.tsx` (character layer: `character.tsx`, pure helpers `paint.ts`), templates `templates/storybook_video/scenes/`,
scaffold `scripts/storybook_new_video.py`, stills generator `scripts/storybook_stills_comfy.py`, finalize
`scripts/storybook_finalize_storyboard.py`, skill `.claude/skills/storybook_make_video/`.

## 1. Look

- Warm hand-painted children's-book illustration: cream, terracotta, teal, sky blue, soft window light, paper grain.
- One **set** (the workshop, inside and out) and a **cast of at most three** that recurs in every shot: a child
  protagonist, one helper, and a hand (the user) entering from the screen edge.
- Almost no text on screen until the end card. Narration or a music bed carries the story.
- Palette tokens: `PAPER #fbf1de`, `INK #3a2a20`, `TERRACOTTA #c8553d`, `TEAL #2f7d80`, `SKY #bcd8e8`.

## 2. Structure

Eight beats of about 4 s (30 to 36 s total): idea in, workshop reveal, script, storyboard, voice, approval gate, production,
results wall plus end card. A beat is one painted still (`art/<id>.png`, 1280x720 or larger) shown by `PaintedShot`
with one slow move (push-in, pull-out or pan). Cuts are dissolves (storyboard transition style fade, 14 frames).
Only a few beats need real motion (a hand moving an object): use a transparent cutout layer (`Cutout`) or an
image-to-video clip, never more than three clips per film.

## 3. Art rules (stills)

- Every prompt starts with the **style line** and the **cast lines** from `art/style.json` so look and characters
  stay fixed; only the shot description changes.
- Generate 16:9, then review the contact sheet. Reroll with a new seed for wrong hands, extra characters or style
  drift; keep a rejected shot out of the film instead of fixing it in Remotion.
- Run `scripts/continuity_qc.py --project <p> --refs projects/<p>/art/refs` before delivery. Same character, same
  outfit, same set layout across shots is the bar; with SD1.5-class models expect to reroll often.
- Never use real people, brands, logos or copyrighted characters in prompts.
- **Plates.** A shot where the code-drawn character (section 7) appears is generated as an empty **plate**: set
  `"plate": true` on the shot in `art/style.json`. The generator then drops the cast and canon lines, adds "empty scene,
  no people, clear empty open floor or ground in the lower middle" and a people negative. Describe the set so there is a
  clear, roughly flat ground area (floor, cobbles, desk top) about 25 to 45 percent of the frame height where she will
  stand, and note its pixel coordinates from the still. Shots without `plate` are built exactly as before, and scenes
  whose stills have the character painted in (`"cast": true`) are unchanged. Do not mix both for the same character in
  one scene.

## 4. Copy and data rules

- Narration 5 to 14 words per beat, plain and concrete. No unsupported numbers or claims.
- End card: title (max 4 words) plus one pill button. The button text must be a real call to action that exists.

## 5. Motion rules (kit)

- `PaintedShot`: scale 1.0 to 1.08 over the beat, eased, with a slow 20 to 40 px drift. Never zoom faster.
- Overlay `Grain` at about 8 percent. Fade in 8 frames, out 8 frames (the dissolve comes from the storyboard transition).
- The kit designs in 1280x720 and scales to the render size (the renderer uses 1920x1080). Safe zone in design units: x 80 to 1200, y 60 to 660.

## 6. Registry keys

Registry keys in `scenes/index.ts` equal the slug of each scene title ("The Idea" gives `idea`), as in the other full-video
bundles. Component names end in `Scene`.

## 7. Code-drawn character layer (Wren)

Painted stills cannot blink or talk, so a scene over a plate draws **Wren** (`remotion/src/components/storybook/character.tsx`):
a small girl in a brown cap, round glasses, terracotta scarf and teal overalls (the template's cast line). She is SVG, but
reads as painted: each shape is a wash (base paint slightly off-register, a light/shadow glaze, pigment grain and a darker
pooled edge), the figure passes through one small displacement-and-soften filter, and a soft contact shadow sits at her feet.
The grain and the edge-wobble map are generated once per seed in code (seeded value noise to an offscreen canvas to a data
URL used as an SVG pattern); there is no full-frame or per-frame `feTurbulence`, and blur is limited to the character layer.
Paints come from the palette in section 1 plus skin, hair, cap and boots in warm earth tones.

Motion uses only the shared rig contract (`remotion/src/components/rig/`): `mouth` / `visemes` (one mouth per Rhubarb shape
A to H and X), `blink` and `seed` (`blinkAt`), `gesture` + `gestureAt` (`rest`, `wave`, `point`, `think`, `open`, `cheer`,
with `gestureFrom` to blend), `walk={{ from, to }}` with `walkTo` (and `walkToY`, `walkToScale` to walk into depth; she
faces the walk direction), and `look`. Lip sync data comes from `scenes/lipsync.ts`, baked by
`scripts/storybook_finalize_storyboard.py`; without voiceover set `talking` for a syllable rhythm.

Composition in a scene:

```tsx
<PaintedShot art="art/voice.png" move="pan-left">
  <OnStill>
    <Wren x={640} y={650} scale={0.9} mouth={LIPSYNC["voice"]} visemes={VISEMES["voice"]} gesture="open" gestureAt={20}
          light={{ x: -0.4, warmth: 0.6, strength: 0.5, tint: "#e9cfa0" }} />
  </OnStill>
  <Foreground points={[[0, 700], [900, 690], [900, 720], [0, 720]]} />   {/* optional: counter drawn over her feet */}
</PaintedShot>
```

- `OnStill` is an SVG layer in **still coordinates** (1280x720, the still at scale 1) that applies the same translate and
  scale as the still, so `(x, y)` (the ground point between the feet) stays glued to the painted ground through the push-in,
  pull-out or pan. Read the ground point and the scale (about 270 units tall at `scale` 1) off the plate.
- `Foreground` redraws the still masked to a polygon (still coordinates, soft `feather`) after `OnStill`, so a pot, counter
  or door frame covers her feet or lower body. Static mask, rasterised once.
- `light`: `x` light direction (-1 left to 1 right; sets glaze, rim light, shadow throw), `warmth` 0 cool to 1 warm, `tint` a
  colour sampled from the plate, `strength` of shading and shadow. Match it to the window or lamp in the still.
- Scale to the plate's perspective (smaller further back); keep her out of the grain-free top third.

Cost: with her in the scene a 1920x1080 render took about 190 ms per frame single-threaded (60 frames in about 11.3 s
including 4.2 s start-up, against 10.6 s for the same still with no character), so she adds roughly 10 to 15 ms per frame.
