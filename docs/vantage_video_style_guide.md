# Vantage Style Bundle: Video Style Guide

Style for the **Vantage** style bundle (GuideAxon's private, on-device AI life coach). Vertical shorts for
TikTok, Reels and YouTube Shorts. Other style bundles get their own `<style_bundle>_video_style_guide.md`,
templates and skill, so nothing here applies to them.

Reference implementation: `templates/vantage_short/` (scenes) and
`remotion/src/components/vantage/kit.tsx` (shared building blocks).
Workflow: the `vantage_make_short` skill (`.claude/skills/vantage_make_short/`).

## 1. Look

Editorial and film-like: restrained type, thin line art and instrument-style labels. No emoji,
no cards with drop shadows, no stock icons.

| Token | Parchment (`parch`) | Midnight (`navy`) |
|---|---|---|
| Background | `#d9ceb4` + grain + vignette | `#0a1127` + soft blue glow + light grain |
| Ink | `#1b1712` | `#f2efe6` |
| Accent | `#b3261e` (red) | `#f2b84b` (amber) |
| Dim | `#6f6550` | `#7f8aa8` |

- **Parchment = the old world / the problem** (cloud, exposure, late-night worry).
- **Midnight = Vantage / the solution** (private, on-device, calm).
- Fonts: **Cinzel 900** for headlines (uppercase), **IBM Plex Mono** for labels and readouts
  (uppercase, letter-spaced). Loaded with `@remotion/google-fonts`, so renders need internet.
- Line art: strokes only, 3 to 6 px, round caps and joins, drawn on with `Draw`. Dark theme gets a
  soft accent glow (`Art` adds it). Solid fills only for one hero shape (for example the moon).
- One accent word per headline, written `*WORD` in the headline string.

## 2. Layout (1080 x 1920)

- Themed film area: top **1660 px**. Below it a navy **caption band** (the player draws captions
  there). Never place content below y = 1660.
- HUD is drawn by `Scene`: corner brackets, top-left `VANTAGE · <CHAPTER>`, top-right
  `PRIVATE AI LIFE COACH`, bottom timeline (fills across the 6 beats), bottom-left chapter name,
  bottom-right readout (for example `UPLOADED: 0 B`, `SENT TO CLOUD: ALL`).
- Margins 90 px left and right. Headline at top (y ≈ 170 to 520), hero art centred around
  y ≈ 1000, a mono caption around y ≈ 1400 to 1500.
- Text sizes (it is read on a phone): headline 112 to 124 px, titles 50 px+, mono labels 22 px+.
  Nothing smaller than 22 px.
- Fill the frame. Leave no large empty areas. The hero art takes about 40% of the height.

## 3. Motion

- Everything enters: lines draw on (`Draw`), headline lines stagger up 9 frames apart, labels
  fade up. No element is simply "there" at frame 0.
- Always something moving: pulsing nodes, expanding rings, dashed lines flowing, a slow glow drift.
- Beat length is about 4.5 to 6.5 s (135 to 195 frames at 30 fps). The scene's own animation
  should finish its main reveal within about 60% of the beat.
- Theme changes are the biggest event in a video. Do it once (parchment to midnight) with a
  25-frame cross-fade, ideally on the word that introduces the product.
- Frames are beat-local: `useCurrentFrame()` starts at 0 for each beat (the player wraps each
  scene in a `Sequence`).

## 4. Story structure (about 40 s, 6 beats)

1. **Hook / problem** (parchment): a relatable moment in one line. Within 3 seconds.
2. **Pivot**: what is wrong with the usual answer (cloud), then flip to midnight: "Meet Vantage".
3. **Proof**: the core promise made visual (on-device, 0 bytes uploaded).
4. **How it works**: the Plan, Act, Reflect loop.
5. **What you get**: the three pillars (Personal Mastery, Communication, Career Growth).
6. **Call to action**: wordmark, one clear next step, "link in bio".

Captions are the 3-word karaoke style from the shorts player. Keep them; the art must not
duplicate them word for word.

## 5. Copy rules

- 70 to 80 spoken words for about 40 s (Edge TTS runs roughly 2 words per second).
- Short sentences. Second person ("you", "your"). No jargon (no WebGPU, SQLite, React Native, LLM).
- Claims must be true for Vantage: on-device inference and memory, no cloud upload, Plan, Act,
  Reflect loop, three pillars. Do not invent features, numbers or testimonials.
- CTA names the real next step ("Try Vantage free on the web, or get it on Google Play. Link in
  bio."). Never "full breakdown in the description" (generator default; edit it out).
- Buttons in a video are not clickable on TikTok. Use "link in bio" and keep URLs as plain text.

## 6. Pitfalls we already hit

- The pipeline's own scene generator (before this style existed) produced empty, emoji-heavy
  scenes. Use `"style_bundle": "vantage"` in the project config.json (see the skill) so it uses this kit.
- `claude-sonnet-4-20250514` is retired. Use `claude-sonnet-5-5`.
- On Windows set `PYTHONUTF8=1`, and make sure ffmpeg is on PATH.
- Renders need a `projects/<name>/scenes/index.ts` stub exporting `PROJECT_SCENES`, even for
  shorts.
- `deriveShortsSceneDir` used to split only on `/`. Fixed in `render-utils.mjs`. If custom
  scenes seem ignored, look for "No custom short scenes found" in the render log.
- `projects/` is gitignored. Commit reusable scenes to `templates/vantage_short/`.
- Always review frames from mid-beat and end-of-beat, not only the first frame of each beat.

<!-- LLM-BRIEF-START -->
## Scene brief for the scene generator (vantage style)

You are writing one Remotion scene for the Vantage style bundle. Follow these rules exactly.

IMPORTS. Use only React, remotion (`useCurrentFrame`, `Sequence`, `interpolate`) and the shared kit:
`import { Scene, Art, Draw, Headline, Label, NeuralNet, PhonePath, LockGlyph, THEMES, SERIF, MONO, prog, usePop } from "@remotion-components/vantage/kit";`
Do NOT import ./styles. Do NOT use emoji. Do NOT use any other fonts or libraries.

STRUCTURE. Export `BeatNScene: React.FC<{ startFrame?: number }>` (also `export default`).
Return `<Scene theme="parch"|"navy" beat={N} chapter="0N · TITLE" readout="UPPERCASE READOUT">`
containing one `<Art>` (SVG, coordinates in a 1080 x 1660 box) plus `Headline` and `Label`
(HTML, absolutely positioned). `useCurrentFrame()` is already beat-local (starts at 0).
Beat length is given in the task; the 6-beat video timeline uses `beat` 1 to 6.

THEMES. `parch` (parchment, red accent) is for the problem or old world. `navy` (midnight, amber
accent) is for Vantage. A beat may flip from parch to navy once: render the navy `Scene` inside
`<Sequence from={72}>` (with `fade={false}`), and the parch `Scene` on top in a div whose
opacity goes 1 to 0 over about 25 frames.

DRAW IT. Show the idea with line art, not words: use `<Draw d="..." from={frame} dur={frames}
w={3..6} />` for every stroke (it draws on). Build simple shapes from SVG path data (phones,
clouds, circles, arcs, stairs, speech bubbles). Add continuous motion (pulses, rings, dashed
flow with `strokeDashoffset={-frame * 1.5}`).

TEXT. `Headline lines={["TWO LINES", "WITH *ACCENT"]}` at top 170 to 200, size 112 to 124, at most
3 lines, at most 16 characters per line, uppercase. `Label` for mono captions, minimum size
22, serif titles at 50 or more. Nothing below y = 1660. Keep text short (at most 6 words per
label).

TIMING. Entrance delays are frames. Sync key reveals to the word timestamps (seconds x 30).
Everything is on screen and readable by frame 100 of the beat, and keeps moving afterwards.

CONTENT. Only claims from the beat caption and visual description. Do not invent features or
numbers. Use the example scenes as a template for structure and spacing.
<!-- LLM-BRIEF-END -->
