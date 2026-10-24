# Animation Style Gaps

What the 12 animation styles in the "Animation styles I can make" sheet map to in this repo today, what is
missing, which styles are new, and what to change before building them.

The sheet promises one original character per style that can **move, blink, talk, and get a voice plus sound
effects**. Every row below is judged against that promise.

Status as of 2026-10-24.

## 1. The 12 styles at a glance

| # | Style | Maps to today | Status |
|---|---|---|---|
| 1 | Flat 2D vector | `launch` (`Mascot`) | Partial |
| 2 | Line-art 2D | `vantage` | Partial (no character) |
| 3 | Retro rubber-hose 2D | none | **New** |
| 4 | Pixel art 8-bit | `lyric` (`Pixie`), `leaderbot` (`PixelBot`) | Partial |
| 5 | Glossy toy 3D-look | none (`lowpoly` has the three.js setup it would use) | **New** |
| 6 | Claymation look | none | **New** |
| 7 | Isometric 3D | `isofigure` | Partial (objects, no character, not a video) |
| 8 | Low-poly 3D | `lowpoly` (`Presenter`) | Nearly complete |
| 9 | Paper cut-out | `papercut` (`Fox`) | Partial |
| 10 | Comic pop-art | none (`comic` is a different product: rotatable panels) | **New** |
| 11 | Watercolor storybook | `storybook` | Partial (characters baked into stills) |
| 12 | Neon synthwave | none | **New** |

**New styles (5):** retro rubber-hose 2D, glossy toy 3D-look, claymation look, comic pop-art, neon synthwave.

## 2. Existing styles: what they have and what is missing

| Style | Character and file | Moves | Blinks | Talks | Voice | Gaps |
|---|---|---|---|---|---|---|
| Low-poly 3D | `Presenter`, `remotion/src/components/lowpoly/character.tsx` | Head look and nod, breathing, arm gestures | Yes, every ~3.4 s | Yes, mouth openness from voiceover loudness | Yes | Mouth only opens and closes (no M/O/F shapes). Seated at a desk only, so no full body or walk. One fixed presenter; the fox in the sheet needs a new model. |
| Flat 2D vector | `Mascot`, `remotion/src/components/launch/kit.tsx` | Pop-in, arm sway | Yes | No | Narration only | No mouth movement, no gestures or legs. It is a growing blob mascot, not a person rig like the sheet. |
| Pixel art 8-bit | `Pixie`, `remotion/src/components/lyric/kit.tsx` | Bob, two-frame wave | Yes | No | Music, no voice | No talking mouth frames, no walk cycle. |
| Pixel art 8-bit | `PixelBot`, `remotion/src/components/leaderbot/kit.tsx` | Pop-in and glitch only | No | No (a `Speech` bubble and a painted mouth pixel) | Yes | No rig: a static 12x12 sprite with effects. |
| Paper cut-out | `Fox`, `remotion/src/components/papercut/fox.tsx` | Walk cycle, tail, head tilt, reacts when clicked | No | No | No (bundle has no narration today) | Needs blink and mouth movement, and an optional voice (decided, see section 6). |
| Line-art 2D | None, `remotion/src/components/vantage/kit.tsx` (draw-ons, icons, headlines) | n/a | n/a | n/a | Yes | The whole character is missing. |
| Isometric 3D | None, `remotion/src/components/isofigure/` (interactive objects such as the washer) | n/a | n/a | n/a | No audio | No character. The robot stays an interactive figure (decided, see section 6): buttons make it wave, blink and "talk", with no voiceover. |
| Watercolor storybook | Painted into ComfyUI stills, `remotion/src/components/storybook/kit.tsx` | Camera moves only | No | No | Yes | Characters are part of the image and cannot blink or talk. They need separate layers (a character drawn in code over a painted background) or a separate cut-out. |

## 3. Gaps shared by every style

1. **No shared character rig.** Each kit has its own character (`Mascot`, `Pixie`, `PixelBot`, `Fox`,
   `Presenter`) with its own blink timing and props. None of them share a way to say "talk with this mouth data,
   do this gesture, blink now".
2. **Lip sync exists only in Lowpoly.** `mouth_curve()` in `scripts/lowpoly_finalize_storyboard.py` turns the
   voiceover's loudness into one openness value per frame. Mouth shapes for specific sounds (closed for M/B/P,
   round for O, teeth on lip for F/V) do not exist anywhere.
3. **Sound effects are not tied to the character.** The pipeline has a sound step
   (`python -m src.cli sound <project>`, code in `src/sound/`, played by
   `remotion/src/scenes/SceneStoryboardPlayer.tsx`), but its cues come from analysing each scene. Nothing
   creates a cue from a footstep, blink or gesture. The bundle skills do not mention the sound step.
4. **Walk cycles** exist only for the papercut fox.
5. **Different output types.** Papercut and Isofigure produce HTML files with no voiceover. Papercut gets an
   optional voice; Isofigure stays without one (section 6).

## 4. How the new styles would be built

All five are drawn in code, with no image generation, and use the shared rig from section 5.

| Style | Technique | Notes |
|---|---|---|
| Retro rubber-hose 2D | Limbs drawn as curves whose control points move, so arms bend like noodles. Pie-cut eyes, white gloves, sepia tint, film grain, gate weave and flicker. | Plays at 24 fps or "on twos" for the period feel. |
| Glossy toy 3D-look | Option A: SVG radial gradients with highlight shapes (cheap, matches the sheet). Option B: three.js with a glossy material (true 3D, reuses `lowpoly`'s three.js setup). | Start with A; B only if camera orbits are needed. |
| Claymation look | Matte shading plus a noise texture for the lumpy, fingerprint surface. Played at 12 fps "on twos" with slight random wobble so it reads as stop-motion. | Bake the texture as an image (see section 6). |
| Comic pop-art | Halftone dot patterns, thick ink outlines, starburst "POW!" captions, speed lines, panel-style zoom-ins. | Separate from the `comic` bundle, which makes rotatable ComfyUI panels. |
| Neon synthwave | Stroke-only SVG with stacked blur filters for the glow, a moving perspective grid, a striped sun, flicker. | Glow is the main rendering cost (see section 6). |

Each new style follows the bundle rules in `CLAUDE.md`: its own style guide, kit, template, scripts and skill,
plus a row in the bundle table and an entry in the guard hook's `KIT_IMPORT` list.

## 5. Recommended changes before building

### Keep

- **Everything drawn in code and deterministic.** No asset files, renders the same every time, easy to review in
  diffs. Papercut's synthesised music follows the same idea.
- **Lip sync is computed once, not during rendering.** `lowpoly_finalize_storyboard.py` writes a small
  `scenes/lipsync.ts` (about 5 KB for the demo), so rendering pays nothing for it.
- **Each bundle has its own kit.** The small helpers repeated in six kits (`clamp`, `prog`, `usePop`) are a
  fair price for bundles that never depend on each other.

### Change

1. **Add a shared rig contract in `remotion/src/components/rig/`.** It holds types and timing only: a `RigProps`
   type (`mouth: number[]`, `blink`, `gesture`, `walk`, `look`) and helpers such as `blinkAt(frame, fps, seed)`
   and `mouthAt(mouth, frame)`. Each bundle still draws its own character from these props, so styles never mix.
   The guard hook only blocks the eleven bundle folder names, so a neutral `rig/` folder is allowed.
2. **Move lip sync to a shared script.** Lift `mouth_curve()` and `write_lipsync_ts()` into
   `scripts/_lipsync.py` so any bundle's finalize step can call it. Read the project fps from config instead of
   the hard-coded `FPS = 30`, because rubber-hose and claymation run at 24 or 12 fps.
3. **Add mouth shapes with Rhubarb Lip Sync** (approved, see section 6). Loudness stays as the fallback and is
   enough for tiny mouths (pixel sprites); every larger face uses Rhubarb's mouth shapes.
4. **Emit sound-effect cues from the rig.** Footsteps from the walk cycle and pops on gestures should feed the
   existing `sound` cue system, not a new one.
5. **Upgrade existing characters before adding new bundles.** Mouth frames for `Mascot`, `Pixie` and
   `PixelBot`, blink and mouth for `Fox`, a new line-art character for Vantage. This tests the rig on four
   styles cheaply.
6. **Watch filter cost.** Large SVG blur and turbulence filters (neon glow, clay texture, watercolor bleed) are
   slow in Chrome at 1080x1920 and can multiply render time. Bake static textures to images once, keep blurs on
   small layers, and measure render time per frame in the style guide.
7. **Add new bundles only when a real video needs one.** Each bundle is about eight files (style guide, kit,
   template, new-video script, finalize script, skill, `CLAUDE.md` row, guard entry). Five speculative bundles add
   about 40 files to maintain. A one-off style sheet video can prove all five looks before any bundle is built.

## 6. Decisions (2026-10-24)

### Papercut: optional voice

Papercut characters can have a voice, but it is an option per project, not the default. A film without it stays
exactly as today: music only, no narration.

- Turned on in `projects/<p>/config.json` (for example `"voice": true`); off when missing.
- The voiceover is generated by the normal voiceover step and embedded in `film.html` as audio data, so the film
  stays one self-contained file. This makes the file larger (roughly 1 MB per minute of speech as MP3).
- Lip sync data is baked in next to it, and the music ducks under the voice.
- The interactive player keeps working: the voice pauses and seeks with the film, and the Sound button mutes both.
- The style guide, skill and `papercut_build_html.py` need updating to describe and support this.

### Isometric robot: stays an interactive figure

The isometric style keeps the Isofigure output: one interactive `figure.html`, not a video. The sheet's robot
becomes a figure model whose buttons trigger its actions (wave, blink, a mouth animation for "talk", antenna
light), with callout labels and the usual Look inside view. No voiceover. Short sound effects synthesised in the
page (as Papercut does its music) are allowed but optional.

### Rhubarb Lip Sync: approved as a dependency

- Rhubarb is an offline command-line tool. It is not a pip package: download the Windows release and put
  `rhubarb.exe` on `PATH`, the same way as ffmpeg. Document it in the `CLAUDE.md` setup section.
- It reads WAV or OGG, not MP3, so the shared lip-sync script converts each voiceover clip with ffmpeg first.
- Pass the scene's narration text with `--dialogFile`; knowing the words improves accuracy.
- Output is mouth shapes A to F, plus the extended G, H and X (rest), with timings. The script converts them to one
  shape per frame at the project fps and writes them into `scenes/lipsync.ts` next to the existing openness
  values.
- If Rhubarb is missing, the script prints a warning and falls back to the loudness curve, so no video is blocked.
- Each character draws its own version of the shapes, for example pixel frames for `Pixie` or ink strokes for
  rubber-hose.
