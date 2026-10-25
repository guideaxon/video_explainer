# Animation Styles

The 12 animation styles from the "Animation styles I can make" sheet, which bundle makes each, and what is still open.
The sheet promises one original character per style that can **move, blink, talk, and get a voice plus sound effects**;
every row is judged against that promise. How the characters work is in [CHARACTER_RIG.md](CHARACTER_RIG.md).

This file is the living status. Update the table and the open-work list when a bundle changes state.

## 1. Coverage

| # | Style | Bundle | Character | Output | Web UI | Status |
|---|---|---|---|---|---|---|
| 1 | Flat 2D vector | `launch` | `Mascot` | Portrait video | Face | Done |
| 2 | Line-art 2D | `vantage` (shorts) | `Guide` | Vertical short | Not in the picker (the UI does not drive shorts) | Done |
| 3 | Retro rubber-hose 2D | `rubberhose` | `Kip` (noodle-limbed kettle) | Portrait video | Face | Done |
| 4 | Pixel art 8-bit | `lyric`, `leaderbot` | `Pixie`, `PixelBot` | Portrait video | Faces | Done |
| 5 | Glossy toy 3D-look | `glossy` | `Toy` (Pebbo, vinyl toy) | Portrait video | Face | Done |
| 6 | Claymation look | `clay` | `Tuck` (plasticine bean) | Portrait video | Face | Done |
| 7 | Isometric 3D | `isofigure` | Robot | One interactive HTML figure, no voiceover | Face | Done |
| 8 | Low-poly 3D | `lowpoly` | `Presenter` | Landscape video | Face | Done (seated presenter only) |
| 9 | Paper cut-out | `papercut` | `Fox` | One HTML film, optional voice | Face | Done |
| 10 | Comic pop-art | `popart` | `Hero` (Dot Dash) | Portrait video | Face | Done |
| 11 | Watercolor storybook | `storybook` | `Wren` (code-drawn, painted look, over a plate) | Landscape video | Face | Done (see caveats) |
| 12 | Neon synthwave | `neon` | `Tubo` (neon-tube robot) | Portrait video | Face | Done |

`comic` (rotatable ComfyUI panels) is a different product from pop-art and is not part of this table.

Styles with no character (Markets, Promo, Demo, and the standard explainer) are not in the 12 and have no face.

## 2. Web UI style picker

The New Project screen (`ui/web/src/screens/NewProject.tsx`) shows each style card with:

- a **face**: the bundle's real character, rendered from its kit to `ui/web/public/faces/<bundle>.png`,
- an **"Animation style: ..."** line naming the style from the 12,
- a `soon: true` flag for a style that is listed but not built yet (disabled card, hidden from the Preferences default). No style uses it now.

Regenerate faces with `node scripts/ui_render_faces.mjs [bundle ...]` after a character's look changes. A new bundle
needs a composition in `remotion/src/faces/index.tsx` first.

## 3. Open work

### Watercolor storybook: code-drawn character layer (built; caveats)

Characters baked into painted stills cannot blink or talk, so `Wren` is drawn in code over a **plate** (a still with no
people). Files: `remotion/src/components/storybook/character.tsx` (`Wren`, `WrenStage`), `paint.ts` (pure helpers),
`kit.tsx` (`OnStill`, `Foreground`). It looks painted (washes, pooled edges, paper grain baked once, one small
filter on the character only), matches the still's light (`light` prop), stays glued to the painted ground through
camera moves, can be covered by foreground objects, and costs about 10 to 15 ms per frame at 1920x1080. A shot with
`"plate": true` in `art/style.json` makes ComfyUI generate an empty scene. Existing projects with baked-in characters
are unchanged. Guide: `docs/storybook_video_style_guide.md` sections 3 and 7.

Caveats still to close:

- [ ] The template scenes `workshop` and `voice` need `art/workshop.png` and `art/voice.png` plates; their ground
      points are placeholders that fit the demo still. No plate has been generated with ComfyUI yet.
- [ ] `storybook_finalize_storyboard.py` was checked to call `bake_and_write` but not run end to end on a project.
- [ ] `Foreground` is a static polygon mask, so it cannot cover feet for something that moves.

### The five new styles (built; caveats)

Each is drawn entirely in code (no image generation), uses the shared rig, has its own kit, 7 template scenes, style guide,
skill, scaffold and finalize scripts and tests, and was rendered end to end (voiceover, Rhubarb lip sync, render) to a
1080x1920 sample that decodes cleanly. Shared entries are registered: `CLAUDE.md` row, `scripts/review_video.py`,
`src/sound/kit_analyzer.py` rules, an Earshot palette each (the palette test requires every bundle to sound different),
`docs/HowToUse.md`, the core skill, the guard hook, `compose_new_story.py`, the UI card and face.

| Bundle | Character | Technique and measured cost |
|---|---|---|
| `rubberhose` | `Kip`, a kettle with noodle limbs, white gloves, pie-cut eyes | Everything animated on twos via a 12-per-second held clock; grain tile made once and re-offset per drawing; gate weave and flicker; no filters. About 100 ms per frame or less. Output is large (about 29 Mb/s, 116 MB for 30 s); the guide gives an `-crf 24` re-encode for sharing |
| `glossy` | `Toy` (Pebbo), a vinyl toy | Gradients, rim light and specular shapes; unique gradient ids per instance (`useId`); no blur. About 70 ms per frame over a full render |
| `clay` | `Tuck`, a plasticine bean with one clay mouth piece per shape | Lumpy spline outlines, one 256 px texture baked per page, 12 poses per second with a seeded boil; no SVG filters. About 80 ms per frame in the heaviest scene |
| `popart` | `Hero` (Dot Dash) | Ben-Day dots from CSS gradients and 21 SVG patterns defined once, colour plates offset 3 px and 2 px; no filters. About 86 ms per frame all-in |
| `neon` | `Tubo`, a robot made of glowing tubes | Each stroke drawn 3 to 4 times with wider, fainter copies; no blur at all. About 75 to 135 ms per frame |

Caveats still to close, for all five:

- [ ] Not run on the samples: `review_video.py`, `radio_cut.py`, `continuity_qc.py` and `sound generate`. (`review_video.py` only
      works once a bundle is registered, which it now is.)
- [ ] Lip sync was baked from real Rhubarb data and the mouths visibly change with speech, but no one has checked it
      frame by frame against the audio.
- [ ] The sample videos are not kept in the repo (they were rendered to a scratch folder); a project gets its own render.
- [ ] Glossy, Clay and Pop art each had a small cosmetic note (clay: the lamp sits close to Tuck's left hand in `coin_pot`).
- [ ] The rubberhose stills were not re-rendered after the last small tweaks (puff and star timing, Kip's position, the end
      card font); the end-to-end render included them and looked right.

### Other gaps

- Lowpoly has one seated presenter: no full body, no walk, and no fox model.
- The Vantage `Guide` is not in the UI picker; the UI does not drive Vantage shorts yet.
- A one-off style-sheet video that proves all 12 looks side by side has not been made.

## 4. Done (2026-10-24)

The shared rig contract, Rhubarb lip sync, rig-driven sound cues, the character upgrades for the existing styles
(`Presenter`, `Mascot`, `Pixie`, `PixelBot`, `Guide`, `Fox`, the Isofigure robot), the Papercut optional voice, and the
web UI faces, the storybook character layer (`Wren`), and the five new bundles (rubberhose, glossy, clay, popart, neon). Details and files are in [CHARACTER_RIG.md](CHARACTER_RIG.md).
