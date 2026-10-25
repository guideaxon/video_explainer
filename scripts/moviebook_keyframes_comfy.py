"""Generate the Qwen-Image keyframe of each MovieBook shot in a local ComfyUI.

Usage:
    python scripts/moviebook_keyframes_comfy.py <project> [--only dawn,arrival] [--force] [--seed-offset N]
        [--server URL] [--timeout S] [--workflow FILE] [--projects-dir DIR]

Reads ``projects/<project>/moviebook/plan.json``. For each shot it builds ``framing + cast identities + visual +
style line`` (the identity text of every character in the shot is copied verbatim, which is what keeps a face and
outfit stable from keyframe to keyframe), queues a Qwen-Image graph through the ComfyUI HTTP API (UNETLoader,
CLIPLoader type qwen_image, VAELoader, ModelSamplingAuraFlow, two CLIP encodes, KSampler, VAEDecode, SaveImage) and
saves ``moviebook/keyframes/<id>.png``. The keyframe is the first frame (reference picture) of the shot's H3 clip.
An existing keyframe is skipped unless ``--force``; ``--seed-offset`` rerolls. ``--workflow FILE`` replaces the
built-in graph with your own API-format JSON (placeholders ``{{prompt}}``, ``{{negative}}``, ``{{seed}}``,
``{{width}}``, ``{{height}}``, ``{{prefix}}`` in string values; numbers by exact match of the string, e.g. ``"{{seed}}"``),
for when your Qwen-Image 2.1 files need other nodes. Local only: no paid host is called. Plug the laptop in.
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
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from moviebook_build_scenes import shot_id, validate  # noqa: E402
from storybook_stills_comfy import call  # noqa: E402


def build_prompt(plan: dict, shot: dict) -> str:
    """Positive prompt: framing and action first, then each cast identity verbatim, then the style line."""
    parts = [shot.get("keyframe_prompt") or shot["visual"]]
    for key in shot.get("cast", []):
        c = plan["cast"][key]
        parts.append(f"{c['name']} is {c['identity']}")
    parts.append(plan["style_line"])
    return ". ".join(p.strip().rstrip(".") for p in parts if p) + "."


def graph(plan: dict, positive: str, seed: int, prefix: str) -> dict:
    k = plan["keyframes"]
    w, h = k.get("size") or plan["size"]
    return {
        "1": {"class_type": "UNETLoader", "inputs": {"unet_name": k["unet"], "weight_dtype": k.get("weight_dtype", "default")}},
        "2": {"class_type": "CLIPLoader", "inputs": {"clip_name": k["clip"], "type": "qwen_image", "device": "default"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": k["vae"]}},
        "4": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": k.get("shift", 3.1)}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"text": positive, "clip": ["2", 0]}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"text": plan.get("negative", ""), "clip": ["2", 0]}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": w, "height": h, "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0],
              "seed": seed, "steps": k.get("steps", 20), "cfg": k.get("cfg", 2.5), "sampler_name": "euler", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }


def fill_workflow(template: dict, values: dict) -> dict:
    """Substitute {{name}} placeholders in a user workflow. A string that is exactly one placeholder keeps the value's type."""
    def sub(v):
        if isinstance(v, str):
            m = re.fullmatch(r"\{\{(\w+)\}\}", v)
            if m and m.group(1) in values:
                return values[m.group(1)]
            return re.sub(r"\{\{(\w+)\}\}", lambda mm: str(values.get(mm.group(1), mm.group(0))), v)
        if isinstance(v, dict):
            return {a: sub(b) for a, b in v.items()}
        if isinstance(v, list):
            return [sub(x) for x in v]
        return v
    return sub(template)


def render_one(server: str, prompt: dict, out: Path, timeout: int, label: str) -> int:
    t0 = time.time()
    pid = call(server, "/prompt", {"prompt": prompt})["prompt_id"]
    hist = None
    while time.time() - t0 < timeout:
        hist = call(server, f"/history/{pid}").get(pid)
        if hist and hist.get("status", {}).get("completed") is not None:
            break
        hist = None
        time.sleep(2)
    if hist is None:
        print(f"{label}: TIMEOUT after {timeout}s (is ComfyUI still running?)")
        return 1
    images = [i for node in hist["outputs"].values() for i in node.get("images", [])]
    if hist["status"].get("status_str") == "error" or not images:
        print(f"{label}: FAILED")
        return 1
    i = images[0]
    qs = f"filename={i['filename']}&subfolder={i['subfolder']}&type={i['type']}"
    with urllib.request.urlopen(f"{server}/view?{qs}", timeout=60) as r:
        out.write_bytes(r.read())
    print(f"{label}: {out.name} ({time.time() - t0:.0f}s)", flush=True)
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("project")
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--server", default="http://127.0.0.1:8188")
    ap.add_argument("--seed-offset", type=int, default=0)
    ap.add_argument("--timeout", type=int, default=900)
    ap.add_argument("--workflow", help="API-format workflow JSON with {{placeholders}} instead of the built-in graph")
    ap.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = ap.parse_args()

    mb = Path(args.projects_dir) / args.project / "moviebook"
    plan = json.loads((mb / "plan.json").read_text(encoding="utf-8"))
    errors = validate(plan)
    if errors:
        print("Plan errors:\n  " + "\n  ".join(errors), file=sys.stderr)
        return 1
    template = json.loads(Path(args.workflow).read_text(encoding="utf-8")) if args.workflow else None
    out_dir = mb / "keyframes"
    out_dir.mkdir(parents=True, exist_ok=True)
    only = set(args.only.split(",")) if args.only else None
    try:
        call(args.server, "/system_stats")
    except (urllib.error.URLError, OSError) as e:
        print(f"ComfyUI is not reachable at {args.server}: {e}", file=sys.stderr)
        return 1

    failed = 0
    for shot in plan["shots"]:
        sid = shot_id(shot)
        if only and sid not in only:
            continue
        out = out_dir / f"{sid}.png"
        if out.exists() and not args.force:
            continue
        seed = shot.get("seed", 1000) + args.seed_offset
        positive = build_prompt(plan, shot)
        prefix = f"moviebook_{args.project}_{sid}_{uuid.uuid4().hex[:6]}"
        w, h = plan["keyframes"].get("size") or plan["size"]
        prompt = fill_workflow(template, {"prompt": positive, "negative": plan.get("negative", ""), "seed": seed, "width": w, "height": h, "prefix": prefix}) if template else graph(plan, positive, seed, prefix)
        failed += render_one(args.server, prompt, out, args.timeout, sid)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
