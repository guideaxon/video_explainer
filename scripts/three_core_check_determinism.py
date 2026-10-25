"""Determinism check for three.js video projects (three-core, docs/scene3d_design.md section 9).

Usage:
    python scripts/three_core_check_determinism.py <project> [--frames 0,45,90] [--runs 3] [--gl angle] [--scale 1]
        [--against-video projects/<p>/output/final.mp4]

Renders the given frames of the project's storyboard as PNG, ``--runs`` times, each run in a fresh browser, then
compares every pair of runs per frame:

- Tier 1: all runs byte-identical.
- Tier 2: max per-pixel channel difference <= 2 levels and mean absolute difference < 0.05 levels.
- Beyond Tier 2: fail (exit 1).

``--against-video`` also extracts the same frames from an existing render and reports PSNR against it (a regression
check, for example after a three.js upgrade; lossy video, so this is reported, not tiered).
Writes ``projects/<p>/qc/determinism.json`` and keeps the PNGs in ``projects/<p>/qc/determinism/``. Needs node, ffmpeg
(only for ``--against-video``) and Pillow.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
import subprocess
import sys
from itertools import combinations
from pathlib import Path

from PIL import Image, ImageChops, ImageStat

REPO_ROOT = Path(__file__).resolve().parent.parent
TIER2_MAX = 2
TIER2_MEAN = 0.05


def diff_stats(a: Path, b: Path) -> tuple[int, float]:
    """Max and mean absolute per-channel difference (0..255) between two images of the same size."""
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    if ia.size != ib.size:
        return 255, 255.0
    d = ImageChops.difference(ia, ib)
    return max(hi for _, hi in d.getextrema()), sum(ImageStat.Stat(d).mean) / 3


def psnr(a: Path, b: Path) -> float:
    ia, ib = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    if ia.size != ib.size:
        return 0.0
    mse = sum(v * v for v in ImageStat.Stat(ImageChops.difference(ia, ib)).rms) / 3
    return math.inf if mse == 0 else 10 * math.log10(255 * 255 / mse)


def delivery_gl(project: str) -> str:
    """The GL backend this project's bundle renders with (render.mjs reads the same table)."""
    try:
        bundle = json.loads((REPO_ROOT / "projects" / project / "config.json").read_text(encoding="utf-8")).get("style_bundle")
        table = json.loads((REPO_ROOT / "remotion" / "scripts" / "delivery_gl.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return "auto"
    return table.get(bundle) or "auto"


def tier(max_diff: int, mean_diff: float, identical: bool) -> int:
    if identical:
        return 1
    return 2 if max_diff <= TIER2_MAX and mean_diff < TIER2_MEAN else 3


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("project")
    ap.add_argument("--frames", default="0")
    ap.add_argument("--runs", type=int, default=3)
    ap.add_argument("--gl", default=None, help="GL backend; default: the bundle's delivery backend (remotion/scripts/delivery_gl.json)")
    ap.add_argument("--scale", default="1")
    ap.add_argument("--against-video")
    args = ap.parse_args(argv)
    if args.runs < 2:
        print("--runs must be at least 2", file=sys.stderr)
        return 2
    node = shutil.which("node")
    if not node:
        print("node not found. Install Node 22.", file=sys.stderr)
        return 1
    if args.against_video:
        missing = [b for b in ("ffmpeg", "ffprobe") if not shutil.which(b)]
        if missing:
            print(f"{' and '.join(missing)} not found; --against-video needs ffmpeg on PATH (winget: Gyan.FFmpeg).", file=sys.stderr)
            return 1
        if not Path(args.against_video).is_file():
            print(f"{args.against_video} not found", file=sys.stderr)
            return 1
    if args.gl is None:
        args.gl = delivery_gl(args.project)
    qc = REPO_ROOT / "projects" / args.project / "qc"
    out = qc / "determinism"
    if out.exists():
        shutil.rmtree(out)
    cmd = [node, str(REPO_ROOT / "scripts" / "three_core_render_stills.mjs"), args.project, str(out),
           "--frames", args.frames, "--runs", str(args.runs), "--gl", args.gl, "--scale", args.scale]
    if args.against_video:  # render at the video's own size, so the regression compares like with like
        probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                "-of", "csv=p=0:s=x", args.against_video], capture_output=True, text=True, check=True)
        cmd += ["--size", probe.stdout.strip()]
    if subprocess.run(cmd, cwd=REPO_ROOT).returncode != 0:
        print("render failed", file=sys.stderr)
        return 1

    frames = [int(f) for f in args.frames.split(",")]
    report: dict = {"project": args.project, "gl": args.gl, "runs": args.runs, "frames": {}, "tier": 1}
    for f in frames:
        pngs = [out / f"run{r}_f{f:05d}.png" for r in range(args.runs)]
        hashes = [hashlib.sha1(p.read_bytes()).hexdigest() for p in pngs]
        worst_max, worst_mean = 0, 0.0
        for a, b in combinations(pngs, 2):
            m, mean = diff_stats(a, b)
            worst_max, worst_mean = max(worst_max, m), max(worst_mean, mean)
        t = tier(worst_max, worst_mean, len(set(hashes)) == 1)
        entry = {"tier": t, "max_diff": worst_max, "mean_diff": round(worst_mean, 5), "identical": len(set(hashes)) == 1}
        if args.against_video:
            ref = out / f"video_f{f:05d}.png"
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", args.against_video, "-vf", f"select=eq(n\\,{f})",
                            "-frames:v", "1", str(ref)], check=True)
            entry["psnr_vs_video"] = round(psnr(pngs[0], ref), 2)
        report["frames"][str(f)] = entry
        report["tier"] = max(report["tier"], t)
        print(f"frame {f}: tier {t}  max {worst_max}  mean {worst_mean:.5f}" + (f"  psnr vs video {entry['psnr_vs_video']} dB" if args.against_video else ""))

    report["passed"] = report["tier"] <= 2
    (qc / "determinism.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"overall: tier {report['tier']} ({'pass' if report['passed'] else 'FAIL'}); wrote {qc / 'determinism.json'}")
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
