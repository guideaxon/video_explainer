# Lyric Style Bundle: Video Style Guide

Style for the **Lyric** style bundle: animated lyric / music videos in a kawaii retro-pixel Y2K pastel-pop
look, **portrait 1080x1920 (9:16, mobile-first)** for TikTok, Reels and Shorts, 30 to 90 s. Each
lyric line becomes its own comedic vignette. Other style bundles (Vantage, Markets, Promo, Launch) have
their own guide, kit and skill; do not mix styles.

Derived from the reference clip `projects/samples/5/CMAF_96.mp4`, a 3-minute animated song video,
which is only 170x96 px and 16:9 (this style bundle re-lays the style out for phones). Look, motion and
structure are read from it directly; fonts and exact colours are approximations. **Only the style is
reused**: no characters, lyrics, jokes, credits or brand from the reference. The template tells an
original sample story (trading a desk job for a bakery) with an original pixel-art character.

Implementation: kit `remotion/src/components/lyric/kit.tsx`, template scenes
`templates/lyric_video/scenes/`, scaffold `scripts/lyric_new_video.py`, pacing
`scripts/lyric_finalize_storyboard.py`, workflow skill `.claude/skills/lyric_make_video/`.

## 1. Format: mobile first

- **1080 x 1920 at 30 fps.** The project config must be portrait (`video.resolution` 1080x1920); the
  `render` command then uses the 9:16 presets (4k = 2160x3840, 1440p, 1080p, 720p, 480p).
- Lyric / headline type in the top 60% (y 160 to 1100); props and the character below (y 1000 to
  1500). **Safe zone:** y 160 to 1500, x 60 to 1020.
- Phone-readable sizes: bubble/slam type 190 to 300 px, cursive lyrics 70 to 130 px, terminal text 36
  to 54 px, pixel labels 16 to 22 px (decoration only, never carry meaning).
- Lyrics are the on-screen text: every scene shows its line, so the video works muted.

## 2. Look

Loud pastel pop, one idea per scene, every scene a different surface.

| Surface (`PopScene bg=`) | Use |
|---|---|
| `pinkburst`, `yellowburst` | title moments and big finishes (rotating sunburst) |
| `checker` | punchline slams (checkerboard drifts diagonally) |
| `mint` | stripes for cheerful beats |
| `peach`, `lavender` | dotted pastels for props (receipt) and soft emotional lines |
| `cream` | paper props (newspaper) |
| `night` | late-night and code beats (gradient with twinkling stars) |
| `sky` | weather or water beats |
| `black` | credits |

- Palette: ink `#2a1b3d`, hot pink `#ff4f9a`, light pink `#ffb8dc`, butter yellow `#ffe45e`, mint
  `#7ce8c4`, lavender `#c9b8ff`, peach `#ffc9a8`, sky `#9fd4ff`, night `#1b1030`.
- Type roles (approximated): **Titan One** for bubble titles (white or yellow fill, 7 px ink outline,
  9-step coloured extrude, per-letter bounce); **Bungee** for blocky slam type; **JetBrains Mono** in
  terminals; **Playfair Display italic** for tender/ironic lyric lines; **Fredoka** for stickers and
  UI; **Press Start 2P** for tiny pixel labels.
- Everything has a thick ink outline and a hard offset shadow (sticker feel). No soft gradients on
  objects; gradients only on backgrounds.
- **Retro windows**: pastel title bar, three coloured dots, pixel title text. The **terminal** is a
  dark window with typed lines (mint output, pink errors).
- **Character**: one recurring pixel-art figure (`Pixie`: orange hair, mint hoodie), with hat variants
  (chef, hard hat) and a wave. It reacts to the lyric. Always an original character.
- **Props** carry the jokes: stopwatch, newspaper with a hand-circled phrase, receipt with a stamp
  slap, "achievement unlocked" toast, sticker pills ("oh-oh-oh!").

## 3. Motion

- Letters of bubble titles drop in with a spring and rotation; slam type punches in with a 10-frame
  glitch jitter; cursive lines fade in word by word.
- Typed terminal lines with a block caret; a stamp slaps with overshoot; a circle draws itself.
- Constant ambient motion: spinning sunburst, drifting checkerboard, stars twinkling, character bob
  and blink, sticker wobble.
- **Character rig** (`Pixie`): talks from `scenes/lipsync.ts`, which `scripts/lyric_finalize_storyboard.py` bakes from the voiceover
  (shared `scripts/_lipsync.py`; mouth shapes need Rhubarb, see CLAUDE.md). Import `{ LIPSYNC, VISEMES } from "./lipsync"` and pass
  `mouth={LIPSYNC.<scene>} visemes={VISEMES.<scene>}`. Blinks follow the shared rig rhythm (`seed` varies it). A pixel mouth has three frames (closed, open, wide), so only the
  openness is used. `walk={{ from, to }}` plus `walkTo={x}` walks it across with a two-frame leg cycle.
  `gestureAt={n}` and `walk={{ from, to }}` written as plain numbers also get a sound cue from `python -m src.cli sound <project> generate`.
- Cuts are nearly hard: **6-frame fades** with 0.15 s buffers
  (`scripts/lyric_finalize_storyboard.py`). The pipeline's 1.5 s cinematic blur is wrong here.
- Scenes are 2 to 5 s. **Land every key reveal within the first ~60% of the scene** (frame 40 of a
  2.5 s scene); later reveals get cut off.

## 4. Story structure

1. **Cold open**: a terminal or a tiny visual joke (the setup).
2. **Title**: the hook phrase as a bubble title on a sunburst, with a sticker.
3. **Escalation vignettes**, one prop per line: late night, slam, stopwatch, newspaper, receipt.
4. **Emotional beat**: cursive text on a soft surface, an achievement toast.
5. **Big finish**: kinetic slam type ("I'm gonna be SO GOOD").
6. **Credits** on black (song source, author, tools).

Keep 6 to 10 scenes for 30 to 45 s; add vignettes for longer songs.

## 5. Copy and audio rules

- **Lyrics must be yours or licensed.** Never reuse another song's lyrics, jokes, character or credits.
  The template lyrics are SAMPLE text ("SAMPLE LYRICS" tag; remove it).
- Credit the real song source and tools in the credits scene.
- Audio: the pipeline takes **one audio file per scene**. Two ways:
  - *Spoken lines (default)*: TTS via `voiceover`, then `lyric_finalize_storyboard.py` (trims silence).
  - *A real song*: slice the track into per-scene clips named `voiceover/<scene_id>.mp3`
    (`ffmpeg -ss <start> -t <len> -i song.mp3 -c:a libmp3lame voiceover/<scene_id>.mp3`) and run
    `lyric_finalize_storyboard.py --no-trim` (keeps the music untouched). The storyboard reads each
    clip's length; verified with synthetic clips, not yet with a real song.
- Keep scene lengths equal to the lyric lines so text and audio land together.

## 6. Pipeline notes (full video, portrait)

- Registry keys in `projects/<p>/scenes/index.ts` must equal the slug of each scene title
  (`_title_to_scene_key` in `src/cli/main.py`; leading The/A/An dropped); component names end in
  `Scene`; keys unquoted. `tests/test_lyric_template.py` checks the template.
- Storyboard order: audio, then `scripts/lyric_finalize_storyboard.py` (replaces the `storyboard`
  step), then `render`.
- Output loudness for TTS is about -20 LUFS; normalise for social with
  `ffmpeg -i final.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final_social.mp4`.
- The shorts scene generator hook (`src/short/style_bundles.py`) is Vantage-only; Lyric scenes are
  hand-adapted from the template.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (lyric style)

One Remotion scene per lyric line, **1080x1920 portrait**, built only from the lyric kit:
`import { PopScene, BubbleTitle, Slam, Cursive, Sticker, RetroWindow, Terminal, Pixie, Toast, Stopwatch, Newspaper, Receipt, Credits, Art, SampleTag, C } from "@remotion-components/lyric/kit";`
Export `XxxScene: React.FC<{ startFrame?: number }>` (default export) and wrap content in
`<PopScene bg="pinkburst"|"yellowburst"|"mint"|"checker"|"peach"|"night"|"sky"|"cream"|"lavender"|"black">`.
Show the lyric line as on-screen text (bubble title, slam or cursive) in y 160 to 1100, one prop that
makes the joke, and the `Pixie` character below (y 1000 to 1500). Everything inside x 60 to 1020 and
y 160 to 1500. Land all key reveals within the first 60% of the scene (frames, 30 fps). Original
characters, lyrics and jokes only; never copy another song, character or credits.
<!-- LLM-BRIEF-END -->
