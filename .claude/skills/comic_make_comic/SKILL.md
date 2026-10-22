---
name: comic_make_comic
description: Turn a comic or manga page image into an interactive drag-to-rotate web bundle for the Comic style bundle (each panel is a 360-degree orbit clip generated locally in ComfyUI with MiniMax H3 plus the ORB360 LoRA, shown by a static viewer). Use when asked to make a rotatable comic, a comic with changeable viewpoints, or to regenerate a panel.
metadata:
  tags: comic, manga, comfyui, orbit, viewer
---

# Make a rotatable comic

## Requirements

Style source of truth: `docs/comic_style_guide.md` (read it first). Scripts: `scripts/comic_new_comic.py`,
`scripts/comic_orbit_comfy.mjs`, `scripts/comic_build_bundle.py`. Viewer: `templates/comic_viewer/index.html`.
Model facts and timings: `docs/TryComfyUIOptions.md`. This is **not** a Remotion video: do not use
`video_make_core`, and do not mix in another style bundle's kit.

- ComfyUI >= 0.42 (FastH3 template `video_fasth3_ominiref_r2v`) running on `http://127.0.0.1:8188`, started
  with no `--listen`, and the model files from `docs/TryComfyUIOptions.md` section 6 (FastH3 Omni int8 ConvRot,
  Qwen3-VL text encoder, video and audio VAEs, `minimax_h3_orb360_step1500` LoRA). Official Hugging Face only.
- Playwright (`npm i -g @playwright/test`) and Chrome. Python with Pillow and numpy (`pyproject.toml`).
- Set `PYTHONUTF8=1` for Python. A clip takes about 3.5 minutes on the 12 GB laptop GPU **on AC power**; on
  battery the GPU is power-capped and it takes 10 minutes or more. Plug in, and keep the machine awake.

## Inputs to collect

The page image (png, jpg or webp), a title, and any speech-bubble text (with the panel it belongs to). Ask which
panels must stay static. Never invent dialogue.

## Workflow

1. **Scaffold**: `python scripts/comic_new_comic.py <project> --page <image> --title "<title>"`. It copies the
   page, detects the panels (or use `--panels file.json`), crops the references inside the frames, and writes
   `projects/<project>/comic/{comic.json,jobs.json,refs/,orbit_caption.txt}`.
2. **Check by eye** (Read tool): the page, and every `refs/<id>.png`. Confirm the panel count and order, that no
   reference contains a black frame strip, and that each panel has one clear rigid subject. Delete the jobs of
   panels that are unsuitable (crowds, text, several actors) from `jobs.json`; they stay static.
3. **ComfyUI up?** `curl -s http://127.0.0.1:8188/system_stats`. If not, start it as in
   `docs/TryComfyUIOptions.md`, without `--listen`.
4. **Generate**: `node scripts/comic_orbit_comfy.mjs <project>` (add `--only p1,p2` for some panels). It prints a
   line per clip. If a line says `SLOW`, check the laptop is on AC power (the script also warns about battery at
   the start), then restart ComfyUI if it still is. `CACHED` means the clip came back in under 20 s from an earlier
   run of the same graph and seed, not a new render. Run in the background and watch the
   log; do not poll in a loop.
5. **Review each clip**: `ffmpeg -i clips/<id>.mp4 -vf "select='eq(n,0)+eq(n,41)+eq(n,62)+eq(n,82)+eq(n,123)',scale=320:-1,tile=5x1" -frames:v 1 sheet.png`
   and Read it. Apply the quality bar in the guide (section 4). If a clip fails, change its `seed` in `jobs.json`
   and run `--force --only <id>`. Do not ship a failed clip; leave that panel static and say so.
6. **Bubbles**: add entries to `bubbles` in `comic.json` (`panel`, `lines`, `x`, `y`, `w`, `h` in percent of the
   panel) for the text the user gave you.
7. **Build**: `python scripts/comic_build_bundle.py <project>` writes `projects/<project>/comic/bundle/`.
8. **Verify in a browser** (Playwright, open `bundle/index.html` from `file://`): all frames load, dragging a
   panel changes only that panel, "Reset view" returns to frame 0, a full-turn drag lands back on the start,
   the arrow keys turn a focused panel and Home resets it, black and white and bubbles toggle, the status line
   shows no failed frames, no console errors, no horizontal scroll at 390 px. Screenshot a normal and
   a turned state and look at them; the frame must show no black strips or seams at the panel edges.
9. **Report** the panel count, per-clip times and seeds, any static panels and the bundle size. Promote reusable
   fixes to the scripts, the viewer and the guide, not to `projects/`.

## Pitfalls

- A panel with the subject seen from behind gets an invented face and far side that change with the seed.
- "LoRA ... not in ComfyUI models/loras": the file is missing; see `docs/TryComfyUIOptions.md`.
- `ComfyUI execution error` out of memory, or `RuntimeError: Fault failed: 2` (the dynamic VRAM loader): the
  script carries on with the next panel. Rerun the failed one with `--only <id>`; if it repeats, close other
  GPU apps and restart ComfyUI. One such failure was transient and the retry worked.
- The overlay must meet the page frame with no seam: `rect` is measured from the frame thickness. If a sliver
  of the old page art shows at a panel edge, fix `rect` in `comic.json` by a pixel or two and rebuild.
- Re-queueing an unchanged graph returns a cached clip in seconds (the script now prints `CACHED`); change the
  seed to render again.
- Clips take 10 minutes or more, or a `SLOW` line: the laptop is probably on battery (GPU at 277 MHz instead of
  about 1,600 MHz). Plug in. Restarting ComfyUI does not help.
- The page is not rectangular or has no white gutters: detection finds the wrong panels, or one big panel and a
  `WARNING: found a single panel`; pass `--panels`.
- Re-running the scaffold needs `--force`. It keeps the bubbles and each panel's seed and LoRA flag, but brings
  deleted jobs back (delete them again) and rewrites `refs/`.
- Panel and project ids must be 1 to 32 letters, digits, `_` or `-`, and `jobs.json` paths must stay inside
  `projects/<project>/comic/`: the scripts refuse anything else (they build file names and delete folders from them).
- `template changed: node N should be ...`: ComfyUI's FastH3 template was updated and its node ids moved. Update
  the `N` and `TYPES` tables at the top of `scripts/comic_orbit_comfy.mjs` after reading the new template.
- The viewer status line turns red when frames fail to load (a missing or corrupt JPEG): rebuild the bundle.
- `projects/` is gitignored; the bundle is a build output and is not committed.
