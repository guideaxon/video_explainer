"""Generate the painted stills of a Storybook video in a local ComfyUI (text to image, then a hires pass).

Usage:
    python scripts/storybook_stills_comfy.py <project> [--only idea,script] [--force] [--server URL]
        [--seed-offset N] [--projects-dir DIR]

Reads ``projects/<project>/art/style.json`` (see ``storybook_new_video.py``). For each shot it builds
``style_line + cast + shot prompt``, queues a ComfyUI graph through the HTTP API (checkpoint, two CLIP encodes,
KSampler at the base size, latent upscale, second KSampler at denoise 0.45, VAE decode, SaveImage) and saves
``art/<id>.png``. An existing still is skipped unless ``--force``; use ``--seed-offset`` to reroll. Local only:
no paid host is called. Plug the laptop in and keep it awake; ComfyUI must run on 127.0.0.1:8188.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def call(server: str, path: str, data: dict | None = None) -> dict:
    req = urllib.request.Request(server + path, data=None if data is None else json.dumps(data).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def build_prompt(style: dict, shot: dict) -> str:
    """Positive prompt of a shot.

    With a ``canon`` block in style.json and a shot flagged ``cast``: framing first, the identity text (the long
    form for close and medium shots, the short form for wide ones, copied verbatim), the wardrobe of the shot's
    ``look``, the action, the style line, and "no text" last. Without a canon: the older style + prompt + cast lines.
    """
    canon = style.get("canon")
    if canon and shot.get("cast"):
        identity = canon["identity_short"] if shot.get("size") == "wide" else canon["identity_full"]
        wardrobe = canon["wardrobe"][shot.get("look", "default")]
        return ", ".join([shot.get("framing", "medium shot"), identity, wardrobe, shot["prompt"], style["style_line"], canon.get("tail", "no text, no letters, no logos")])
    return ", ".join([style["style_line"], shot["prompt"], *(style.get("cast", []) if shot.get("cast") else [])])


def graph(style: dict, full: str, seed: int, prefix: str) -> dict:
    w, h = style["size"]
    up = style.get("upscale", 1.667)
    negative = style["negative"] + ("".join(", " + n for n in style["canon"].get("never", [])) if style.get("canon") else "")
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": style["model"]}},
        "2": {"class_type": "CLIPTextEncode", "inputs": {"text": full, "clip": ["1", 1]}},
        "3": {"class_type": "CLIPTextEncode", "inputs": {"text": negative, "clip": ["1", 1]}},
        "4": {"class_type": "EmptyLatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "5": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["4", 0],
              "seed": seed, "steps": style["steps"], "cfg": style["cfg"], "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 1.0}},
        "6": {"class_type": "LatentUpscaleBy", "inputs": {"samples": ["5", 0], "upscale_method": "bislerp", "scale_by": up}},
        "7": {"class_type": "KSampler", "inputs": {"model": ["1", 0], "positive": ["2", 0], "negative": ["3", 0], "latent_image": ["6", 0],
              "seed": seed, "steps": style["steps"], "cfg": style["cfg"], "sampler_name": "dpmpp_2m", "scheduler": "karras", "denoise": 0.45}},
        "8": {"class_type": "VAEDecode", "inputs": {"samples": ["7", 0], "vae": ["1", 2]}},
        "9": {"class_type": "SaveImage", "inputs": {"images": ["8", 0], "filename_prefix": prefix}},
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("project")
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--seed-offset", type=int, default=0)
    ap.add_argument("--style-file", help="art plan to use instead of art/style.json (for A/B tests)")
    ap.add_argument("--variants", type=int, default=0, help="make N candidates per shot into --out-dir as <id>_v<k>.png")
    ap.add_argument("--out-dir", help="folder for the stills (default art/)")
    ap.add_argument("--timeout", type=int, default=900, help="seconds to wait for one still before giving up")
    ap.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = ap.parse_args()

    art = Path(args.projects_dir) / args.project / "art"
    style = json.loads(Path(args.style_file or art / "style.json").read_text(encoding="utf-8"))
    out_dir = Path(args.out_dir) if args.out_dir else art
    out_dir.mkdir(parents=True, exist_ok=True)
    only = set(args.only.split(",")) if args.only else None
    try:
        call(args.server, "/system_stats")
    except (urllib.error.URLError, OSError) as e:
        print(f"ComfyUI is not reachable at {args.server}: {e}", file=sys.stderr)
        return 1

    failed = 0
    for shot in style["shots"]:
        sid = shot["id"]
        if not re.fullmatch(r"[A-Za-z0-9_-]{1,32}", sid):
            print(f"{sid!r}: shot ids may use letters, digits, - and _ only")
            failed += 1
            continue
        if only and sid not in only:
            continue
        for k in range(args.variants or 1):
            if args.variants:
                out = out_dir / f"{sid}_v{k + 1}.png"
            else:
                out = out_dir / f"{sid}.png"
            if out.exists() and not args.force:
                continue
            failed += render_one(args, style, shot, out, args.seed_offset + k * 101)
    return 1 if failed else 0


def render_one(args, style: dict, shot: dict, out: Path, offset: int) -> int:
    """Queue one still, wait for it and save it to ``out``. Returns 1 on failure."""
    sid = shot["id"]
    failed = 0
    t0 = time.time()
    prefix = f"storybook_{args.project}_{sid}_{uuid.uuid4().hex[:6]}"
    pid = call(args.server, "/prompt", {"prompt": graph(style, build_prompt(style, shot), shot.get("seed", 1000) + offset, prefix)})["prompt_id"]
    hist = None
    while time.time() - t0 < args.timeout:
        hist = call(args.server, f"/history/{pid}").get(pid)
        if hist and hist.get("status", {}).get("completed") is not None:
            break
        hist = None
        time.sleep(2)
    if hist is None:
        print(f"{sid}: TIMEOUT after {args.timeout}s (is ComfyUI still running?)")
        return 1
    images = [i for node in hist["outputs"].values() for i in node.get("images", [])]
    if hist["status"].get("status_str") == "error" or not images:
        print(f"{sid}: FAILED")
        return 1
    i = images[0]
    qs = f"filename={i['filename']}&subfolder={i['subfolder']}&type={i['type']}"
    with urllib.request.urlopen(f"{args.server}/view?{qs}", timeout=60) as r:
        out.write_bytes(r.read())
    print(f"{sid}: {out.name} ({time.time() - t0:.0f}s)", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
