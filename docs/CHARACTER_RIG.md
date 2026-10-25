# Character Rig

How every animated character in this repo talks, blinks, gestures, walks and makes sound, and how to add one to a
style bundle. The coverage of the 12 animation styles, and what is still open, is in
[ANIMATION_STYLES.md](ANIMATION_STYLES.md).

## 1. Why a shared rig

Each style bundle draws its own character in its own technique (three.js meshes, pixel sprites, SVG ink lines, paper
cuts). Before the rig, each kit had its own blink timing and props, and only Lowpoly had lip sync. The rig fixes the
**timing and the data**, not the drawing, so a character in any style is told the same things:

- talk with this mouth data,
- blink now,
- start this gesture at frame `n`,
- walk from frame `a` to frame `b`.

Bundles stay separate: the rig holds no drawing code and no bundle imports another bundle's kit. The guard hook
(`.claude/hooks/guard.py`) blocks only the bundle folder names, so importing the neutral `rig/` folder is allowed.

## 2. The contract: `remotion/src/components/rig/index.ts`

Pure TypeScript with no imports, so it also runs in the Isofigure and Papercut HTML builds. Tests: `rig.test.ts`.

| Export | What it is |
|---|---|
| `RigProps<G, L>` | The props a rigged character accepts: `mouth`, `visemes`, `talking`, `blink`, `gesture`, `gestureAt`, `walk`, `look`, `seed`. `G` and `L` are the bundle's own gesture and look names |
| `Viseme`, `VISEMES` | The Rhubarb mouth shapes: A closed (M/B/P), B slightly open, C open, D wide open, E rounded (O), F puckered (U/W), G teeth on lip (F/V), H tongue up (L), X rest |
| `VISEME_OPEN`, `VISEME_WIDTH` | How far each shape opens the jaw and how wide the mouth is, for characters that draw openness rather than shapes |
| `mouthAt(rig, frame)` | Openness 0..1: from `visemes` if present, else from the `mouth` loudness curve, else a deterministic syllable rhythm while `talking`. Closed once the data ends |
| `visemeAt(rig, frame)` | The shape to draw. Without Rhubarb data it is derived from openness (`shapeFromOpen`) |
| `blinkAt(frame, fps, seed)` | Eyelid closure 0..1. One blink in each 3.4 s slot at a seeded offset, lasting 0.14 s, with an occasional double blink. A pure function, so renders are identical; works at 12, 24 and 30 fps |
| `gestureT(frame, at)` | Smoothstep progress of a gesture over `GESTURE_FRAMES` (14) |
| `walkAt(walk, frame, fps)` | `{ active, phase, progress }`. `phase` advances by PI per footstep, so a foot lands at every multiple of PI: draw legs with `cos(phase)`, the body bob with `abs(sin(phase))` |
| `walkSteps(walk, fps)` | The scene-local frames where a foot lands. `src/sound/rig_analyzer.py` mirrors it exactly (including JavaScript's round-half-up) |

`Walk` is `{ from, to, cadence? }` in scene-local frames; `cadence` is footsteps per second (default 2).

## 3. Lip sync: `scripts/_lipsync.py`

Lip sync is computed once, at finalize time, not during rendering, so a render pays nothing for it. Each bundle's
`*_finalize_storyboard.py` calls `bake_and_write(project_dir)`, which writes `scenes/lipsync.ts`:

```ts
export const LIPSYNC: Record<string, number[] | undefined>   // mouth openness per frame, from loudness (always written)
export const VISEMES: Record<string, string | undefined>     // one Rhubarb shape letter per frame (when Rhubarb ran)
export const CAPTIONS: Record<string, string | undefined>    // the narration text per scene
```

- Frame rate comes from `video.fps` in `config.json` (default 30), because some styles run at 24 or 12 fps.
- Pass both to the character: `mouth={LIPSYNC.<scene>} visemes={VISEMES.<scene>}`.
- Tiny mouths (pixel sprites) use openness only. Larger faces draw one mouth per shape.
- Vantage shorts have one voiceover cut into beats: `python scripts/_lipsync.py <project> --short <variant>` writes
  `short/<variant>/scenes/lipsync.ts` keyed by beat id, each array starting at the beat's own frame 0.

### Rhubarb Lip Sync (optional dependency)

Rhubarb is an offline command-line tool, not a pip package. Get `rhubarb.exe` from
github.com/DanielSWolf/rhubarb-lip-sync/releases (or build it from source) and either put its folder on `PATH` or
set `RHUBARB_BIN` to the exe. `RHUBARB_BIN` wins over `PATH`.

- It reads WAV or OGG, so the script converts each MP3 clip with ffmpeg first, and passes the scene's narration with
  `--dialogFile` because knowing the words improves accuracy.
- Without Rhubarb the script prints a warning and writes the loudness curve only, so no video is blocked.
- A 0-byte clip (the voiceover step writes one for an empty line) is skipped as a silent scene.

## 4. Sound effects from the rig

The character cues feed the existing `sound` step, not a new one. `python -m src.cli sound <project> generate`
runs `src/sound/rig_analyzer.py` on every scene file and always adds:

- a **gesture** pop (`ui_pop`) at each `gestureAt={n}`,
- a **footstep** (new `footstep` library sound, a short low thump) at each footfall of a `walk={{ from, to, cadence }}`.

Rules scene authors need:

- Only numeric literals are read. `gestureAt={beat + 4}`, `walk={WALK}` or `walk={{ from: start, to: 90 }}` are skipped,
  never guessed. Keys may be in any order; only `from`, `to` and `cadence` are allowed; commented-out props are ignored.
- Frames are scene-local and use the project fps.
- Footsteps keep their own track in the aggregator (`RHYTHM_TYPES`): they skip the merge window, the minimum gap and the
  density cap, because thinning a walk cycle breaks its rhythm (at cadence 4 and 30 fps steps are 7.5 frames apart).
  Two characters stepping within 2 frames give one sound.
- A gesture with no `gestureAt` gets no sound.

## 5. Characters

Every character is original, drawn entirely in code, and deterministic (no `Math.random`, no image files).

| Bundle | Character | Talks | Blinks | Gestures and walk | File |
|---|---|---|---|---|---|
| Lowpoly | `Presenter` (seated at a desk) | Shapes: pressed lips, round O, teeth, F/V, tongue | Rig rhythm, `seed` | `open`, `point`, `count`, `shrug`; no walk | `lowpoly/character.tsx` |
| Launch | `Mascot` | Shapes | Rig rhythm | `wave`, `cheer` (from stage 3, when it has arms) | `launch/kit.tsx` |
| Lyric | `Pixie` | Openness, 3 pixel frames | Rig rhythm | wave; walk with a 2-frame leg cycle (`walkTo`) | `lyric/kit.tsx` |
| Leaderbot | `PixelBot`, centre of `BotGrid` | Sprite mouth rows per shape; the smooth bot opens an ink oval | `blink` (off by default so a grid of nine stays still) | none | `leaderbot/kit.tsx` |
| Vantage | `Guide` | Shapes | Rig rhythm | `wave`, `point`, `think`, `open`; walk (`walkTo`) | `vantage/kit.tsx` |
| Papercut | `Fox` (paper-cut jaw) | Shapes, from `talk` or the embedded voice | Rig rhythm | walk, tail, reacts to clicks | `papercut/fox.tsx` |
| Storybook | `Wren`, drawn in code over a painted plate | Shapes | Rig rhythm, `seed` | `wave`, `point`, `think`, `open`, `cheer`; walk into depth (`walkTo`, `walkToY`, `walkToScale`) | `storybook/character.tsx` |
| Rubberhose | `Kip` (noodle-limbed kettle) | Shapes | Rig rhythm, `seed` | `wave`, `point`, `shrug`, `toot`; walk (`walkTo`); `look` | `rubberhose/kit.tsx` |
| Glossy | `Toy` (Pebbo, vinyl toy) | Shapes | Rig rhythm | `wave`, `cheer`, `point`, `shrug`; walk; entrances `pop`, `drop`, `rise` | `glossy/kit.tsx` |
| Clay | `Tuck` (plasticine bean) | One clay mouth piece per shape | Clay eyelids | `wave`, `point`, `shrug`, `cheer`; walk | `clay/kit.tsx` |
| Popart | `Hero` (Dot Dash) | Inked mouth per shape | Rig rhythm | `wave`, `point`, `fist`, `think`; walk; `mood` | `popart/hero.tsx` |
| Neon | `Tubo` (neon-tube robot) | Glowing mouth tube per shape | Eye tubes flick off | `wave`, `point`, `cheer`, `shrug`; walk | `neon/character.tsx` |
| Isofigure | Robot (interactive figure) | LED mouth bars, no voiceover | Idle rhythm plus a Blink button | Wave button | `templates/isofigure_robot/` |

Coverage of the 12 styles, the measured render cost of each, and the caveats still open are in
[ANIMATION_STYLES.md](ANIMATION_STYLES.md).

### Adding a character to a bundle

1. Import the rig relatively from the kit: `import { blinkAt, mouthAt, visemeAt, gestureT, walkAt } from "../rig"`.
   (Isofigure and Papercut HTML builds use the `@rig` alias or a relative path.)
2. Accept `RigProps` plus the bundle's own props; draw a mouth for each shape you can afford, and fall back to openness.
3. Use the shared clock helpers instead of your own: `blinkAt` with a `seed`, `gestureT` for easing, `walkAt` for feet.
4. Have the bundle's finalize script call `bake_and_write`, and put a `lipsync.ts` stub in the template scenes.
5. In template scenes write `gestureAt` and `walk` as literal numbers so the sound step finds them.
6. Add a face for the web UI: a composition in `remotion/src/faces/index.tsx`, then
   `node scripts/ui_render_faces.mjs <bundle>`.

## 6. Papercut: the optional voice

Papercut films are music-only by default. A project can add a voice with `"voice": true` in `config.json`
(`papercut_new_video.py --voice` sets it up and writes a starter `narration/narrations.json`).

- Narration entry `i` belongs to papercut scene `i` (or to `"scene": n`, 1-based); an empty entry is a silent scene.
- `papercut_build_html.py` embeds each clip as a base64 MP3 data URI, plus its lip sync, into `film.html`, so the film is
  still one self-contained file. Cost is roughly 1 MB per minute of speech. Clips longer than their scene are warned about.
- The player decodes the clips with Web Audio on the film's clock: the voice pauses, seeks and loops with the film, the
  music ducks by 9 dB under it (clicks are not ducked), and the Sound button and `M` mute both.
- A film without `"voice": true` builds exactly as before.

## 7. Design decisions

- **Everything is drawn in code and deterministic.** No asset files; the same render every time; easy to review in diffs.
- **Lip sync is baked once.** `lipsync.ts` is a few KB, so rendering pays nothing for it.
- **Each bundle keeps its own kit.** The few helpers repeated across kits (`clamp`, `prog`, `usePop`) are a fair price
  for bundles that never depend on each other.
- **Rhubarb is optional.** Loudness is the fallback, and enough for tiny mouths.
- **The isometric robot stays an interactive figure**, not a video: buttons trigger its actions, with no voiceover.
  Short synthesised sound effects are allowed but optional, and start only after a user gesture.
- **Watch filter cost.** Large SVG blur and turbulence filters (neon glow, clay texture, watercolour bleed) are slow in
  Chrome at 1080x1920. Bake static textures once in code, keep blurs on small layers, and record the measured
  milliseconds per frame in the bundle's style guide.
- **New bundles are added only when a real video needs one.** Each is about eight files (style guide, kit, template,
  new-video script, finalize script, skill, `CLAUDE.md` row, guard entry) plus review rules, sound mappings and a UI card.

## 8. Related

- Sound system: [SOUND.md](SOUND.md) (the rig section is "Character cues from the rig").
- Per-style rules: the `*_style_guide.md` files; the shared workflow: `.claude/skills/video_make_core/SKILL.md`.
- Web UI faces: `scripts/ui_render_faces.mjs`, `remotion/src/faces/`, `ui/web/public/faces/`.
