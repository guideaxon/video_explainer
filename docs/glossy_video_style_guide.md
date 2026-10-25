# Glossy Style Bundle: Video Style Guide

Style for the **Glossy** style bundle: bright product explainers and launch teasers starring **Pebbo**, a shiny vinyl
collectible toy, **portrait 1080x1920 (9:16, mobile-first)** for TikTok, Reels and Shorts, 25 to 40 s. It is the
"glossy toy 3D-look, option A" of `docs/AnimationStyleGaps.md` section 4: it looks like shiny plastic, but it is drawn
in SVG and CSS (no three.js, no images). Other style bundles have their own guide, kit and skill; do not mix styles.

Implementation: kit `remotion/src/components/glossy/kit.tsx` (pure helpers in `gloss.ts`, tests in `glossy.test.ts`),
template scenes `templates/glossy_video/scenes/`, scaffold `scripts/glossy_new_video.py`, pacing
`scripts/glossy_finalize_storyboard.py`, workflow skill `.claude/skills/glossy_make_video/` (which requires the shared
`video_make_core` skill). Everything is original (Pebbo and all copy are placeholders) and drawn in code.

## 1. Format: mobile first

- **1080 x 1920 at 30 fps.** The project config must be portrait (`video.resolution` 1080x1920).
- Eyebrow pill at y 196, two-line headline in the top third (y 272 to 520), the visual below (y 560 to 1500).
- **Safe zone:** content inside y 160 to 1500 and x 60 to 1020. The `SAMPLE CONTENT` tag sits at y 1530.
- Sizes: headline 112 px (Fredoka 700, up to 96 for long lines), eyebrow 28 px, sub line 40 px, stat number 230 px,
  button label 60 px, chip label 40 px. Nothing under 22 px.
- **Headline width**: Fredoka is about 0.5 em per character, so a 112 px line holds about 16 characters before it
  reaches x 1020 (the line does not wrap: `white-space: nowrap`). Keep lines to 14 characters or fewer.
- No burned-in captions. Each headline is a complete thought and reads muted.

## 2. Look

A glossy vinyl toy world: saturated candy colours on a soft pastel studio sweep, everything chunky and round.

| Tone | Wall / floor | Use |
|---|---|---|
| peach | `#ffece3` / `#ffcdb9` | hook and end card |
| lilac | `#f2ecff` / `#d6c6ff` | problem, features |
| mint | `#e4fbf1` / `#b9eed8` | the fix |
| sky | `#e7f4ff` / `#bfdfff` | how it works |
| butter | `#fff7d9` / `#ffe39a` | numbers and proof |

- `GScene` paints the seamless sweep (a vertical gradient from wall to floor), a soft white key light on the floor and a
  faint vignette. Each tone has its own `ink` (headline), `accent` (the glossy second line) and `dim` (sub lines).
- Candy palette `C`: cherry `#ff4766`, tangerine `#ff8a2a`, lemon `#ffd23a`, mint `#2fd39b`, sky `#3c9dff`, grape
  `#8b5cff`, bubblegum `#ff74c4`, cream, white and plum `#2a0c33`. Never neon, never black: shadows are shaded
  towards plum so candy colours stay saturated.
- **How gloss is built** (the same recipe for every object):
  1. a **volume gradient**: radial, lit top-left (`tint` 55 percent), saturated middle, plum-shaded bottom-right;
  2. a **rim light**: a stroke with a gradient that is clear on the lit side and warm white at the lower-right edge;
  3. a **crisp specular**: a white ellipse or capsule with a hard edge, plus a small round glint;
  4. a **soft sheen**: a broad white radial fade under the specular;
  5. a **contact shadow**: a plum radial-gradient ellipse (not a blur filter) that shrinks as the object lifts.
- Text: `GlossText` is a darker "thickness" copy, a gradient face and a hard white gloss band on the top third. Accent
  lines of the headline and big numbers use it; the first headline line is plain ink.
- Fonts: **Fredoka** (700) for headlines, labels and buttons; **Nunito** (600/800) for sub lines and small caps labels.
- **Pebbo**: an egg-shaped body, a face decal (two big eyes with specular dots, brows, cheeks, a mouth), a cream star
  on the belly, stubby capsule arms with ball hands, capsule legs, chunky cream sneakers with a coloured stripe and a
  gumball antenna. `color` recolours the body, `accent` the antenna and sneaker stripes.
- Building blocks: `Pedestal` (turntable: glossy cylinder, spinning marker and a ring of lights), `ToyBox` (gift box
  the toy pops out of, lid flies off), `Ball` (candy sphere), `Sprinkles` (confetti burst of glossy candy),
  `GlossButton` (chunky 3D button with a pressable face), `Chip` (white glossy pill with a candy dot), `Badge` (coin
  with a number), `Stat` (big glossy count-up number with a label pill), `GlossBars` (capsule bar chart).
- **Gradient ids**: every SVG component calls `useGlossId()` (React `useId` made url-safe) and prefixes all of its
  gradient, clip and filter ids with it, so two toys, two pedestals or a toy inside a box never share an id (the classic
  "second one turns black or takes the first one's colour" bug). Never write a literal `id="body"` in the kit.

## 3. Motion

Springy, with weight.

- **Pops overshoot**: `usePop` is a spring (damping 9, stiffness 170) that overshoots about 15 percent and settles.
  Headline lines, chips, badges, balls and buttons all pop in, staggered by 5 to 12 frames.
- **Squash and stretch**: `squashAt` is a damped wobble about 1 (volume kept). Toy entrances: `enter="pop"` (spring),
  `"drop"` (falls from above, stretches in flight, squashes on landing), `"rise"` (shoots up out of a `ToyBox`,
  lands with a squash), `"none"`. Walking squashes slightly on every footfall; a cheer hops and squashes on landing.
- **Wobble**: the toy sways about 1.3 degrees, breathes 1 percent, and its antenna lags behind movement.
- Numbers count up in about 36 frames and thump when they land; bars spring up with overshoot; the pressed button
  moves down and springs back; confetti is thrown in a fan and falls under gravity (52 frames).
- **Character rig** (`Toy`): talks from `scenes/lipsync.ts`, baked by `scripts/glossy_finalize_storyboard.py` from the
  voiceover (shared `scripts/_lipsync.py`; mouth shapes need Rhubarb, see CLAUDE.md). Import
  `{ LIPSYNC, VISEMES } from "./lipsync"` and pass `mouth={LIPSYNC.<scene>} visemes={VISEMES.<scene>}`. The face
  decal draws a distinct mouth for each Rhubarb shape: A pressed line, B small open with teeth, C open, D wide open,
  E rounded, F puckered ring, G teeth on the lower lip, H tongue up, X a smile. It blinks on the shared rhythm
  (`seed` varies it; blink is on by default). Gestures `wave`, `cheer`, `point`, `shrug` (and `rest`) from
  `gestureAt`; `look` is `camera`, `left`, `right` or `up`. Walking: `walk={{ from, to }}` with `walkTo` (the x to walk
  to); feet land at multiples of PI, the body bobs and waddles. Write `gestureAt={n}` and `walk={{ from: a, to: b }}`
  as plain numbers so `python -m src.cli sound <project> generate` adds a pop and footsteps.
- Transitions are **10-frame plain fades** (`scripts/glossy_finalize_storyboard.py`) with 0.25 s buffers; scenes are
  3.5 to 6 s. The pipeline's default 1.5 s cinematic blur is wrong for this style.

## 4. Story structure (30 to 40 s, 7 scenes)

1. **Unboxing** (peach): a gift box shakes, the lid flies off, Pebbo shoots out, lands and waves. Hook.
2. **Too Much Stuff** (lilac): the problem, three chips pop in, Pebbo drops in and shrugs.
3. **One Button** (mint): Pebbo points at a big candy button; it is pressed and confetti bursts.
4. **Three Easy Steps** (sky): three number coins, Pebbo walks across the floor.
5. **The Big Number** (butter): a glossy count-up and a capsule bar comparison, Pebbo cheers.
6. **Turntable** (lilac): Pebbo on the spinning pedestal with feature chips. The "product shot".
7. **Get Yours** (peach): end card: cheering Pebbo on a pedestal, a Download button, the store line.

Drop or repeat the middle scenes to fit the story; keep the hook, one proof scene and the end card.

## 5. Copy and data rules

- 6 to 12 spoken words per scene, friendly, short sentences, second person.
- **Never invent numbers or claims.** The template values (2x, 10 and 5 min, the chips, the store line) are SAMPLE
  content (`SAMPLE CONTENT` tag). Replace each with a real, sourced figure, or remove the scene.
- Pebbo is a fictional toy, not a real product mascot. Replace the name and wording with the real product's.
- No real brand, logo or store badge is drawn; say where the product is available in text only.

## 6. Pipeline notes (full video, portrait)

- Registry keys in `projects/<p>/scenes/index.ts` must equal the slug of each scene title (`_title_to_scene_key` in
  `src/cli/main.py`; leading The/A/An dropped): "Too Much Stuff" gives `too_much_stuff`. Component names end in `Scene`;
  keys unquoted. `tests/test_glossy_template.py` checks the template.
- Storyboard order: `review_video`, `radio_cut`, `voiceover`, then `scripts/glossy_finalize_storyboard.py` (replaces
  the `storyboard` step), then `render`.
- Output loudness is about -20 LUFS; normalise for social with
  `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final_social.mp4`.
- The shorts scene generator hook (`src/short/style_bundles.py`) is Vantage-only; Glossy scenes are hand-adapted from
  the template.
- Fonts (Fredoka, Nunito) load from Google Fonts: the first render needs internet.

## 7. Render cost: measured

Measured with `npx remotion render ... --frames=0-59 --concurrency=1` on 1080x1920 (wall time divided by 60,
**including about 6 s of browser start-up**, so the true per-frame cost is lower):

| Scene | ms per frame |
|---|---|
| Get Yours (toy, pedestal, 30 confetti, button) | about 285 |
| The Big Number (stat, bars, toy) | about 195 |
| Unboxing (box, toy, confetti) | about 190 |

Real cost is about 100 to 180 ms per frame. How it stays cheap: **no blur or turbulence filters at all**. Soft shadows,
sheen and the studio vignette are radial gradients (no `feGaussianBlur`); gloss is gradients plus crisp white shapes;
there are no image textures. The only large layers are the CSS gradient background and a few `box-shadow`s on small
chips and buttons. Keep it that way: do not add a full-frame blur for depth of field or glow.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (glossy style)

One Remotion scene per beat, **1080x1920 portrait**, built only from the glossy kit:
`import { GScene, Eyebrow, Headline, Sub, Stage, Toy, Pedestal, ToyBox, Ball, Sprinkles, GlossButton, Chip, Badge, Stat, GlossBars, SampleTag, C } from "@remotion-components/glossy/kit";`
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export) and wrap content in
`<GScene tone="peach"|"lilac"|"mint"|"sky"|"butter">`. Type system: `Eyebrow`, then `Headline lines={["Line one.", "*Line two."]}`
(second line glossy accent, 14 characters per line at most), then optional `Sub`. Headline top third (y 196 to 520), visual
below (y 560 to 1500), content inside x 60 to 1020 and y 160 to 1500. SVG pieces (`Toy`, `Pedestal`, `ToyBox`, `Ball`,
`Sprinkles`, `GlossBars`) go inside `<Stage>`; HTML pieces (`GlossButton`, `Chip`, `Badge`, `Stat`, `Sub`) go outside it.
The toy: `<Toy x y scale enter="pop"|"drop"|"rise" gesture="wave"|"cheer"|"point"|"shrug" gestureAt={n} walk={{ from, to }} walkTo mouth={LIPSYNC.id} visemes={VISEMES.id} />`
with literal numbers. Glossy candy colours on pastel only, springy overshoot motion, original character, no real brands or
invented data. Everything animates in within about 40 frames.
<!-- LLM-BRIEF-END -->
