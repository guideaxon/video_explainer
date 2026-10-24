"""Continuity QC for a rendered video: palette drift, black frames, contact sheet, reviewer brief.

Usage:
    python scripts/continuity_qc.py <video.mp4> [--out DIR] [--every 2.0] [--refs DIR] [--threshold 0.35]
    python scripts/continuity_qc.py --project <project>     # newest projects/<p>/output/*.mp4

Samples a frame every ``--every`` seconds and every cut, then:
  * palette drift: each frame's coarse colour histogram against the video's median palette (and against
    the frames in ``--refs`` when given: character sheets, style references). Drift above ``--threshold``
    is a WARN, because one scene leaving the style bundle's look is the usual continuity break;
  * black or near-flat frames (ERROR) and a loudness check (WARN when mean is outside -24..-10 dB);
  * writes ``contact_sheet.png`` and ``brief.md`` for the reviewer pass (Claude reads the sheet next to the
    refs and judges character identity, props and set continuity, which a script cannot).
It writes ``qc.json`` with the video's sha1. After reading the sheet and ``brief.md`` against the refs, re-run with
``--reviewed`` to record that; ``.claude/hooks/guard.py`` needs a passed AND reviewed receipt whose hash matches
before a final video is sent to the user. Exit 1 on any ERROR. Needs ffmpeg and Pillow.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import statistics
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageStat

REPO_ROOT = Path(__file__).resolve().parent.parent
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def sha1(path: Path) -> str:
    h = hashlib.sha1()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def run(*cmd: str) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def cut_times(video: Path, threshold: float = 0.3) -> list[float]:
    r = run("ffmpeg", "-v", "info", "-i", str(video), "-vf", f"select='gt(scene,{threshold})',showinfo", "-an", "-f", "null", "-")
    return [float(m) for m in re.findall(r"pts_time:([0-9.]+)", r.stderr)]


def mean_volume(video: Path) -> float | None:
    r = run("ffmpeg", "-i", str(video), "-af", "volumedetect", "-vn", "-f", "null", "-")
    m = re.search(r"mean_volume: (-?[0-9.]+) dB", r.stderr)
    return float(m.group(1)) if m else None


def duration(video: Path) -> float:
    return float(run("ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(video)).stdout.strip())


def histogram(img: Image.Image, bins: int = 4) -> list[float]:
    small = img.convert("RGB").resize((64, 64))
    h = [0.0] * bins**3
    step = 256 // bins
    raw = small.tobytes()
    for i in range(0, len(raw), 3):
        h[(raw[i] // step) * bins * bins + (raw[i + 1] // step) * bins + raw[i + 2] // step] += 1
    total = sum(h)
    return [x / total for x in h]


def drift(a: list[float], b: list[float]) -> float:
    """1 - histogram intersection: 0 identical palette, 1 disjoint."""
    return 1 - sum(min(x, y) for x, y in zip(a, b))


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("video", nargs="?")
    ap.add_argument("--project")
    ap.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    ap.add_argument("--out")
    ap.add_argument("--every", type=float, default=2.0)
    ap.add_argument("--refs", help="folder of reference images (character sheets, style refs)")
    ap.add_argument("--threshold", type=float, default=0.35)
    ap.add_argument("--reviewed", action="store_true",
                    help="record that the contact sheet and brief.md were read against the refs (the guard hook requires it)")
    args = ap.parse_args()

    if shutil.which("ffmpeg") is None:
        print("ffmpeg is not on PATH", file=sys.stderr)
        return 1
    if args.project:
        outs = sorted((Path(args.projects_dir) / args.project / "output").glob("*.mp4"), key=lambda p: p.stat().st_mtime)
        if not outs:
            print(f"No rendered mp4 in projects/{args.project}/output", file=sys.stderr)
            return 1
        video = outs[-1]
        out_dir = Path(args.projects_dir) / args.project / "qc"
    elif args.video:
        video = Path(args.video)
        out_dir = Path(args.out) if args.out else video.parent / f"{video.stem}_qc"
    else:
        ap.error("give a video path or --project")
    out_dir.mkdir(parents=True, exist_ok=True)
    frames_dir = out_dir / "frames"
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir()

    dur = duration(video)
    times = sorted({round(t, 2) for t in [i * args.every + args.every / 2 for i in range(int(dur / args.every))]}
                   | {round(min(c + 0.15, dur - 0.05), 2) for c in cut_times(video)})
    frames: list[tuple[float, Path]] = []
    for t in times:
        p = frames_dir / f"{t:07.2f}.png"
        run("ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", str(video), "-frames:v", "1", "-vf", "scale=640:-1", str(p))
        if p.exists():
            frames.append((t, p))

    errors: list[str] = []
    warnings: list[str] = []
    if not frames:
        errors.append("no frames could be extracted from the video")
    if args.refs and not any(r.suffix.lower() in IMAGE_EXTS for r in Path(args.refs).glob("*")):
        errors.append(f"--refs {args.refs} holds no images")
    hists = []
    for t, p in frames:
        img = Image.open(p)
        stat = ImageStat.Stat(img.convert("L"))
        if stat.mean[0] < 6 or stat.stddev[0] < 3:
            errors.append(f"{t:.2f}s: black or flat frame")
        hists.append(histogram(img))
    median = [statistics.median(col) for col in zip(*hists)] if hists else []
    refs = [histogram(Image.open(r)) for r in sorted(Path(args.refs).glob("*")) if r.suffix.lower() in IMAGE_EXTS] if args.refs else []
    rows = []
    for (t, _), h in zip(frames, hists):
        d_med = drift(h, median)
        d_ref = min((drift(h, r) for r in refs), default=None)
        rows.append({"t": t, "drift_median": round(d_med, 3), "drift_ref": None if d_ref is None else round(d_ref, 3)})
        worst = max(d_med, d_ref or 0)
        if worst > args.threshold:
            warnings.append(f"{t:.2f}s: palette drift {worst:.2f} (above {args.threshold}); check this scene against the style bundle")

    vol = mean_volume(video)
    if vol is not None and not -24 <= vol <= -10:
        warnings.append(f"mean loudness {vol} dB is outside -24..-10 dB")

    cols, w = 4, 320
    thumbs = [(t, Image.open(p).resize((w, int(w * 9 / 16)))) for t, p in frames]
    rows_n = -(-len(thumbs) // cols)
    sheet = Image.new("RGB", (cols * w, rows_n * (thumbs[0][1].height + 14) if thumbs else 1), "white")
    draw = ImageDraw.Draw(sheet)
    for i, (t, im) in enumerate(thumbs):
        x, y = (i % cols) * w, (i // cols) * (im.height + 14)
        sheet.paste(im, (x, y + 14))
        draw.text((x + 3, y + 1), f"{t:.1f}s", fill="black")
    sheet.save(out_dir / "contact_sheet.png")

    (out_dir / "brief.md").write_text(
        f"# Continuity review: {video.name}\n\nOpen `contact_sheet.png`" + (f" next to the images in `{args.refs}`" if args.refs else "") +
        ".\n\nFor each recurring character, prop and set, confirm: same face, outfit, colours and proportions in every scene; "
        "set layout and lighting do not jump between consecutive shots; on-screen text matches the narration; no scene leaves "
        "the style bundle look.\nReport: **time, what changed, suggested fix**. Known problems are never hidden.\n\n"
        "## Script findings\n" + "".join(f"- ERROR {e}\n" for e in errors) + "".join(f"- WARN {w}\n" for w in warnings),
        encoding="utf-8",
    )
    report = {"video": video.name, "sha": sha1(video), "duration": round(dur, 2), "mean_volume": vol,
              "samples": rows, "errors": errors, "warnings": warnings, "passed": not errors, "reviewed": args.reviewed}
    (out_dir / "qc.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(f"{len(frames)} frames, {len(warnings)} warnings, {len(errors)} errors -> {out_dir}")
    for w_ in warnings:
        print(f"WARN  {w_}")
    for e in errors:
        print(f"ERROR {e}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
