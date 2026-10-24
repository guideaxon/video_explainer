# ComfyUI-based story generation: rotatable comic panels

Status: research and prototype planning. Nothing is implemented in the repo yet, and no models have
been downloaded. Researched 2026-10-20.

## 1. Goal

Make a comic (or story) where the reader can freely change the angle of view of each panel, like the
reference artifact below, with the panel imagery generated locally in ComfyUI using MiniMax-H3 and the
ORB360 LoRA.

## 2. The reference artifact

- "砂漠の灯台" (Desert Lighthouse): https://claude.ai/artifact/4tbJgtF76uCZkroqFVy51x
- Visible text: dragging a panel left or right rotates only that panel's viewpoint, and each panel
  moves independently. Controls: reset to the initial viewpoint, black and white toggle, speech
  bubble toggle.
- How it works (from the saved page source, not from the artifact's own description):
  - A full-page image with an overlay `div` per panel (positioned from panel rectangles as
    percentages of the page size), each containing a `<canvas>`.
  - Each panel holds a **360-degree orbit video decoded into a frame sequence** (WebCodecs, with a
    `<video>` seek fallback), stored as compressed JPEG blobs and cached.
  - Drag distance maps to a frame index (`turn`, `vel`, `lastIdx`) and that frame is drawn on the
    canvas. There is also a loop mode.
  - So it is a scrubbable video, not 3D. The panel can only show angles the video rendered (yaw only).
- A second artifact, https://claude.ai/artifact/5SzPKr8C8PaYSL3p17W5Bu, could not be read (not found
  or not shared with the signed-in account). What it used is unknown. The markdown pasted from it
  only repeated the same drag-to-rotate instruction and named no tools.

## 3. Candidate technologies

### 3.1 MiniMax-H3 and orbit LoRAs

- Base model: https://huggingface.co/MiniMaxAI/MiniMax-H3 (variants FL2VA = first/last frame to
  video+audio, Ref2VA = reference images to video+audio).
- ORB360 LoRA (the one asked about): https://huggingface.co/MATLOWAI/MiniMax-H3-ORB360-CardSpin
  - Files, 597 MB each, fp32: `minimax_h3_orb360_step1500.safetensors` (clean orbit, the one to use),
    `minimax_h3_orb360_cardspin_v2_step50.safetensors`, `minimax_h3_orb360_cardspin_step50.safetensors`.
  - Needs the Ref2VA base model. Clockwise 360-degree orbit around a frozen subject.
  - Card settings: LoRA strength 1.0, 124 frames at 24 fps (the prompt timestamps assume this), 20
    steps, seed 20260926 in the example. Tested at 800x800, 1024x768, 1152x768, 672x832, 832x1024.
  - Prompts: use the caption files in `prompts/` (`orbit_realscene_caption.txt` for one photo,
    `orbit_3ref_caption.txt` for three views, `cardspin_caption.txt` for card spin). Audio sections
    set to `N/A`.
  - Recommended with three views of the same subject for best results.
  - Known limitation (per the card): camera-height prompts (e.g. 35 degrees above) did not hold on
    real photos. They work on grey-backdrop renders. So expect yaw only.
  - No ComfyUI workflow file is provided. The card says to load a Ref2VA model, add the standard
    Load LoRA node (model only), supply the reference image(s) and paste the caption.
  - License: MiniMax H3 Community License Agreement (not MIT; commercial and territorial terms).
    Read the upstream terms before commercial use.
- Alternative seamless-loop LoRA (FL2VA, same image as first and last frame):
  https://huggingface.co/pablodawson/MiniMax-H3-360-Orbit-LoRA. Reported 3 s as the recommended
  length (5 s rotated twice).
- Write-ups (Japanese): https://note.com/sepiablue/n/nde0914736f86 and
  https://note.com/sepiablue/n/n560d371047d4
- Other community repos found: https://huggingface.co/Kijai/MiniMax-H3-experimental,
  https://huggingface.co/MATLOWAI/minimax-h3-fused-turbo-int8-convrot (includes ready ComfyUI workflow
  JSONs, including `05_ref2va_4step_sla` and lowvram variants),
  https://huggingface.co/Alissonerdx/Minimax-H3-ComfyUI (workflows for other H3 LoRAs).

### 3.2 ComfyUI-ready model files

Repo: https://huggingface.co/Comfy-Org/MiniMax-H3

| Component | File | Size |
|---|---|---|
| Diffusion model, Ref2VA | `diffusion_models/minimax_h3_ref2va_pruned_w6a8.safetensors` | 16 GB |
| Diffusion model, Ref2VA (larger) | `..._pruned_fp8_scaled` / `..._pruned_int8_convrot` | 21 GB |
| Diffusion model, Ref2VA (full) | `..._ref2va_bf16` | 66 GB |
| Text encoder | `text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` | 15.7 GB |
| Text encoder (as documented on LoRA card) | `..._int8_convrot` | 27 GB |
| Video VAE | `vae/minimax_h3_video_vae_fp16.safetensors` | 5.2 GB |
| Audio VAE | `vae/minimax_h3_audio_vae_fp32.safetensors` | 0.6 GB |
| Speed-up LoRA (optional) | `loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors` | 2 GB |

- Smaller option: Kijai's `minimax_h3_ref2va_pruned_w4a8_mixed.safetensors`, 11.8 GB (experimental,
  may need extra custom nodes).
- Minimal set for this machine: about 40 GB (w6a8 + nvfp4 text encoder + VAEs + ORB360 LoRA + turbo).
- The official repo's transformer is about 66 GB and its text encoder about 65 GB, so it is not
  usable on this GPU.

### 3.3 The Gemini demo repo

https://github.com/google-gemini/gemini-4-demo-vanilla-3D ("Vanilla 3D rendering with Gemini 4
Argon", Apache-2.0, not an officially supported Google product). It is one hand-coded procedural
room (a sunlit library) with a Python/NumPy renderer and a no-build vanilla JS WebGL2 browser engine
that reshapes the room as the frame is resized. It does not convert images to 3D, so it does not
replace the orbit approach. It is useful only as a pattern for a dependency-free WebGL2 viewer, or
as inspiration for Gemini-written procedural scenes for simple stylized sets. Not cloned or run.

## 4. The local environment (checked via the API on 2026-10-20)

- ComfyUI 0.40.0 at http://127.0.0.1:8188 (updated to v0.42.3 by 2026-10-21, see `TryComfyUIOptions.md`), install at `D:\ComfyUIEasyInstall\ComfyUI`, Python 3.12.10,
  PyTorch 2.11.0+cu130.
- GPU: NVIDIA GeForce RTX 5070 Ti Laptop, 12 GB VRAM. RAM: 68 GB total.
- 2241 node types registered. Native MiniMax-H3 nodes exist: `MiniMaxH3ImageToVideo`,
  `MiniMaxH3ReferenceToVideo`, `MiniMaxH3AddGuide`, `MiniMaxH3SigmaShift`,
  `MiniMaxH3FunControlNetApply`, `EmptyMiniMaxH3LatentAV`. LTX-Video, Wan, Hunyuan Video and SVD
  nodes also exist.
- Installed models: only `sd15\juggernaut_reborn.safetensors`. The API lists no loras,
  diffusion_models, unet, vae, text_encoders or clip_vision. The MiniMax-H3 model and the ORB360
  LoRA are not installed. Model folders on disk each hold a single file, which was not opened.
- Free disk: D: 648 GB, C: 133 GB, E: 417 GB, F: 1723 GB.
- The repo has no existing code for MiniMax, ORB360 or panel rotation. Existing channels are listed
  in `CLAUDE.md`.

## 5. Proposed design (long term)

Make the panel a 3D asset, not a video, and keep the video as a first version.

1. **Per-panel scene representation behind one interface**, `renderPanel(camera) -> pixels`:
   - v1: orbit frame sequence scrubbed by drag (what the artifact does). Yaw only.
   - v2: 2.5D layered panel with a depth map. Free yaw and some pitch in a limited cone.
   - v3: Gaussian splat or mesh reconstructed from the orbit frames. Free movement. Here the orbit
     video is the input to reconstruction.
2. **Python generation pipeline in this repo**: panel segmentation (page image plus rectangles),
   orbit generation behind a pluggable backend (local ComfyUI or hosted API), ffmpeg frame
   extraction, optional depth or reconstruction, and a `manifest.json` per comic (like the demo
   channel). Output is a static bundle that does not depend on the model that made it.
3. **Static, no-build WebGL2 viewer** that reads the manifest and renders panels through the interface,
   with drag, touch and gyro input, lazy loading, per-panel reset and black-and-white and
   speech-bubble toggles.
4. **Fit with the repo**: a new `comic` channel (style guide, template, scaffold and finalize scripts,
   skill), kept separate from Remotion. Remotion only renders an optional auto-tour MP4 of the same
   bundle from the same manifest. Model-specific code stays in adapters.
5. **Per-panel fallback** in the manifest: frame sequence or static image where 3D is a poor fit.

## 6. Prototype plan (not started)

1. Download the minimal model set (about 40 GB) into `D:\ComfyUIEasyInstall\ComfyUI\models\`.
2. Build or adapt a ComfyUI workflow (start from the MATLOWAI `05_ref2va_4step_sla` workflow or the
   native nodes) with the ORB360 LoRA at strength 1.0 and the caption from `prompts/`.
3. Generate one clip (about 124 frames at 800x800) from a single frozen subject, such as the
   LoRA repo's `examples/whitecat.png` or a comic panel.
4. Extract frames with ffmpeg and build a single-file drag-to-rotate HTML viewer like the artifact.
5. Evaluate loop seamlessness, subject consistency, generation time and, later, usability of the
   frames for reconstruction.

### 6.1 Prototype status (2026-10-21)

Steps 1 to 5 were done for two panels of the reference comic. Details and timings are in
`docs/TryComfyUIOptions.md`.

- Generation: FastH3 Omni (int8 ConvRot) plus the ORB360 LoRA at 1.0, 832x832, 124 frames, 8 steps. About
  3.5 to 4 minutes per clip on this machine when the server is healthy. The loop closes on every seed tried.
- Viewer: `templates/comic_viewer/index.html`, built into a bundle by `scripts/comic_build_bundle.py`
  (spec json, ffmpeg frame extraction, manifest inlined so the page also opens from a file). Features: per
  panel drag to rotate with inertia, wrap-around (the last frame repeats the first view, so the turn is
  `frames - 1` long), per-panel and global reset, black and white, speech bubbles, auto-rotate, touch
  support. Tested in headless Chrome from `file://`: panels turn independently, reset returns to frame 0,
  a full-turn drag lands back on the start view, no console errors, no horizontal scroll at 390 px.
- Built bundle for the Desert Lighthouse page: `projects/lighthouse_comic/bundle/` (gitignored, 56.8 MB,
  all five panels rotatable, 620 frames, loads from a local file in under a second). Panels p1, p2 and p5
  were generated at their own aspect ratios (21:9, 1:1, 2:3); p3 and p4 are still from square crops.
- Now a style bundle: `docs/comic_style_guide.md`, skill `.claude/skills/comic_make_comic/`, scripts
  `comic_new_comic.py` (panel detection, measured frame, references), `comic_orbit_comfy.mjs` (ComfyUI driver)
  and `comic_build_bundle.py <project>`. All five panels were regenerated through it
  (`projects/lighthouse_comic_v2/comic/`, 58.6 MB). The border seam is fixed and checked in the rendered edges.
- Open defects: the loop closes by view but not pixel-exactly (frame 0 vs 123 PSNR 14 to 18 dB), the turn of
  p1 is weak, and the invented front and far side of a subject differ between seeds and crops.
- Limits seen: the clips were generated from square crops, so in the page the panel is a zoomed, cropped
  version of the original rectangle (cover fit). Generate at the panel's own aspect ratio to avoid that.
  The invented far side of a subject is not stable across seeds.
- Not done: remaining panels, the 3D or depth versions (v2, v3), gyro input, a `comic` style bundle with a
  skill and guide, lazy loading for large pages (all frames of a panel load at once).

## 7. Open questions

- What did the second artifact (https://claude.ai/artifact/5SzPKr8C8PaYSL3p17W5Bu) use? It could not
  be read (HTTP 404 again on 2026-10-21 through the Artifact tool). If it is shared with the account, or its page
  source is pasted, the technique can be identified.
Answered by the 2026-10-21 evaluation (`docs/TryComfyUIOptions.md`, section 0):

- Does the model fit and run at a usable speed in 12 GB VRAM with offloading to 68 GB RAM? **Yes.** FastH3 Omni
  int8 plus the ORB360 LoRA takes about 3.5 minutes per clip (200 to 246 s) with the laptop on AC power, peak VRAM
  10 to 11.3 GB, no flags. On battery the GPU is power-capped and it takes 10 minutes or more.
- Does the ORB360 LoRA work on a quantised base? **Yes on the FastH3 Omni int8 ConvRot base** (loads, runs, clean
  orbits on five panels). Not tested on the w6a8 or Kijai w4a8 bases, which were never run.
- Cost and time per comic: about 3.5 minutes of generation per rotatable panel (five panels took about 18 minutes
  of generation), plus about 1 minute to build the bundle; no per-clip fee, local only.
- Which source images, and does the comic need narration? The reference comic page's panels were used
  (`projects/lighthouse_comic_v2`), and the Comic style bundle is the interactive viewer only: no narration.

Still open or untested:

- Does the nvfp4 text encoder change output compared with the int8 one the card documents? Every run used the
  nvfp4 encoder and the output was good; it was not compared against the int8 encoder.
- Does the 4-step turbo LoRA stay compatible with ORB360 (trained at 20 steps) and keep the orbit
  clean? Not tested.
- Does the orbit stay consistent enough for 3D reconstruction (v3), especially on flat manga
  linework? Test this early on a few panels.
- Can elevation (pitch) be obtained at all? The card says camera-height prompts do not hold on real
  photos. Depth-map parallax (v2) may be the only route.
- How well does the LoRA cope with multi-character or action panels? It is built for a single frozen
  subject. Not tested: all five Lighthouse panels have one main subject (p1's small walker was duplicated once).
  The style guide tells users to leave such panels static.
- Licence: MiniMax H3 Community License terms for commercial use of generated output and for
  redistributing weights. Not yet read in full.
- Which backend for production: local ComfyUI or a hosted API?
- Is the Gemini demo repo worth borrowing from? Its code has not been inspected.

## 8. Sources

- https://claude.ai/artifact/4tbJgtF76uCZkroqFVy51x
- https://claude.ai/artifact/5SzPKr8C8PaYSL3p17W5Bu (unreadable)
- https://huggingface.co/MATLOWAI/MiniMax-H3-ORB360-CardSpin
- https://huggingface.co/pablodawson/MiniMax-H3-360-Orbit-LoRA
- https://huggingface.co/MiniMaxAI/MiniMax-H3
- https://huggingface.co/Comfy-Org/MiniMax-H3
- https://huggingface.co/Kijai/MiniMax-H3-experimental
- https://huggingface.co/MATLOWAI/minimax-h3-fused-turbo-int8-convrot
- https://huggingface.co/Alissonerdx/Minimax-H3-ComfyUI
- https://note.com/sepiablue/n/nde0914736f86
- https://note.com/sepiablue/n/n560d371047d4
- https://note.com/catap_art3d/n/nbbff224f4549
- https://github.com/google-gemini/gemini-4-demo-vanilla-3D
- https://github.com/FlashML-org/FreeVideo (code only, section 9)
- https://github.com/lightningpixel/modly (section 9)
- https://github.com/neilsonnn/image-blaster (section 9)

## 9. Evaluation of three other repos (2026-10-20)

Method: shallow clones read as text only. Nothing was installed or run, and no model, mirror or
Chinese-hosted link was opened. The clones sit in a scratchpad folder outside this repo.

### 9.1 GPU, disk and model size on this machine

- Hardware: RTX 5070 Ti Laptop, 12 GB VRAM (about 1 GB already in use by the desktop), 63 GB RAM.
  Free disk: D: 648 GB, C: 133 GB.
- Disk: the minimal set in section 3.2 is about 40 GB. Budget 60 to 80 GB for a second diffusion
  variant, outputs and ComfyUI's cache. D: has plenty.
- Largest files that make sense: the 16 GB w6a8 Ref2VA file and the 15.7 GB nvfp4 text encoder. The
  21 GB and 66 GB diffusion files and the 27 GB int8 encoder are not worth downloading for 12 GB.
- Does it fit? Not wholly in VRAM, but 12 GB is not a hard blocker. FreeVideo's planner
  (`docs/execution-planning.md`) keeps up to 44 of 50 transformer blocks resident, streams the rest
  from pinned RAM, runs the text encoder in a separate process that exits first, and streams the VAE
  decoder. It documents 8 GB VRAM + 64 GB RAM (RTX 4060 Ti, community report) at 603 s for a 10 s
  1344x768 clip with two-pass sampling, and 16 GB cards at 486 to 558 s. A 12 GB card with 63 GB RAM
  should land between those. That is for FreeVideo's distilled 8-step model, not for ORB360. A
  124-frame 800x800 orbit is smaller than that benchmark, so expect minutes per clip, not seconds.
  Not measured on this machine.
- ORB360 compatibility is still open. FreeVideo's docs list only three other community LoRAs (VHS,
  Looping Sketch Anime, Male POV). ORB360 was trained against the bf16 Ref2VA base at 20 steps. The
  FreeVideo path runs a distilled 8-step model with its own int8 or ConvRot weights, so a LoRA may load
  but behave differently. Test ORB360 on the stock native-node path first, FreeVideo second.

#### ComfyUI flags and settings for this machine

Checked against `main.py --help` of the installed ComfyUI 0.40.0 on 2026-10-20. A second-hand summary
(unsourced, "Reddit feedback") was reviewed; what it got wrong is corrected here.

- RAM is about 63 GB, not 32 GB, so RAM and pagefile are less tight than commonly advised. If the
  pagefile is raised anyway, put it on D: (648 GB free), not C: (133 GB free).
- Start with no memory flags. This build has dynamic VRAM, and the help text says `--lowvram` "doesn't
  do anything if dynamic vram is enabled". Tune only if it fails or is slow:
  - `--reserve-vram <GB>` or `--vram-headroom <GB>`: leave VRAM free for the desktop (about 1 GB is
    already used) and avoid OOM.
  - `--async-offload [streams]` (default 2): overlaps weight copies with compute.
  - `--cache-ram [GB ...]`: RAM pressure caching, if models reload too often.
  - `--fast-disk`: disk-backed offload; only useful on a fast NVMe.
  - `--disable-dynamic-vram` plus `--lowvram` or `--novram`: fallback if dynamic VRAM misbehaves.
- Not memory flags: `--enable-cors-header` only enables cross-origin browser access. `--gpu-only`
  keeps everything on the GPU, so it contradicts offloading.
- `--fp8_e4m3fn-text-enc` exists, but whether it applies to the nvfp4/AWQ Qwen3-VL 32B file is
  untested. The text encoder is Qwen3-VL 32B (not T5) and the nvfp4 file is 15.7 GB, so it needs
  offloading.
- Quantisation: the real files are w6a8 (16 GB), fp8_scaled and int8_convrot (21 GB), and Kijai's
  experimental w4a8_mixed (11.8 GB). No GGUF build of H3 was found; treat any GGUF claim as unverified.
- ORB360 settings: the card uses strength 1.0 and 20 steps, tested at 800x800, 1024x768, 1152x768,
  672x832 and 832x1024. Strength 0.6 to 0.9, resolutions such as 640x360 or 736x576, and the 4-step
  turbo LoRA are untested, so expect to experiment. A first run at 672x832 or 800x800 is the safest.
- Speed: reports of 5 to 10 minutes per clip on 12 GB cards are plausible against FreeVideo's
  benchmarks but are not verified for this machine or for ORB360.
- Model cards re-read on 2026-10-20 (MATLOWAI ORB360 and MATLOWAI fused-turbo). Corrections to a second
  unsourced summary:
  - ORB360 is a rank-32 LoRA for **Ref2VA**, trained on the **BF16** Ref2VA transformer with
    `--prune_adaln`. The `int8_convrot` file in its training command is the **text encoder**. It was not
    trained on an fl2va or int8 diffusion base. (pablodawson's LoRA is the FL2VA one.)
  - The card does not say whether quantised bases (w6a8, int8_convrot, w4a8) work. Untested. Possible
    risk (inferred, not verified): ConvRot rotates weights, so a BF16-trained LoRA may not line up with
    an int8_convrot base. w6a8 is a different scheme.
  - Training resolutions: 800x800 (124 frames), 1024x1024 (73 frames), 1600x1600 (22 frames). Frame
    count differs by resolution, so 124 frames goes with 800x800. 512x512 or 640x640 is unproven.
  - Strength 1.0 in both ComfyUI and musubi per the card. Why lower strengths fail is speculation.
  - The card says nothing about turbo LoRAs. Claims that stacking "collapses" are unverified.
  - NVFP4 needs Blackwell. This GPU is Blackwell, so it is not a blocker. Quality impact is untested.
- Fused-turbo lead (MATLOWAI/minimax-h3-fused-turbo-int8-convrot): one 21 GB file with the 8-step turbo
  LoRA and a motion-smoothing LoRA baked in, run at 4 steps. Base is the pruned FL2VA model with a
  Ref2VA delta fused in. Card reports a 11.0 GiB peak and 65 s on a 16 GB card for the 4-step reference
  graph (resolution not stated). It does not mention ORB360. Applying LoRAs live instead of baked in
  raised peak VRAM from 47.8 to 68.9 GB on its 96 GB test card, so ORB360 on top may be costly.
  Needs the ComfyUI-MAINodes and SLA attention custom node packs (review before installing). The turbo
  LoRA comes from "lightx2v", which I believe is a Chinese-origin project (unverified).
- Updated test order: (1) stock nodes + w6a8 + nvfp4 encoder + ORB360 at 1.0, 800x800, 124 frames,
  20 steps; (2) if it fails or is too slow, the fused-turbo graph after reviewing its custom nodes.
- Latent upscaler: the one FreeVideo uses (`LBH-123-AI/Minimax_h3_latent_Upscaler`, MIT) is a community
  repo of unverified origin. Not required. Decision: skip it for now.
  - What it is: `minimax_h3_latent_upscaler_3d_conv_v1_fp16.safetensors`, 690 MB, sha256 pinned in
    FreeVideo's `dependencies.json`. It upscales the latent between two passes, so the video VAE is not
    used for an intermediate decode and re-encode. Single-pass generation needs none of this.
  - A second-hand summary claimed a "~5B parameter, 24-channel VAE" and a repo named
    `Comfyui_Minimax_h3_latent_Upscaler`. Unverified: the video VAE file is 5.2 GB in fp16 (about 2.6B
    parameters, so the 5 is probably the file size), and only the Hugging Face weights were seen.
  - Safetensors only makes the weights file safe. A ComfyUI custom node is arbitrary Python that runs on
    load, so read the node code before installing it.
  - Plan: one pass at 800x800, 20 steps, strength 1.0. If too soft, scale in pixel space with ffmpeg
    (Lanczos) before anything else. Native Upscale Latent is untested on H3 latents, which include audio.
  - Avoid for now under the no-Chinese-dependency policy: SeedVR2 (ByteDance) and Real-ESRGAN (Tencent
    ARC lab), both optional pixel upscalers.

### 9.2 FreeVideo (https://github.com/FlashML-org/FreeVideo)

What it is: a ComfyUI plugin plus Qt launcher that runs MiniMax H3 on 8 to 16 GB cards using block
streaming, int8/FP8 GEMM kernels and SageAttention. Code is Apache-2.0. Weights fall under the MiniMax
H3 Community License. It is the most relevant repo for the 12 GB question, and `freevideo_engine/`
(block residency, activation staging, VAE streaming) is worth reading as a reference.

Chinese dependencies and touchpoints found in code and constraints (no links opened):

| Item | Where | What it means |
|---|---|---|
| ModelScope (modelscope.cn) | `network.py`, `dependencies.json`, `download_settings.py`; `modelscope-hub==0.4.2` in `pyproject.toml` and every `constraints/*.txt` | Alternate weight source, and a package installed in the runtime even if never used |
| hf-mirror.com | `network.py`, `image_models.json` | Community HF mirror, outside Hugging Face's control |
| ghfast.top | `network.py`, `freevideo.ps1`, `scripts/bootstrap_linux.sh` | Third-party GitHub proxy used for the repo and for uv/Python downloads |
| Tsinghua (tuna) and NJU mirrors | `network.py`, `torch_downloads.json`, `uv_downloads.json`, `gcc_linux.json`, `git_linux.json` | Alternate PyPI, PyTorch wheel and conda sources |
| Quark and ModelScope offline packs | README, `scripts/publish_release.py` | Offline bundles only; optional |
| SageAttention (thu-ml, Tsinghua) | `dependencies.json`, README | Apache-2.0 source, commit pinned, built locally or from a pinned wheel hash |
| Community model repos | `dependencies.json` | `t8star/Vdn-Minimax-H3-Comfy` (text encoder, sha256 pinned) and `LBH-123-AI/Minimax_h3_latent_Upscaler` (MIT). The authors' origin is not verified |
| Qwen3-VL encoder, Qwen-Image 2.1 | `dependencies.json`, `image_gen/`, `THIRD_PARTY_NOTICES.md` | Alibaba models. Qwen3-VL is the text encoder inside the H3 stack, so it cannot be avoided. Qwen-Image 2.1 is an optional extra under the Qwen Research License |
| SenseVoiceSmall (FunASR, Alibaba) | `THIRD_PARTY_NOTICES.md` | Optional subtitle model |
| WeChat, QQ, Bilibili | README, issue config | Community links only |

Behaviour that matters:

- In the default `auto` mode the installer probes every source in parallel, official and Chinese
  mirrors alike, then sorts by measured speed (`network.plan`, `probe_score`). It could pick a mirror
  on this machine. Files are pinned by sha256 and revision, which limits tampering, but the traffic
  still goes to a third party.
- It states it does no location lookup and sets `HF_HUB_DISABLE_TELEMETRY=1`. A grep for telemetry,
  analytics, Sentry and PostHog found only local resource-history code. The launcher update check is
  limited to GitHub hosts. An ed25519-signed source overlay (`freevideo_source_bootstrap.py`) lets it
  replace its own source at runtime, so installing the app means trusting the maintainers' signing key.
- The H3 weights, the Qwen3-VL encoder and the VDN-H3 repo are needed whatever the route, so "no
  Chinese dependency" is not possible for the model itself. What we can control is which hosts the
  bytes come from.

Recommendation: do not run the `FreeVideo.exe` launcher. If we try it, install it as a ComfyUI custom
node in a throwaway copy of ComfyUI, force `official` as the download source, review the proxy lists
and `modelscope-hub`, and download the weights ourselves from Hugging Face. Treat it as a reference for
the memory techniques first.

### 9.3 Modly (https://github.com/lightningpixel/modly)

- Electron desktop app (React and TypeScript) with a FastAPI backend: image to 3D mesh, MIT licence.
  Models are installed as separate GitHub "extensions". Official ones: Hunyuan3D 2 Mini (and Turbo,
  Fast), TripoSG and Trellis2 GGUF. Hunyuan3D is a Tencent model, so that is the Chinese dependency
  here. It is opt-in per extension, and the core repo has no hard-coded Chinese hosts.
- Core Python deps: fastapi, uvicorn, httpx, mcp, trimesh, pymeshlab, scipy, huggingface_hub, hf_xet,
  cryptography. No ModelScope. Hosts in code are mostly test fixtures, PyTorch, GitHub, PyPI and LLM
  providers.
- Relevance: it does meshes, not video, so it could serve our v3 idea (3D from panel art). Useful
  patterns: per-model `weight_variants` with `size_gb` and `vram_gb`, a manifest-driven extension
  system, a CLI and an MCP server for agents, and optional ComfyUI orchestration helpers.
- Risk: extensions are arbitrary GitHub repos that run code and install dependencies, so each needs
  review first. Mesh quality on flat manga art is untested.

### 9.4 image-blaster (https://github.com/neilsonnn/image-blaster)

- A Claude Code project (skills, agents, hooks) plus a small Bun/React viewer. It turns one image into
  a World Labs Marble environment (Gaussian splat `.spz`), Hunyuan 3D object meshes via FAL, and
  ElevenLabs sound effects. Image edits use nano-banana or gpt-image-2. Nothing runs locally: it needs
  World Labs and FAL API keys, every call is paid, and the images leave the machine.
- Chinese dependency: Hunyuan 3D (Tencent), run on FAL's servers rather than here. `meshy-3d.mjs` is
  also present as an alternative provider.
- Hosts in code: api.fal.ai, queue.fal.run, fal.run, api.worldlabs.ai. No Chinese hosts.
- `.claude/settings.json` runs shell hooks on session start and on each prompt. `setup-check.sh` only
  reads `.env` and prints help; `input-check.sh` was not read. It also pre-allows
  `node .claude/scripts/**`. Read the hooks before opening the repo in Claude Code.
- Relevance: "single image to splat plus meshes" matches our v3 as a hosted alternative to a local
  orbit, and the viewer in `app/` is a candidate for ours. It does not help with the 12 GB question.

### 9.5 Takeaways

1. 12 GB is workable for H3 only with block streaming and a quantised file. First test: the stock
   native nodes with w6a8 and the nvfp4 encoder. FreeVideo shows what is achievable.
2. Test order: stock nodes + w6a8 + ORB360; then the 4-step turbo LoRA with ORB360; then FreeVideo as a
   custom node with official sources only.
3. For 3D from panels, Modly (local) and image-blaster (hosted) are the two reference designs. Neither
   is proven on comic linework.
4. Policy for all three: no launchers or extensions from unreviewed repos, no mirror sources, weights
   only from official Hugging Face repos, hashes checked.
