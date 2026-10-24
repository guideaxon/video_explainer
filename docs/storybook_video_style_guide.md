# Storybook Style Bundle: Style Guide

Style for the **Storybook** style bundle: a short illustrated film (landscape 1280x720, 30 fps) told as one
continuous visual metaphor with a recurring small cast, hand-painted still artwork and slow camera moves. Reference
for the look and structure: `docs/launch_film_breakdown.md`. Other style bundles have their own guide, kit and skill;
do not mix styles. Do not copy another film's characters, set or copy: take the structure and technique only.

Implementation: kit `remotion/src/components/storybook/kit.tsx`, templates `templates/storybook_video/scenes/`,
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
