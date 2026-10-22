# Comic Style Bundle: Style Guide

Style for the **Comic** style bundle: a comic or manga page where **each panel can be turned by dragging**, like
the reference artifact "Desert Lighthouse". The output is a **static web bundle** (one `index.html`, the page
image and a JPEG frame folder per panel), not a Remotion video. It has no narration, no voiceover and no
storyboard, so it does not use the `video_make_core` skill. Other style bundles have their own guide, kit and
skill; do not mix styles.

Implementation: viewer `templates/comic_viewer/index.html`, scaffold `scripts/comic_new_comic.py`, generator
`scripts/comic_orbit_comfy.mjs`, builder `scripts/comic_build_bundle.py`, workflow skill
`.claude/skills/comic_make_comic/`. Research, model choice and measured timings:
`docs/ComfyUIBasedStoryGeneration.md` and `docs/TryComfyUIOptions.md`.

## 1. How it works

A panel is a **360-degree orbit video** of its frozen scene, decoded into frames. Dragging maps to a frame
index, so the panel is a scrubbable video, not 3D: it can only show the angles that were rendered (yaw only).

1. `comic_new_comic.py` finds the panels on the page, **measures the thickness of each black frame** (4 to 8 px),
   crops one reference image per panel 4 px inside it, snaps it to an aspect ratio the generator supports, and
   writes `comic.json` and `jobs.json`. The overlay `rect` is the frame's inner edge, so the page frame covers
   the seam; a fixed inset instead leaves a sliver of the old art visible.
2. `comic_orbit_comfy.mjs` runs each job in a local ComfyUI: FastH3 Omni (8 steps) plus the ORB360 LoRA at
   strength 1.0, 124 frames at 24 fps, about 0.64 megapixels, with the ORB360 orbit caption.
3. `comic_build_bundle.py` decodes every clip into `panels/<id>/0000.jpg ...` and writes `index.html` with the
   manifest inlined (it also opens from a file). The bundle does not depend on the model that made it.

`projects/<p>/comic/comic.json` is the single source of truth:

| Field | Meaning |
|---|---|
| `title`, `page`, `page_size` | Title, page image file and its pixel size |
| `panels[].id` | `p1`, `p2` ... in reading order |
| `panels[].rect` | `[x0, y0, x1, y1]` page pixels, **inside** the black frame; the video overlay sits here |
| `panels[].frame_rect` | The detected rectangle with the frame (reference only) |
| `panels[].aspect` | The generator aspect chosen for the panel |
| `bubbles[]` | `{panel, lines[], x, y, w, h}`; x, y, w, h are percentages of the panel; lines are Japanese or any text, shown top to bottom |

A panel with no `clips/<id>.mp4` stays a static part of the page.

## 2. Source art rules

- Layout made of rectangles separated by white gutters. Anything else: pass `--panels` with the rectangles.
- **One clear rigid subject per panel**, in a setting the model can continue. Multi-character action panels,
  crowds and text-heavy panels do not orbit well: leave them static (delete the job).
- A subject that **faces the camera** orbits well even without the LoRA. A subject seen **from behind** needs the
  LoRA, and the model then **invents the front** (face, clothes) and the far side. Nothing in the page defines
  them, and they change with the seed. If identity matters, supply a second reference view (the LoRA card
  recommends three views) before relying on it.
- Painted or line-art style survives the orbit (tested on anime-style art). Expect small background inventions
  (grass at the foot of a balcony, snow, a lake) on the far side.

## 3. Generation settings (do not change without a test)

| Setting | Value | Why |
|---|---|---|
| Frames, fps | 124 at 24 | The LoRA caption timestamps assume it; frame 123 is the start view again |
| Steps, sampler | 8, euler, simple, no CFG | FastH3 Omni is the 8-step distilled model |
| ORB360 LoRA | `minimax_h3_orb360_step1500`, strength 1.0, model only, before the sampling nodes | Without it, back-facing panels stall halfway |
| Size | about 0.64 MP at the nearest of 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9, 21:9 | Trained at 800x800 (0.64 MP); the Resolution Selector rounds, so 800x800 becomes 832x832 |
| Attention | template defaults (VSA, comfy kitchen attention, shift 12 / 3) | The distilled model is trained with them |
| Seed | per job in `jobs.json` | Change it to retry a clip; same seed gives a bit-identical clip |

Speed on the 12 GB laptop GPU: about 3.5 minutes per clip (200 to 246 s) **with the laptop on AC power**. On
battery the GPU is power-capped (measured: 277 MHz and 31 W, against about 1,600 MHz and 80 W on AC) and a clip
took 10 minutes or much longer; the same inputs gave a bit-identical clip either way, so only the time is lost.
Plug in before generating. `comic_orbit_comfy.mjs` warns when Windows reports battery, flags clips over 480 s as
SLOW, and flags results under 20 s as cached (re-queueing an unchanged graph and seed returns the old result, so
change the seed to render again). Keep the machine awake for a batch: sleep ruins the timings.
Weights come only from the official Hugging Face repos; all H3 weights fall under the MiniMax H3 Community
License, so check it before commercial use.

## 4. Quality bar for a clip

Look at frames 0, 41, 62, 82 and 123 (a contact sheet). Accept a clip only when:

- the **loop closes**: frame 123 shows the same view as frame 0 (by eye; measured clips reach only 14 to 18 dB
  PSNR against frame 0, so expect a small jump at the wrap);
- the camera really turns (a back view appears near frame 62), not a pan;
- the subject keeps outfit, proportions and line style, and is **not duplicated**;
- **no frame edge artifacts**: no black frame strips, and no text or panel borders inside the clip.

Otherwise change the seed in `jobs.json` and rerun with `--force --only <id>`. Do not hide a failed panel: leave
it static and say so.

## 5. The viewer

Drag left or right on a panel to turn only that panel (inertia, wrap-around: the turn is `frames - 1` long so
the last frame is the first view). A focused panel also turns with the left and right arrow keys (Shift for
bigger steps) and resets with Home or Escape. Per panel: "Reset view" (shortest way back). Global: speech bubbles
on or off, black and white, auto-rotate (24 fps), reset all. Touch works and vertical page scroll still works
(`touch-action: pan-y`). Inertia and easing are scaled by the real frame time, so they feel the same at 60 and
120 Hz. The video is `cover`-fitted into the panel rectangle, so generate at the panel's own aspect to avoid
cropping. Light and dark page themes follow the browser.

**Loading and memory.** Frames are decoded into `ImageBitmap`s at the size the panel needs (display size, at most
2x pixel density, never upscaled), six at a time, then dragging is instant. For the five-panel Lighthouse page
that is 396 MB of decoded frames at a 900 px window and about 95 MB at 390 px, against 1,689 MB if the full-size
frames were kept (computed from the bitmap sizes; browser process memory was not measured). A panel shows its
first frames as soon as they decode, but the whole page takes about 6 s to finish on a desktop. If the window
becomes more than 20% wider than the loaded frames, the frames are reloaded at the bigger size and swapped in when
done (about 6 s). A frame that fails to load is counted and shown as a warning under the page; the panel keeps
working with the frames it has.

Not in the bundle yet: depth or 3D versions, gyro input, lazy loading of whole panels for very large pages, an
auto-tour MP4. Bundle size on disk is still about 12 MB per panel (JPEG frames), which matters if the page is served.
