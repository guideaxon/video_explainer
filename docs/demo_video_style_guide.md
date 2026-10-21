# Demo Style Bundle: Video Style Guide

Style for the **Demo** style bundle: narrated, captioned **product demos built from real screenshots**, with no
screen recording. Landscape **1920x1080** by default (website, YouTube, sales); `--portrait` gives 1080x1920.
Other style bundles have their own guide, kit and skill; do not mix styles. Unlike Promo (abstract glass mockups),
Demo shows the **real product screens** the user supplies.

Implementation: kit `remotion/src/components/demo/kit.tsx`, shared helpers `scripts/_demo_manifest.py`,
scaffold `scripts/demo_new_video.py`, scene generator `scripts/demo_build_scenes.py`, pacing
`scripts/demo_finalize_storyboard.py`, workflow skill `.claude/skills/demo_make_video/`.

## 1. How it works

`projects/<p>/manifest.json` is the single source of truth: brand, an ordered list of scenes, narration, focus
regions, highlights and cursor paths. `demo_build_scenes.py` generates `scenes/*.tsx`, `scenes/index.ts` and
`narration/narrations.json` from it, so a video needs no hand-written scene code. Re-run it after every
manifest edit (scene files are regenerated; never edit them).

Scene kinds: `intro` (logo, headline, sub line), `step` (screenshot in a device frame) and `outro` (headline
and a call-to-action pill). Scene fields:

| Field | Meaning |
|---|---|
| `title` | Registry key source (slug of the title); unique per video |
| `caption` | On-screen headline, at most 8 words; `*word` is drawn in the accent colour |
| `narration` | Spoken line (also burned in as subtitles) |
| `screenshot`, `aspect` | Path under the project dir; width/height of the file (set by the scaffold) |
| `device` | `phone`, `tablet`, `laptop` or `none`; guessed from the aspect ratio |
| `focus` | `{x,y,w,h}` in 0..1 of the screenshot; the camera zooms to it (up to 3.5x) |
| `highlight` | `{x,y,w,h}` in 0..1; a pulsing accent outline |
| `cursor` | `{from?:[x,y], to:[x,y], click?:bool}` in 0..1; a cursor glides and clicks |

## 2. Look

- Soft gradient background with an accent glow; **dark or light** theme chosen from the screenshots.
- **Accent colour** is detected from the screenshots (most common vivid hue) and can be overridden in
  `brand.accent`. One accent only. Font: Inter (400, 600, 800), loaded with `@remotion/google-fonts`.
- Device frames are drawn by the kit around the untouched screenshot: phone (notch), tablet, laptop (base),
  none (rounded card). The screenshot is never cropped, restyled or redrawn.
- Step tracker: dots plus "n / total" (top right in landscape, top left in portrait).
- Subtitles from the narration, at most 7 words per chunk, in a panel at the bottom.

## 3. Motion

Device springs in; after 0.6 s the camera zooms to `focus` over 1 s and keeps a slow push; the highlight
fades in, the cursor glides to its target and clicks (ripple). Transitions are 12-frame fades with 0.5 s
between scenes (`demo_finalize_storyboard.py`).

## 4. Layout and safe zone

- Landscape: headline top-left (y 52), device stage y 170 to 870, subtitles y 940.
- Portrait: keep everything in y 160 to 1500 and x 60 to 1020 (platform UI covers the rest); tracker y 176,
  headline y 250, stage y 470 to 1350, subtitles y 1390.

## 5. Voice

`edge` (default) or `elevenlabs` through `python -m src.cli voiceover`, or **your own recordings** with
`--provider manual --audio-dir DIR`, then `demo_finalize_storyboard.py --keep-audio`.
Narration 5 to 30 spoken words per scene (about 2.5 words per second).

## 6. Copy and data rules (checked by the pre-render review)

- **Show only what is in the screenshots.** Every caption, narration claim, number and feature must be
  visible in that scene's screenshot or come from the user's brief. Never invent UI states, data, results,
  customers or testimonials; never describe a feature the screens do not show.
- A `focus`, `highlight` or `cursor` must point at something real in the screenshot (read the image to place it).
- No leftover `TODO` text anywhere (the scaffold writes TODO placeholders on purpose).
- Registry key rule: each scene key equals the slug of its title ("The Inbox" gives `inbox`); titles are unique.
- Superlatives and guarantees need a source; keep the tone factual and addressed to the stated audience.
- Screenshots may contain personal data (names, emails, tokens): check and blur or replace them before use.
