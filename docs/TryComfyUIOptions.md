# Options To Try for Video Generation

Status (2026-10-21, end of day): options 1 and 2 were run and evaluated on this machine; **option 2 (FastH3
Omni + ORB360 LoRA) is the chosen configuration**. Options 3 to 5 were not run because option 2 passed both
gates (section 0 says why). The Comic style bundle (`docs/comic_style_guide.md`) now uses option 2 in
production for a five-panel page. Sections 1 to 8 are the plan as written plus the results logged in the order
they happened; section 0 is the consolidated summary. Background and sources are in
`docs/ComfyUIBasedStoryGeneration.md` (section 9 holds the repo evaluation and the corrections to unsourced
claims).

## 0. Summary of the options evaluated and their results

All numbers were measured on this machine (RTX 5070 Ti Laptop, 12 GB VRAM, 68 GB RAM, ComfyUI 0.42.3, no
memory flags, localhost only), by driving the real ComfyUI UI in headless Chrome. Quality judgements are by eye
on contact sheets of frames 0, 41, 62, 82 and 123 (some clips also 20, 103, 113); there was no automatic
quality metric except frame 0 versus frame 123 PSNR. Same settings throughout unless stated: 124 frames at
24 fps (5.17 s), 8 steps, euler / simple, `BasicGuider`, VSA attention, shift 12 / 3, seed 20260926.

### 0.1 Options at a glance

| Option | What it is | Evaluated? | Result | Verdict |
|---|---|---|---|---|
| 1 | FastH3 Omni int8 ConvRot, shipped template, yellow-plane reference, 864x480 | Yes | Works with no flags: 141 s cold, 106 s warm, peak VRAM about 11.3 GB. Coherent multi-shot clip, subject kept across shots, audio present. | **Pass.** Proves the stack runs on 12 GB. |
| 1b | Option 1 graph with the orbit caption, no LoRA ("prompt-only orbit") | Yes, on 5 inputs | Photo (whitecat): full clean orbit, 188 s. Painted panel facing the camera (p3): turns but reads partly as a pan. Panel from behind (p4): turns to the front by frame 82, then stalls and never returns. | Usable only for subjects facing the camera. |
| 2 | Option 1 + ORB360 LoRA (`step1500`, model only, strength 1.0, before sampling and attention nodes) | Yes, on 5 comic panels, up to 5 seeds | Loads and runs on the int8 ConvRot Omni base. Healthy server: 201 to 246 s per clip (about 10 to 35% slower than no LoRA), peak VRAM about 11.1 to 11.3 GB. Loops close in every clip; true back views; p4's stall fixed. | **Pass on quality, pass on speed on a healthy server. Chosen.** |
| 3 | Kijai `ref2va_pruned_w4a8_mixed` (11.77 GB) + ORB360 | **No** | Files not downloaded, no 5060 workflow JSON supplied. | Not needed: option 2 already met the quality and speed gates. Revisit only if speed or VRAM must improve. |
| 4 | Comfy-Org `ref2va_pruned_w6a8` (15.98 GB) + ORB360 | **No** | Not downloaded. | Same. It was the planned quality reference; nothing is failing that it would be needed to explain. |
| 5 | MATLOWAI fused-turbo (21 GB, 4 steps) | **No** | Needs unreviewed custom node packs. | Fallback never needed. |
| FYI | FastH3 Omni NVFP4 QAD (13.77 GB), FreeVideo, WhatDreamsCost-ComfyUI | No (read only) | See section 9. WhatDreamsCost had a path-traversal exposure, since fixed in a fork. | Not used. |

The planned stop rule was followed: the options were run in order and later ones were skipped once an earlier
one passed. A skipped option is untested, not rejected: nothing here says w4a8 or w6a8 would be worse or better.

### 0.2 Every generation run

Time is the wall time of the queue-to-finish, taken from the browser script. "Healthy" means the clip ran at
the normal speed. The rows marked "degraded session" are the three LoRA clips of 630, 831 and 1,353 s: their
power state was not logged, and the slowdown is probably the laptop running on battery (section 0.4). The power
state was only measured later, for the p5 runs of 606 s (battery) and 200 s (AC); a further battery rerun on a
restarted server was cancelled after more than 9 minutes without a finished time, so it is not in the table.

| Run | Graph | Input | Size | Time | Peak VRAM (GB) | Outcome |
|---|---|---|---|---|---|---|
| Template, cold | 1 | yellow plane | 864x480 | 141 s | about 11.3 | success |
| Template, same graph and seed again | 1 | yellow plane | 864x480 | 5 s | - | **not a run: cache hit** |
| Template, new seed | 1 | yellow plane | 864x480 | 106 s | about 11.3 | success (the true warm speed) |
| Prompt-only orbit | 1b | whitecat | 832x832 | 188 s | 11.1 | full orbit, loop closes |
| Prompt-only orbit | 1b | p3 | 832x832 | 183 s | about 10 to 11 | partial turn, reads as a pan |
| Prompt-only orbit | 1b | p4 | 832x832 | invalid (about 3,680 s) | - | stalls at the front; the time includes about an hour of laptop sleep |
| LoRA | 2 | p4, seed 20260926 | 832x832 | 630 s | 11.0 | loop closes; **degraded session** |
| LoRA | 2 | p4, seed 777000111 | 832x832 | 831 s | 11.0 | loop closes; degraded session |
| LoRA | 2 | p3, seed 20260926 | 832x832 | 1,353 s | 10.9 | true 360; degraded session |
| LoRA, after a server restart | 2 | p3, seed 20260926 | 832x832 | 235 s | 11.1 | bit-identical to the 1,353 s clip |
| LoRA, three in a row | 2 | p3, seeds 101, 202, 303 | 832x832 | 246, 207, 207 s | 11.1 | all loops close; far side differs per seed |
| LoRA, other aspects | 2 | p5 (2:3), p2 (1:1), p1 (21:9) | 672x992, 832x832, 1248x544 | 213, 214, 220 s | about 11.3 | loops close; 21:9 works |
| LoRA, via the comic bundle scripts | 2 | p5, p1, p2, p3, p4 (own aspects, frame-inset references) | 672x992, 1248x544, 832x832, 832x832, 960x704 | 211, 211, 201 (retry), 206, 206 s | about 11 | all five loops close; p2 first try failed (below) |

Totals: 21 runs queued, plus the cache-hit re-queue. 20 produced a clip; one failed with a weight-loader error
(p2, first try) and one clip's timing is invalid because of laptop sleep (its frames were still reviewed).
Twelve LoRA runs ran on a healthy server (the rows from the 235 s restart test onward).

### 0.3 What the results say

1. **The model stack runs on 12 GB with no flags.** Peak VRAM stayed at 10 to 11.3 GB of 12.2 GB, with ComfyUI's
   dynamic VRAM offloading doing the work, and no out-of-memory error was produced by a healthy run.
2. **Speed on a healthy server is about 3.5 to 4 minutes per clip with the LoRA** (201 to 246 s over 12 runs),
   1.8 to 3 minutes without it (106 to 188 s over four valid runs, two of them at the smaller 864x480). The LoRA adds roughly 10 to 35% (207 s warm
   versus 183 s on the same panel and seed, 235 to 246 s including a cold load). The gate was a second run under
   about 10 minutes: passed.
3. **The ORB360 LoRA is compatible with the int8 ConvRot Omni base.** This was the largest risk in the plan
   (a LoRA trained on the BF16 Ref2VA base, applied to a distilled, rotated, int8 base). It loaded, changed the
   output in the intended way, and produced clean orbits. Compatibility was shown empirically; why it works was
   not investigated.
4. **The LoRA is what makes the orbit reliable.** Without it a subject seen from behind stalls halfway and
   drifts (p4), and a painted subject facing the camera only partly turns (p3). With it all five panels returned
   to the start view, and four of them (p2 to p5) showed a clear back view; p1's near-symmetric tower makes its
   turn hard to see.
5. **The loop closes by view, not exactly.** Frame 123 versus frame 0 PSNR: 18.3, 16.6, 15.1, 13.9 and 17.2 dB
   for p1 to p5. Expect a small jump at the wrap in the viewer.
6. **What the model cannot know, it invents, differently per seed.** For a subject shown from behind the front
   (face, clothes) and the far side of the scene are made up, and they changed between seeds and crops (a bearded
   man in some clips, a young woman in another; snow, a lake, grass or stairs appearing on the far side). It also
   produced one duplicated figure and one stray floating shape in some frames. A second reference view is the
   documented remedy (the LoRA card recommends three views) and is untested here.
7. **Aspect ratios other than square work.** 2:3, 4:3 and 21:9 all ran at the same speed and VRAM. The 21:9 clip
   turned least visibly because its subject, a near-symmetric tower, looks the same from every side.
8. **Same inputs give the same clip.** The restart test produced a bit-identical video (PSNR infinite), so
   seeds can be used to retry or reproduce a panel.

### 0.4 Problems found, and what is still unexplained

| Problem | Evidence | Status |
|---|---|---|
| **Slow clips: the laptop was on battery.** Three LoRA clips took 630, 831 and 1,353 s; later one p5 clip took 606 s and a rerun on a freshly restarted server was still going after 9 minutes | **Measured on battery:** `PowerOnline False`, GPU graphics clock **277 MHz of 3,090 MHz**, power draw 31 W, performance state P4, throttle reason "software power cap" active, temperature 57 C (no thermal throttling), CPU idle at 8%. **After plugging in, on the same server (not restarted):** two p5 runs of 200 s each, GPU clock median **1,605 MHz** (1,365 to 1,905) at about 79.5 W, 35 of 40 samples above 1,000 MHz. The clip made on battery is bit-identical to the clip made on AC (PSNR infinite): power changes the speed, not the output. | **Cause found for the p5 runs; probable for the earlier three.** The power state was not logged during the 630, 831 and 1,353 s runs, so those are only consistent with it (their 3 to 7 times slowdown matches 606 s versus 200 s), not proven. The restart test (235 s) and three-in-a-row (246, 207, 207 s) were not checked for power state either, and they were fast. Earlier guesses (state building up across runs, image or graph switching, the 38 GB committed memory) are not needed to explain what was seen. Rule: **run on AC power.** `scripts/comic_orbit_comfy.mjs` now warns when Windows reports battery, flags clips over 480 s, and flags results under 20 s as cache hits. |
| **Weight-loader failure** | p2 failed once with `RuntimeError: Fault failed: 2` in `comfy_aimdo.model_vbar.vbar_fault`, while the Qwen3-VL text encoder was casting weights | Transient: the next job ran and the retry of p2 alone succeeded (201 s). Likely GPU memory pressure at that moment; not confirmed. |
| **Cache hit mistaken for a run** | Re-queueing an unchanged graph returned in 5 s with the same output file | Documented. Change the seed for each timing run. |
| **Template defaults differ from the plan** | The template defaults to 1344x768; its reference `yellow_plane_ref.png` is not in the input folder | Resolution set through the Resolution Selector; the image was fetched from the official Comfy-Org template repo. |
| **Resolution Selector rounds** | 0.64 MP square gives 832x832, not 800x800; its step is 0.1 MP | Accepted. Sizes land near 0.64 MP at multiples of 32. |
| **Laptop sleep corrupts timings** | An hour-long gap in the VRAM log, and one invalid wall time | Later runs held the machine awake (Windows execution-state request) and checked the log for gaps. |
| **Seams at panel edges in the viewer** | A fixed 8 px inset left a sliver of the old page art next to the frame | Fixed in the comic scaffold by measuring the frame thickness; checked on rendered edges. |

### 0.5 Recommended configuration (what the Comic style bundle uses)

- Graph: the shipped `video_fasth3_ominiref_r2v` template with a model-only Load LoRA node
  (`minimax_h3_orb360_step1500`, strength 1.0) inserted after the diffusion model loader, before
  `ModelSamplingMiniMaxH3`, the attention backend and `BlockSparseAttention`. Everything else as shipped.
- Settings: 124 frames, 24 fps, 8 steps, about 0.64 MP at the nearest of 1:1, 2:3, 3:2, 3:4, 4:3, 9:16, 16:9
  or 21:9, the orbit caption from the LoRA card with the audio sections set to `N/A`, a fixed seed per clip.
- Operation: **laptop on AC power** (on battery the GPU is power-capped and clips take 3x longer or more),
  ComfyUI on localhost only (no `--listen`), no memory flags. One clip at a time. Time every clip; if one
  exceeds about 8 minutes check the power first, then restart ComfyUI. Retry a panel that fails with a
  weight-loader error. Hold the machine awake for long batches (sleep ruins timings).
- Inputs: a clean reference that contains no black frame or border pixels; one clear rigid subject facing the
  camera where possible; leave crowds, text-heavy and multi-actor panels static.
- Expected cost: about 3.5 to 4 minutes and about 11 GB of VRAM per clip.

### 0.6 What was not tested

Options 3, 4 and 5 and the NVFP4 QAD file; the LoRA at strengths other than 1.0, other LoRA checkpoints
(`cardspin`, `step50`), the 4-step turbo LoRA, and VSA off or other attention settings; lower resolutions
(for speed) or 1024x1024 (the card's other training size); multiple reference views for one subject; more than
one comic page; photoreal sources other than the whitecat example; the power state during the original slow
runs (never logged, so battery is probable, not proven); other power plans or the GPU's own limits on AC;
and the weight-loader failure's cause. The FastH3 and ORB360 weights fall under the MiniMax H3 Community License; read it before
commercial use of the generated clips.

## 1. Goal and success test

Generate a clean 360-degree orbit clip (ORB360 LoRA, Ref2VA) of one subject on this machine, fast enough
to be practical for many comic panels. Pick the option with the best speed that still passes the orbit
checklist in section 5.

Recommended first try: **FastH3 Omni with the shipped int8_convrot template (option 1)**. It is the
easiest to run, uses the 8-step distilled model, and needs no extra nodes. The ORB360 LoRA is added
(option 2) only when a quick Omni baseline shows it is needed, meaning the baseline runs at a usable
speed but a prompt-only orbit is not good enough.

## 2. Facts that shape the plan

Checked on this machine on 2026-10-21 (read-only):

- GPU RTX 5070 Ti Laptop (Blackwell), 12 GB VRAM (11.91 GB reported, about 1 GB used by the desktop).
  About 63 GB RAM. D: has 648 GB free.
- None of the model files in this plan fit entirely in VRAM, including the smallest. They rely on
  ComfyUI's dynamic VRAM offloading to RAM. Measured later: the speed is acceptable (about 3.5 minutes per
  clip, peak VRAM 10 to 11.3 GB of 12.2 GB, no out-of-memory error), see section 0.
- ComfyUI **v0.42.3** (git, no local changes) at `D:\ComfyUIEasyInstall\ComfyUI`, embedded Python 3.12.
  It was v0.40.0 when first checked on 2026-10-20 and was updated afterwards (not by this plan). The
  templates package is `comfyui_workflow_templates` 0.11.93 (json 0.1.119), frontend 1.55.18.
- **The FastH3 Omni workflow templates are installed**: `video_fasth3_ominiref_r2v.json` (used here),
  plus `video_fastvideo_fasth3_i2v.json` and `video_fastvideo_fasth3_t2v.json`. The ominiref template's
  widget values were re-read after the update and are unchanged. **No ComfyUI update is planned.**
- All nodes the template uses exist in this install: `MiniMaxH3ReferenceToVideo`,
  `MiniMaxH3SigmaShift` (shown as "ModelSamplingMiniMaxH3"), `ModelAttentionBackend`,
  `BlockSparseAttention` ("Model Sparse Attention"). Installed Python packages: sageattention,
  flash_attn, triton, comfy_kitchen, comfy_aimdo. Not installed: xformers.
- Model folders were empty when first checked. Option 1 files plus the ORB360 LoRA, `whitecat.png` and the
  caption prompts are now in place (41.9 GB, sha256 verified). Options 3 and 4 files are not downloaded.
- Extra custom nodes already in `custom_nodes/` (not reviewed by us): KJNodes (includes the experimental
  `MiniMaxH3MemoryEfficientSageAttentionPatch`), `ComfyUI-GGUF`, `comfyui-minimaxh3-contex-loop`, Wan
  wrappers, and `seedvr2_videoupscaler` (ByteDance). Do not use the unreviewed ones in these tests.

User-reported data point (not measured by us, workflow not seen): an RTX 5060 8 GB with 16 GB RAM ran
the **w4a8** MiniMax H3 at 480p, 10 s, 20 steps in about **5 minutes**. A 10 s clip is 243 frames on the
model's 17k+5 grid. ORB360's 124 frames at 800x800 is roughly the same pixels-times-frames
(about 79M vs 97M), so a similar time is plausible on this stronger machine. That is a rough estimate,
not a measurement.

Community testing of FastH3 Omni on ComfyUI so far is a few anecdotal reports (for example one RTX 5090
timing table). None is on a 12 GB card, and none uses ORB360.

## 3. The attention and model-sampling rules

These came from the template's own notes and the node source. They differ by model family, so the nodes
are not interchangeable between options.

| Item | FastH3 Omni (options 1 and 2) | Base H3 (options 3 and 4) |
|---|---|---|
| ModelSamplingMiniMaxH3 (video / audio shift) | **12 / 3** (template). Do not use the FastH3 V2 text-to-video shift of 10. | Start at the node default 12 / 3. Confirm against the base workflow you used on the 5060. |
| Model Sparse Attention (`BlockSparseAttention`) | **Required: method `vsa`, keep_percent 10.** FastH3 is trained with VSA. `sla` and `sol-attn` are not compatible, and plain block-sparse must never be used. Template: start 0, end 1, min_tokens 12288. | Leave **off** for the first run. |
| Model Attention Backend | `comfy kitchen attention` (int8 kernel). Used before `start_percent` and under `min_tokens`. | Same node, `comfy kitchen attention`, first. Then try sage (flash_attn is installed) one change at a time. |
| Sampler / scheduler | euler, `simple`, **8 steps**, denoise 1, `BasicGuider` (no CFG), `SamplerCustomAdvanced` | 20 steps (ORB360 card). Sampler and guider to match your 5060 workflow. |
| Frames | 124 = about 5 s at 24 fps. The template's Duration node snaps to the 17k+5 grid. | Same. |

Notes:
- The template says VSA helps mainly at large and long clips (about 2x at 1344x768, 362 frames) and
  gives little speed-up at short, small clips. Below `min_tokens` it falls back to the dense backend, so
  at 800x800 and 124 frames it may not trigger. Keep it on anyway to stay inside the trained recipe.
- Do not combine the global `--use-sage-attention` or `--use-flash-attention` flags with these node
  settings until the baseline works. Change one thing per run.
- KJNodes' `MiniMaxH3MemoryEfficientSageAttentionPatch` (experimental) lowers peak VRAM. Try it only
  for options 3 and 4, and only if a run hits OOM.

## 4. The options, in order

Run them in order. Stop an option at its gate and move on. Same seed, same input, same resolution,
same frame count within a comparison.

### Option 1: FastH3 Omni, template exactly as shipped (first to try)

Purpose: prove the machine runs H3-class video at all, and get a speed and quality baseline with no LoRA.

- Template: Workflow, Browse Templates, search "FastH3" (`video_fasth3_ominiref_r2v`).
- Files (all from Hugging Face):

  | File | Folder | Repo | Size |
  |---|---|---|---|
  | `fasth3_omniref_8step_pruned_int8_convrot.safetensors` | diffusion_models | FastVideo/FastH3-Omni-Comfy | 22.21 GB |
  | `qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` | text_encoders | Comfy-Org/MiniMax-H3 | 15.69 GB |
  | `minimax_h3_video_vae_int8_convrot.safetensors` | vae | Comfy-Org/MiniMax-H3 | 2.81 GB |
  | `minimax_h3_audio_vae_fp32.safetensors` | vae | Comfy-Org/MiniMax-H3 | 0.61 GB |

  Total about 41.3 GB. The template's own links name `FastVideo/FastH3-OmniRef-Comfy`, which did not
  resolve on the Hugging Face API. The collection lists `FastVideo/FastH3-Omni-Comfy` with the same file
  names, so use that one and re-check at download time. The FP8 file (23.05 GB) and the BF16 file
  (44.24 GB) exist but are not needed.
- Settings: as in section 3. Start at 832x480, 124 frames, the template's yellow-plane reference.
  Then run the same at 800x800 with `whitecat.png` as the reference.
- Prompt-only orbit attempt: after the template run, try the whitecat reference with the orbit caption
  text (`orbit_realscene_caption.txt`, audio sections `N/A`) and no LoRA. This shows how far Omni gets
  without ORB360, and decides whether option 2 is needed.
- Run: queue twice. The first run includes loading, the second is the real speed.
- Gate: it finishes without OOM, and the second run time is recorded. If it fails, try the flags in
  `ComfyUIBasedStoryGeneration.md` section 9.1 (`--reserve-vram`, `--async-offload`, `--cache-ram`)
  before dropping the option.

### Option 2: FastH3 Omni + ORB360 (only if the option 1 baseline shows it is needed)

- Start only when option 1 runs at a usable speed and the prompt-only orbit attempt does not give a
  clean 360-degree turn.
- Add `minimax_h3_orb360_step1500.safetensors` (0.60 GB, MATLOWAI/MiniMax-H3-ORB360-CardSpin, loras
  folder) with a model-only Load LoRA node at **strength 1.0**, placed before the sampling and attention
  nodes. Keep VSA on, shift 12 / 3 and 8 steps.
- Input: the repo's `examples/whitecat.png` as the reference, with the caption from
  `prompts/orbit_realscene_caption.txt`. Use `<Picture 1>` tagging as in the template prompt.
- Resolution and length: 800x800, 124 frames (the card's training and inference setting).
- Open risks, none of which is documented on any card: ORB360 was trained on the BF16 Ref2VA base, not on
  the distilled Omni student; the ConvRot int8 base may not line up with a BF16-trained LoRA; Omni's
  VSA recipe may not tolerate a camera LoRA. Treat a failure here as "not compatible", not as a bug.
- Gate: orbit checklist in section 5 passes.

### Option 3: Kijai w4a8 base + ORB360 (your fast configuration)

- Files: `minimax_h3_ref2va_pruned_w4a8_mixed.safetensors` (11.77 GB, Kijai/MiniMax-H3-experimental,
  experimental; the card says it needs ComfyUI 0.31.0 or newer, we have 0.40.0), the same text
  encoder and VAEs as option 1, and the ORB360 LoRA.
- Workflow: **please export the exact workflow JSON you used on the 5060**, so we copy its sampler,
  scheduler, guider, ModelSampling and attention settings instead of guessing. Use the Ref2VA file
  (not FL2VA) because ORB360 targets Ref2VA.
- Settings if no workflow is available: 20 steps, ORB360 strength 1.0, 800x800, 124 frames, shift
  12 / 3, no Model Sparse Attention, `comfy kitchen attention`.
- Gate: finishes in minutes, orbit checklist passes. The w4a8 file is the likeliest to be fast on
  12 GB, and the most likely to show quantization artifacts.

### Option 4: Comfy-Org w6a8 base + ORB360 (reference baseline)

- File: `minimax_h3_ref2va_pruned_w6a8.safetensors` (15.98 GB, Comfy-Org/MiniMax-H3). Same settings as
  option 3.
- Purpose: the quality reference against which the faster options are judged. Skip if option 3 already
  passes and is fast enough.

### Option 5: MATLOWAI fused-turbo (fallback only)

- One 21 GB file, 4 steps, reported 11.0 GiB peak on a 16 GB card. It does not mention ORB360, and needs
  the ComfyUI-MAINodes and SLA attention custom node packs. Review those packs before installing. Try
  only if options 2 and 3 both fail.

## 5. Common test protocol

Before each run: note the option, files and hashes, ComfyUI flags, resolution, frames, steps, seed.
After each run: save the output and the workflow JSON next to it.

| Record | How |
|---|---|
| First-run and second-run wall time | ComfyUI log, "Prompt executed in" |
| Peak VRAM and RAM | `nvidia-smi` sampled during the run, Task Manager for RAM |
| Orbit completes 360 degrees and returns near the start | Extract frames with ffmpeg, view frames 0, 31, 62, 93, 123 |
| Subject stays consistent (no morphing, tearing, drift) | Same frames, plus a contact sheet |
| Frozen camera or static noise | Compare first and last frame |
| Looks like the reference at the 90 / 180 / 270 degree views | Compare to `whitecat.png` |
| Usable for a comic panel (line art kept) | Repeat with one real comic panel after whitecat passes |

Pass: finishes, orbit completes, subject stable, and a second-run time under about 10 minutes.
Quality beats speed when they disagree.

### Results, option 1 (2026-10-21)

Run through the real ComfyUI UI in headless Chrome (Playwright), template as shipped, flags: none,
server on localhost only. `yellow_plane_ref.png` was fetched from the official Comfy-Org
`workflow_templates` repo (the template links it). The template's own 1344x768 default was replaced by
the Resolution Selector at 0.4 MP, which gave **864x480**, 124 frames, 8 steps, 24 fps, with audio.

| Run | Seed | Wall time | Note |
|---|---|---|---|
| 1 (cold: includes model loading) | 771204598 | 141 s | success |
| 2 (identical graph) | 771204598 | 5 s | **cache hit, not a real run** |
| 3 (warm) | 123456789 | **106 s** | success, the real second-run speed |

- Peak VRAM sampled with `nvidia-smi`: about 11.3 GB of 12.2 GB. No OOM, no flags needed. RAM not sampled.
- Quality: coherent multi-shot clip, plane identity kept across a close-up and a dive, synchronized audio.
  Contact sheet reviewed by eye only; no orbit was tested yet.
- Gate passed (finishes, under 10 minutes). The timing is for 864x480, not the 800x800 orbit setting.
- Pitfall: re-queueing an unchanged graph returns the cached result in seconds. Change the seed for each
  timing run.
### Results, prompt-only orbit, no LoRA (2026-10-21)

Template as in option 1 with three changes: reference `whitecat.png`, the prompt replaced by
`orbit_realscene_caption.txt` (audio `N/A`), seed 20260926, Resolution Selector 1:1 at 0.64 MP. The
selector rounds up, so the result was **832x832**, not 800x800. 124 frames, 8 steps, no ORB360, no flags.

- Wall time **188 s** (success). That was the first run with this reference, so it is not a clean warm
  figure. Peak VRAM about 11.1 GB. No OOM.
- Frames 0, 20, 41, 62, 82, 103, 113 and 123 reviewed by eye against `whitecat.png`: the camera goes front,
  side, a clear back view at frame 62, the other side, and returns to a front view at frame 123. The hat
  and the snowy mountain scene stay consistent and the cat stays rigid.
- Weaknesses seen: the first frame is not an exact copy of the reference (the cat is smaller and the crop
  is different), the last frame is close to but not identical to the first, and the falling snow is not
  perfectly frozen. Rotation direction and an even angular speed were not measured.
- One seed, one subject, judged by eye only. Not yet tested on a real comic panel (line art).
- Decision per section 4: the baseline orbit is already usable, so option 2 (ORB360) is **not needed for
  now**. Revisit it if panels show a worse orbit, a drifting subject or an inexact loop.
### Results, comic panels from the Desert Lighthouse artifact, no LoRA (2026-10-21)

Source: the published files of the reference artifact (`page.webp`, 1024x1536, and `manga.json` with the
panel rectangles; its five `videos/p*.mp4` were not downloaded). Two panels were cropped to squares and
upscaled to 832x832 with Lanczos (`lighthouse_p3.png`, `lighthouse_p4.png` in the ComfyUI input folder).
Same graph, caption, seed (20260926), 124 frames, 8 steps and no LoRA as the whitecat run.

| Panel | Wall time | Orbit | Verdict |
|---|---|---|---|
| p3, girl with a telescope on the balcony | 183 s | Rotates to a back view (frames 41 to 62) and returns near the start by frame 123. The painted line art, palette and outfit hold. | Usable. Weaknesses: the background behind the pillar is invented and grass appears at the bottom edge on the far side. |
| p4, character seen from behind at the tower door | not valid (see below) | Rotates to the front by about frame 82, then **stalls**: frames 103, 113 and 123 are almost identical, so it never returns to the door view. The face is invented (bearded man). The background drifts (snow and a lake appear that are not in the panel). | **Fails** the loop and consistency checks. |

- p4's logged wall time was 3,680 s, but the VRAM sampler logged nothing for about 58 minutes in the same
  window, so the laptop was almost certainly asleep. Ignore that number. p3's 183 s is consistent with the
  whitecat run. Peak VRAM was about 10 to 11 GB for both.
- Reading: a panel where the subject faces the camera orbits well without a LoRA. A panel that shows the
  subject's back, so the model must invent the front, does not complete the turn and drifts.
- Judged by eye on 8 frames each, one seed, no exact angle measurement.
### Results, option 2 (ORB360 LoRA) on panel p4 (2026-10-21)

Same graph, input, caption, seed (20260926) and 832x832, 124 frames, 8 steps as the p4 run above. Added a
model-only `LoraLoaderModelOnly` node (`minimax_h3_orb360_step1500.safetensors`, strength 1.0) between the
diffusion model loader and `ModelSamplingMiniMaxH3`, so it sits before the sampling and attention nodes.
VSA, shift 12 / 3 and the int8_convrot Omni base were unchanged.

- It loaded and ran: no error, no OOM, peak VRAM about 11.0 GB. The LoRA is not rejected by the Omni int8
  base, so the compatibility risk listed under option 2 did not show up as a failure.
- Wall time **630 s**, against 183 s for the no-LoRA p3 run. This is one run and it includes the first
  load of the LoRA, so it is an upper bound for a warm run, not a clean figure. It is at the edge of the
  10 minute pass line. A warm second run with a different seed is still needed.
- Orbit (8 frames, by eye): back view, side view, an invented front view at about frame 62, the other
  side, back to the side and then **back to the original door view by frame 123**. The loop closes and the
  stall seen without the LoRA is gone. The line art, outfit and backpack stay consistent.
- Remaining problems: the invented face is a bearded man (nothing in the panel defines it), and snow
  patches and a different horizon appear in the background on the far side (they are not in the panel).
  The background returns to the original by the last frame.
- Verdict: the LoRA is worth its cost for panels that show the subject from behind. For panels that face
  the camera (p3, whitecat) the no-LoRA run was already usable. (Written when the LoRA graph looked 3x
  slower; that came from a degraded server session. On a healthy server the LoRA costs about 10 to 35%
  more time, see the summary in section 0. The LoRA still gave the better orbit on p3.)
- Second seed, warm run (seed 777000111, same server so the models were already loaded, machine held awake
  with an execution-state request; the VRAM log had no gaps): **831 s**, success, peak VRAM about 11.0 GB.
  It was slower than the first LoRA run, so the 630 s was not inflated by loading. The LoRA graph costs
  roughly **10 to 14 minutes per clip**, about 3 to 4.5 times the no-LoRA graph (183 s, whitecat 188 s).
  Only two LoRA timings exist and they differ by 200 s, so treat this as a range. **Superseded:** these were
  timings from a degraded server session; later runs on a healthy server took 201 to 246 s (section 0).
- Second seed, orbit: the loop closes again (back view, side, an invented front at about frame 62, the other
  side, back to the door view by frame 123). The invented front is again a bearded man, and a lake and a
  different horizon appear on the far side, as in the first seed. So the stall fix is repeatable on this
  panel, and the invented far side is stable across seeds (it comes from the model, not from chance).
- Gate status for option 2: the orbit passes on p4 (two seeds), the speed gate (second run under about
  10 minutes) does **not**. Not yet explained. Likely suspects, unverified: the live LoRA forces a slower
  path on the int8 ConvRot weights, or the LoRA patch is rebuilt on every queue.
### Results, remaining panels at their own aspect ratios (2026-10-21)

FastH3 Omni int8 plus ORB360 LoRA 1.0, seed 20260926, 124 frames, 8 steps, caption from
`orbit_realscene_caption.txt`. The reference for each panel was cropped to the chosen aspect and upscaled with
Lanczos. Run on the same server right after the three-run test, back to back, with a hold-awake request.

| Panel | Aspect chosen | Output | Wall time | Orbit (frames 0, 31 or 41, 62, 82 or 93, 123) |
|---|---|---|---|---|
| p5 girl waving on the balcony | 2:3 | 672x992 | 213 s | Loop closes. Subject, scarf and railing stay consistent. |
| p2 character waving, lighthouse far away | 1:1 | 832x832 | 214 s | Loop closes. The invented front is again a bearded man. |
| p1 wide desert, lighthouse and a small walker | 21:9 (untested before) | 1248x544 | 220 s | Loop closes and the ruins and horizon rotate behind the tower, but the near-symmetric tower makes the turn hard to read, and a second walking figure appears at about frame 62 (a duplicate). |

- 21:9 worked at 0.64 MP with no error and about the same time and VRAM (peak about 11.3 GB for the batch).
- All five panels now have a clip (p3 and p4 were generated earlier from square crops of their rectangles).
- Border artifact: the panel rectangles from the page include the thin black frame, and the model reproduces
  the jagged frame edge inside the clip, which then turns with the scene. Next time, crop the reference a few
  pixels inside the border, and inset the viewer overlay the same amount.

### Results, all five panels regenerated through the Comic style bundle (2026-10-21)

`scripts/comic_new_comic.py` (detection, measured frame, references cropped inside the frame, aspect snapped)
then `scripts/comic_orbit_comfy.mjs` (upload, template, LoRA 1.0, queue, download). Seed 20260926, 124 frames,
8 steps, same server session as the earlier panel runs, no flags.

| Panel | Aspect | Output | Time | Notes |
|---|---|---|---|---|
| p5 | 2:3 | 672x992 | 211 s | first run of the new script, end to end |
| p1 | 21:9 | 1248x544 | 211 s | weak turn: the near-symmetric tower hardly seems to rotate |
| p2 | 1:1 | 832x832 | failed, then 201 s | see below; the invented front is now a young woman, the earlier clip had a bearded man |
| p3 | 1:1 | 832x832 | 206 s | |
| p4 | 4:3 | 960x704 | 206 s | invented front is a bearded man again, with a lake behind |

- **One failure:** p2's first attempt failed with `RuntimeError: Fault failed: 2` raised in
  `comfy_aimdo.model_vbar.vbar_fault` while the text encoder (Qwen3-VL 32B, `llama.py` MLP) was casting weights,
  i.e. the dynamic VRAM manager could not bring a weight onto the GPU. The server kept running and the next job
  succeeded; retrying p2 alone worked (201 s). Cause not confirmed; GPU memory pressure at that moment is the
  likely reason. Retry the panel, restart ComfyUI if it repeats.
- Loop closure, measured: PSNR between frame 0 and frame 123 is 18.3 (p1), 16.6 (p2), 15.1 (p3), 13.9 (p4)
  and 17.2 dB (p5). The two frames show the same view but are not identical, so the wrap-around in the viewer
  can show a small jump.
- Border seams: first attempt, a fixed 8 px inset left a sliver of the original page art between the frame
  and the overlay. The scaffold now measures the frame thickness (4 to 8 px) and places the overlay exactly
  inside it (plus 2 px), with the reference cropped 4 px further in. Checked by zooming into rendered edges:
  no seams or black strips, including p5's bottom edge, where dark art once inflated the measurement (now capped at 8 px).
- Full viewer interaction test (drag, reset, wrap, black and white, bubbles, auto-rotate, 390 px width)
  passes on the five-panel project bundle, 58.6 MB, no console errors.

### Results, option 2 (ORB360 LoRA) on panel p3 (2026-10-21)

Same graph and seed (20260926) as the no-LoRA p3 run (183 s), LoRA at 1.0.

- Orbit quality is **better with the LoRA**. Without it the girl stays turned toward the telescope's
  direction while the background changes (a partial turn that reads as a camera pan). With it the camera
  goes round the whole balcony: front, behind the pillar, a true view from behind her (frames 62 to 82, with
  her back, the rolled cloak and the pack visible), and back to the start view by frame 123. The loop closes
  and the outfit, line art and railing stay consistent.
- Weakness: green grass appears at the bottom edge on the far side, so the invented ground does not match a
  balcony high above the desert. Not fixed by the LoRA.
- **Wall time 1,353 s** (22.5 minutes). All three LoRA runs on the same server session, in order:
  630 s, 831 s, 1,353 s. The no-LoRA runs were 141 s (cold), 106 s, 188 s and 183 s, with no such trend.
  So the LoRA graph is not just slower, it got slower with each run. After this run the ComfyUI python
  process had a private (committed) memory of about 38 GB with a 4.8 GB working set, and 23 GB of RAM free
  out of 68 GB, which points at memory or offload pressure building up across queued runs. Not proven.
- Test to run next: restart the server, then run the LoRA graph once from fresh. If it is fast again
  (a few minutes) the LoRA is fine and the server needs a restart between LoRA runs or memory flags
  (`--cache-ram`, `--reserve-vram`). If it is still 10 minutes or more, the LoRA path itself is slow on this
  base, and the options are the smaller base (option 3, needs the exact 5060 workflow JSON) or folding the
  LoRA into the base weights.
- **Restart test result (done):** the ComfyUI server was stopped and started again (same command, no flags),
  and the identical p3 LoRA graph and seed ran in **235 s**, including cold loading of every model and the
  LoRA. The earlier run on the long-running server took 1,353 s. Peak VRAM about 11.1 GB. The output video
  is **bit-identical** to the slow run (ffmpeg PSNR average: inf), so only the speed differs, not the result.
- First conclusion (**partly superseded by the three-run test below**): the LoRA graph is fine at about 4
  minutes per clip on a fresh server, and the 630, 831 and 1,353 s runs were a server-state problem. The
  guess that state "builds up over successive runs" did not survive the next test.
- **Three runs in a row on a clean server (p3 + LoRA, seeds 101, 202, 303, one image, 124 frames, 832x832):**
  246 s, 207 s, 207 s. No slowdown. Peak VRAM about 11.1 GB. The machine was held awake and the VRAM log had
  no gaps. So the 630, 831 and 1,353 s runs are **not reproduced by simply repeating the LoRA graph**, and
  the earlier explanation "it slows with every queued run" is wrong or incomplete.
- What differed in the slow session (not tested individually): the server had earlier run the no-LoRA graph
  on three different reference images, then the LoRA graph on p4 (twice) and p3, so the reference image and
  the graph changed between runs; and the machine had been asleep for about an hour in the middle of that
  session, before the slow runs. Any of these could be the trigger. The 38 GB committed memory seen after the
  slow session is a symptom, not a cause.
- Practical rule for now: for a batch of clips with the same graph, the speed holds at about 3.5 to 4 minutes
  per clip. Check the wall time of each clip, and restart the server if one goes past about 8 minutes.
- Orbit across the three seeds (frames 0, 41, 62, 82, 123): the loop closes every time, the start and end
  views match, and the girl turns to a true back view. The invented far side differs between seeds (stairs,
  platform, floor, grass; one seed has a stray floating shape at the top of frame 62), so the far side is not
  reliable. Treat it as unspecified unless a second reference view is supplied.
- Quality verdict so far: LoRA beats no-LoRA on both panels (p3 gets a true 360, p4 closes the loop), so the
  speed problem is worth solving rather than dropping the LoRA.
- **Update, later the same evening: the cause is most likely battery power, see section 0.4.** The guesses
  above about what differed in the slow session (image and graph switching, accumulated state) are superseded.
  While the laptop was on battery the GPU ran at 277 MHz and 31 W and a clip took over 10 minutes; plugged in,
  the same server did the same clip in 200 s at about 1,600 MHz and 80 W, with a bit-identical result.

## 6. Download manifest and order

Sizes from the Hugging Face tree listings, 2026-10-20 and 2026-10-21. All from official Hugging Face
repos, hash-checked against the repo's LFS sha256 after download, into
`D:\ComfyUIEasyInstall\ComfyUI\models\`.

| Needed by | File | Size |
|---|---|---|
| 1 | FastH3 int8_convrot diffusion | 22.21 GB |
| 1 to 4 | nvfp4 text encoder, int8 video VAE, audio VAE | 15.69 + 2.81 + 0.61 GB |
| 1 (prompt-only orbit), 2 to 4 | `whitecat.png`, caption prompts | negligible |
| 2 to 4 | ORB360 step1500 LoRA | 0.60 GB |
| 3 | Kijai Ref2VA w4a8_mixed | 11.77 GB |
| 4 | Comfy-Org Ref2VA pruned w6a8 | 15.98 GB |

Step 1: download only what option 1 needs (about 41.3 GB) plus the `whitecat.png` and caption files. The
ORB360 LoRA (0.60 GB) is small enough to fetch at the same time, but not required until option 2.
Options 3 and 4 are added only if needed. Everything for options 1 to 4 is about 70 GB. No download
starts without an explicit go-ahead.

### Downloaded on 2026-10-21

Downloaded by `scripts/download_comfy_models.py` from official Hugging Face repos (`huggingface.co`).
ComfyUI root: `D:\ComfyUIEasyInstall\ComfyUI`. Every LFS file was checked against the repo's sha256
after download. The script is safe to rerun: verified files are skipped, interrupted ones resume.

| Local path (under the ComfyUI root) | Source repo and file | Size (bytes) | sha256 |
|---|---|---|---|
| `models\diffusion_models\fasth3_omniref_8step_pruned_int8_convrot.safetensors` | FastVideo/FastH3-Omni-Comfy, `diffusion_models/` | 22,213,723,064 | `851b2dc9670ed864b7f1e951ac9da047d83b1c04ded9bfcc1a9e5bba0ee33f80` |
| `models\text_encoders\qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors` | Comfy-Org/MiniMax-H3, `text_encoders/` | 15,687,142,551 | `35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6` |
| `models\vae\minimax_h3_video_vae_int8_convrot.safetensors` | Comfy-Org/MiniMax-H3, `vae/` | 2,811,065,184 | `52a2c8c73583c86e4f41cdcce3a6ad0ea562987bc0bf3d60a0cef5f5c8e60c0e` |
| `models\vae\minimax_h3_audio_vae_fp32.safetensors` | Comfy-Org/MiniMax-H3, `vae/` | 605,254,808 | `8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48` |
| `models\loras\minimax_h3_orb360_step1500.safetensors` | MATLOWAI/MiniMax-H3-ORB360-CardSpin | 596,450,168 | `e9275b2f456f6bd004c9cb3cf5c636cad87217c5bc96e6a5b5533e917de121da` |
| `input\whitecat.png` | MATLOWAI/MiniMax-H3-ORB360-CardSpin, `examples/` | 1,188,797 | `fe193a7b268dc5b15681d5237a696e1e77055428aec089e761d0acad9c58d2d2` |
| `input\orb360_prompts\orbit_realscene_caption.txt` | same repo, `prompts/` | 3,344 | size only (not LFS) |
| `input\orb360_prompts\orbit_3ref_caption.txt` | same repo, `prompts/` | 3,234 | size only (not LFS) |
| `input\orb360_prompts\cardspin_caption.txt` | same repo, `prompts/` | 2,419 | size only (not LFS) |

Total about 41.9 GB, all on D:. Not downloaded yet: the options 3 and 4 base models (Kijai w4a8, Comfy-Org
w6a8). The Hugging Face repo revision was `main` at download time, not a pinned commit.

## 7. Policy and caveats

- Official Hugging Face sources only. No hf-mirror, ModelScope, Quark or other mirrors.
- The Qwen3-VL text encoder (Alibaba) is part of the H3 stack and cannot be avoided. Do not use the
  installed SeedVR2 (ByteDance) or Real-ESRGAN-type upscalers. Keep the latent upscaler out for now.
- All H3 weights fall under the MiniMax H3 Community License. Read it before commercial use.
- Third-party speed claims (including the 5.6 to 11.9x blog figure on 8 GB200 GPUs and the RTX 5090
  table) say nothing about this machine. Only our own timings count.

## 8. Before starting (status)

1. Download go-ahead for the option 1 files: given, files downloaded and verified (section 6).
2. The exact workflow JSON from the 5060 is needed only for option 3. Not supplied, and not needed so far,
   because option 2 passed (section 0).
3. ComfyUI restarts: done several times by the assistant on a localhost-only server, with no flags.

## 9. FYI only (not part of the plan)

Considered and set aside. Do not run these unless the plan changes.

### FastH3 Omni NVFP4 QAD (13.77 GB)

- The Blackwell-native NVFP4 diffusion file, `fasth3_omniref_qad_nvfp4_comfy.safetensors`, repo
  FastVideo/FastH3-Omni-NVFP4-QAD-Comfy. Same node requirements as option 1, 8 steps, guidance 1.0,
  video shift 12 / audio shift 3.
- Removed because option 1 is the recommended first run. It would not fit in 11.9 GB either, so it would
  also rely on offloading, and the card warns "Quantized output can differ from BF16". Revisit only if
  option 1 is too slow or too large for the machine.

### WhatDreamsCost-ComfyUI (https://github.com/WhatDreamsCost/WhatDreamsCost-ComfyUI), evaluated 2026-10-21

- What it is: custom nodes for **LTX** video (Lightricks), mainly "LTX Director 2.0", a timeline editor
  with keyframes, prompt relay, IC-LoRA and audio tracks, plus small loader nodes. GPL licence. v2.0.5.
  Its README says it was mainly written with Gemini.
- Relevance: none for this plan. It has zero MiniMax H3 code or workflows, only LTX and Wan patches. It
  does not help with an ORB360 orbit or a 12 GB fit.
- Already installed in `custom_nodes/` (v2.0.5, source identical to upstream apart from line endings
  and a few example workflows; it has no `.git` of its own).
- Chinese dependencies: none found. No Python network calls, no hosts other than its own GitHub link in
  the UI, no extra packages.
- **Security finding:** it registers HTTP routes on the ComfyUI server. `/video_ui_custom_view?filename=`
  serves **any file on the machine** by absolute path, and the chunk-upload routes join a client-supplied
  filename onto the input folder without sanitising it (path traversal). That is only exposed to
  whoever can reach the ComfyUI port, which is localhost by default. Keep ComfyUI off `--listen` and
  off public tunnels while it is installed. Disabling it (renaming the folder, which needs your say-so)
  would also remove the exposure and a little startup time.
- Fix applied 2026-10-21: the folder was renamed to `custom_nodes\WhatDreamsCost-ComfyUI.disabled`.
  ComfyUI skips folders ending in `.disabled` (`nodes.py`, line 2379), so the routes are no longer
  registered at the next server start. To undo, rename it back. At the time, no server was listening on
  port 8188 and none of the launcher scripts passed `--listen`.
- Follow-up 2026-10-21: the fixed fork `guideaxon/WhatDreamsCost-ComfyUI` (commits `128e81d` and
  `3797d16`: same-origin and DNS-rebinding checks, confined workflow paths, atomic uploads) was cloned
  into `custom_nodes\WhatDreamsCost-ComfyUI`. The upstream copy stays as
  `WhatDreamsCost-ComfyUI.disabled` and can be deleted. The fork's source compiles; it has not been
  loaded in a running server yet. Keep ComfyUI off `--listen`. `WDC_ALLOWED_HOSTS` lists extra
  hostnames if a reverse proxy is ever used.
- Verdict: FYI only. Not used by the plan; the node is active again, now from the fork.

### Custom node forks in use (2026-10-21)

Security-fixed forks under `github.com/guideaxon`, working copies in `D:\GAXON`. In
`D:\ComfyUIEasyInstall\ComfyUI\custom_nodes`, `origin` points at the fork and the original repo is the
`upstream` remote, so ComfyUI-Manager's `update all` (used by `Update ComfyUI and Nodes.bat`) pulls the
fork, not upstream.

| Installed folder | Fork | Fix commit | Upstream |
|---|---|---|---|
| `WhatDreamsCost-ComfyUI` | ComfyUI WhatDreamsCost fork | `3797d16` (and `128e81d`) | WhatDreamsCost/WhatDreamsCost-ComfyUI |
| `ComfyUI-WanVideoWrapper` | ComfyUI-WanVideoWrapper | `afc6a64` | kijai/ComfyUI-WanVideoWrapper |
| `seedvr2_videoupscaler` | ComfyUI-SeedVR2_VideoUpscaler | `0e058c8` | numz/ComfyUI-SeedVR2_VideoUpscaler |
| `qwen3-tts-comfyui` | ComfyUI-Qwen-TTS | `891bd47` | flybirdxx/ComfyUI-Qwen-TTS |

- No fix changed `requirements.txt` or `pyproject.toml`, so pip dependencies are unchanged.
- To take upstream changes later: `git fetch upstream`, merge into the fork's `main`, test, push, then
  update. `Git-Repo\ComfyUI-Easy-Install.bat` still clones the upstream URLs for a fresh install.
- The older local edit that was in the installed Qwen-TTS `nodes.py` was discarded in favour of the
  fork's fuller fix. A copy of it was kept only in that session's scratchpad, which is temporary and is not
  part of the repo, so it is no longer available.
- Verified after the swap: each folder's HEAD equals the fork's HEAD, no tracked file is modified, and the
  changed files compile. Not yet loaded in a running server.

### FreeVideo (https://github.com/FlashML-org/FreeVideo)

- Block-streaming H3 runner for 8 to 16 GB cards, as a ComfyUI custom node and a Qt launcher. Code is
  Apache-2.0, weights fall under the MiniMax H3 Community License.
- Removed because it carries Chinese-mirror and proxy options (ModelScope, hf-mirror.com, ghfast.top,
  Tsinghua and NJU mirrors), installs `modelscope-hub` in its runtime, and in `auto` mode could pick a
  mirror by measured speed. If ever tried: a throwaway ComfyUI copy, `official` as the download source,
  weights downloaded by us, no launcher. Details are in `ComfyUIBasedStoryGeneration.md` section 9.2.
  Its memory-streaming code is still useful as a reference.
