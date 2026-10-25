# Rubberhose Style Bundle: Video Style Guide

Style for the **Rubberhose** style bundle: short retro cartoons with a 1930s feel starring **Kip**, an original
rubber-hose tea kettle, **portrait 1080x1920 (9:16, mobile-first)** for TikTok, Reels and Shorts, 25 to 40 s. Other
style bundles have their own guide, kit and skill; do not mix styles.

Technique is from `docs/AnimationStyleGaps.md` section 4 (retro rubber-hose 2D): limbs are curves with no elbows or
knees, pie-cut eyes, white four-finger gloves, round shoes, squash and stretch, a constant bounce, animation "on
twos", and film damage. **Only the period technique is reused**: Kip, the props and the copy are original (no Mickey,
Felix, Cuphead or Bendy lookalikes).

Implementation: kit `remotion/src/components/rubberhose/kit.tsx` (pure helpers in `film.ts`, tests in
`rubberhose.test.ts`), template scenes `templates/rubberhose_video/scenes/`, scaffold
`scripts/rubberhose_new_video.py`, pacing `scripts/rubberhose_finalize_storyboard.py`, workflow skill
`.claude/skills/rubberhose_make_video/` (which requires the shared `video_make_core` skill).

## 1. Format: mobile first

- **1080 x 1920 at 30 fps.** The project config must be portrait.
- Eyebrow + headline in the top third (y 190 to 520), the stage below, ground line at y 1440 (the ground tone fills
  to the bottom).
- **Safe zone:** content inside y 160 to 1500 and x 60 to 1020. Kip at scale 1.2 is about 740 px tall.
- Sizes: headline 104 px (Corben bold), eyebrow 34 px (Limelight), sub line 42 px, sign text 58 px, title card 120 px.
  Nothing under 24 px.
- **Headline width**: Corben bold is about 0.5 em per character, so at 104 px a line holds at most 13 characters.
- No burned-in captions. Each headline must be a complete thought (it must read muted).

## 2. Look

Sepia, ink-black and one muted red. Flat fills, thick ink outlines (8 to 12 px), no gradients except the film layer.

| Tone | Value |
|---|---|
| `paper` | `#ece0c3`, ground `#d8c59c`. Most scenes |
| `ink` | `#241a11`, cream type, gold accent. The idea scene |
| `stage` | `#d8c59c` with turning sunburst rays. Title and end card |

- Palette (`C` in the kit): paper `#ece0c3`, ink `#1b140d`, enamel `#f6ecd4`, glove `#fbf6ea`, umber `#5a4630`,
  brick red `#9c3b22` (the accent), old gold `#d9aa52`, rose `#cf9478` (cheeks, rare). No other colours.
- Fonts: **Corben** (700) headlines and signs, **Limelight** (Art Deco caps) eyebrows and title cards,
  **Yesteryear** script for "That's all!" only.
- Type system: **eyebrow** (Deco label between double rules), then a **two-line headline** (first line ink, second
  line brick) with a soft sepia drop shadow, then an optional sub line.
- **Film layer** (`FilmFx`, inside every `RScene`): grain, flicker, vignette, dust specks and scratches, plus **gate
  weave** (the whole frame jitters 1 to 3 px per drawing, with an occasional bigger hop).
- **Title card** (`TitleCard`): Art Deco frame with stepped corners, double rule, sunburst fans and a kicker. **End card**
  (`EndCard`): drum-head rings with "That's all!". Both pop in with squash.
- **Kip**: cream enamel kettle body with an ink lid, knob, bail handle and spout; pie-cut eyes (white eye with a wedge
  cut out of the ink pupil), rosy cheeks, button nose; noodle arms with white four-finger gloves (three fingers and a
  thumb, cuff, stitch lines) and bow legs with big round shoes. Props: `Clock` (alarm clock on hose legs), `Cup`,
  `Sign`, `Bulb`, `Puff`, `Stars`, `Ground`.

## 3. Motion

- **On twos.** The renderer is fixed at 30 fps; the kit exposes a held-frame clock, `useHeld()`, giving the real
  `frame`, `hf` (the frame the current drawing started) and `d` (drawing index, `Math.floor(frame * 12 / 30)`).
  Character, props, springs, grain offset, weave and flicker all use it, so everything steps 12 times a second.
  **Lip sync arrays are 30 fps: Kip indexes the mouth with the real frame**, not `hf`.
- **Rubber-hose limbs**: `hosePath(shoulder, hand, restLength, bend)` draws one cubic that keeps its length, so as the
  hand comes closer the limb bows like a noodle. Never draw a limb as two segments.
- **Constant bounce**: Kip bobs on a 120 bpm beat (`bounceAt`) with squash and stretch (`squash`) all the time;
  props that should join in (the cup) use the same beat. Walking replaces the bounce with a footfall bob.
- Headlines, cards and props enter with an overshooting spring plus squash and stretch (never a plain slide).
- **Iris**: `RScene iris="in"` opens a black iris in 18 frames; `iris="out"` closes over 20 frames and holds black
  for the last 6, so the cut to the next scene is invisible. Centre it on the face with `irisAt`.
- **Character rig** (`Kip`, shared contract `remotion/src/components/rig/`): `mouth`/`visemes` from `scenes/lipsync.ts`
  (one distinct mouth for each Rhubarb shape A to H and X: line, flat grin, teeth, wide with tongue, round,
  pucker, teeth on lip, tongue up), `blink` (shared `blinkAt`, `seed` varies it), `gesture` (`wave`, `point`,
  `shrug`, `toot`, `rest`) with `gestureAt` (and `hold`: frames before it eases back), `walk={{ from, to }}` with
  `walkTo` (foot lands at multiples of PI; flips toward `walkTo`), `look` (`camera`, `left`, `right`, `up`).
  Write `gestureAt={n}` and `walk={{ from: a, to: b }}` as plain numbers so `python -m src.cli sound <p> generate` adds
  a pop and footsteps.
- Transitions are **6-frame plain fades** with 0.3 s between scenes (`scripts/rubberhose_finalize_storyboard.py`);
  the iris scenes already cut through black. The default 1.5 s cinematic blur is wrong for this style.

## 4. Story structure (about 30 s, 7 scenes)

1. **Opening Title** (stage, iris in): Deco title card, Kip waves below it.
2. **Meet Kip** (paper): big Kip waves and introduces himself.
3. **The Problem** (paper): Kip walks in, the clock rings, a shrug.
4. **The Gag** (paper): Kip toots, steam puffs, dizzy stars.
5. **The Idea** (ink): the bulb lights, Kip points.
6. **The Fix** (paper): sign with the three steps, the cup, Kip toots happily.
7. **That's All** (stage, iris out): drum-head end card, wave, the iris closes on Kip's face.

Keep the opening, the character beat, one gag, the solution and the iris-out end card; repeat or drop the middle.

## 5. Copy and data rules

- 6 to 14 spoken words per scene, short and cheerful, a little corny, 1930s radio tone. One joke per scene at most.
- **Never invent facts or numbers** and never present a made-up claim as real. The template story is fictional and
  carries the `SAMPLE CONTENT` tag on the first scene; remove it with the sample text.
- Kip is a fictional character. Do not name a real person or brand.

## 6. Pipeline notes (full video, portrait)

- Registry keys in `projects/<p>/scenes/index.ts` must equal the slug of each scene title (`_title_to_scene_key`;
  leading The/A/An dropped, punctuation removed): "That's All" gives `thats_all`. Component names end in `Scene`;
  keys unquoted. `tests/test_rubberhose_template.py` checks the template.
- Order: `review_video`, `radio_cut`, `voiceover`, then `scripts/rubberhose_finalize_storyboard.py` (replaces the
  `storyboard` step and bakes `scenes/lipsync.ts`, with mouth shapes when Rhubarb is available), then `render`.
- Grain keeps the default H.264 bitrate high (about 29 Mb/s, 116 MB for 30 s), so the scaffold sets `"crf": 24` in
  `video` in `config.json` and the render step uses it (any project can set `video.crf`, 0 to 51, lower is better
  quality and a bigger file). For a smaller social copy:
  `ffmpeg -i final.mp4 -c:v libx264 -crf 28 -preset medium -c:a aac -b:a 192k final_social.mp4`
  (add `-af loudnorm=I=-14:TP=-1.5:LRA=11` for loudness).
- The shorts scene generator hook (`src/short/style_bundles.py`) is Vantage-only; Rubberhose scenes are
  hand-adapted from the template.

## 7. Render cost

- Measured on this machine (60 frames of the gag scene, one thread, including about 4 s start-up): about 12 s in
  total, so **roughly 100 ms per frame or less**; the full 30 s sample (880 frames, default threads, with audio)
  rendered in 70 s wall time.
- Kept cheap: **no `feTurbulence`, no blur filter and no `mix-blend-mode` anywhere**. The grain is a 192 px tile of
  seeded pixels drawn once to a canvas (`getGrain`, module cache) and used as a CSS background that is only
  re-offset per drawing. Flicker is one flat overlay, the vignette one radial gradient, scratches and dust a few SVG
  paths. Everything else is plain SVG paths with no filters.

## 8. Character frame for thumbnails

A 512x512 head-and-shoulders crop: `<Kip x={256} y={640} scale={1.1} />` inside a 512x512 composition on a `paper`
`RScene` (the lid knob lands at y 70, the face at y 260, the shoulders at y 415).

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (rubberhose style)

One Remotion scene per beat, **1080x1920 portrait**, built only from the rubberhose kit:
`import { RScene, Eyebrow, Headline, Sub, Ground, Kip, TitleCard, EndCard, Rays, Sign, Clock, Cup, Bulb, Puff, Stars, SampleTag, C } from "@remotion-components/rubberhose/kit";`
plus `import { LIPSYNC, VISEMES } from "./lipsync";` for the talking character.
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export) and wrap content in
`<RScene tone="paper"|"ink"|"stage" iris="in"|"out">`. Type system: `Eyebrow`, then `Headline lines={["Line one.", "*Line two."]}`
(second line brick red, at most 13 characters a line at the default size), then optional `Sub`. Headline top third (y 190 to 520),
stage below with `Ground y={1440}`, content inside x 60 to 1020 and y 160 to 1500. Kip:
`<Kip x y scale gesture="wave|point|shrug|toot" gestureAt={n} walk={{ from: a, to: b }} walkTo={x} look mouth={LIPSYNC.<id>} visemes={VISEMES.<id>} />`
(literal numbers for `gestureAt` and `walk`). Ink outlines, sepia palette only, original art, no real brands or invented data.
Use the held clock (`useHeld`) for any custom animation so it steps on twos; never use Math.random or CSS blur/turbulence filters.
<!-- LLM-BRIEF-END -->
