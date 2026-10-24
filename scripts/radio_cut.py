"""Radio cut: scene timing from narration alone, before any render or paid generation.

Usage:
    python scripts/radio_cut.py <project> [--wps 2.6] [--buffer S] [--projects-dir DIR]

Reads ``narration/narrations.json`` and writes ``plan/radio_cut.json`` (scene start, end, duration, source).
A scene's duration is measured from ``voiceover/<scene_id>.mp3`` when it exists (ffprobe), otherwise
estimated from its word count at ``--wps`` words per second. It then compares each scene with the style
bundle's spoken-word range and with the scene's planned ``duration_seconds``, and prints the timeline.
Exit 1 on any ERROR (empty narration, or an estimate longer than the planned duration); WARN lines are advice.
Run it after ``review_video.py`` and before ``voiceover`` or ``render``: fix the script, not the render.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from review_video import STYLE_BUNDLES  # noqa: E402


# Scene buffer each bundle's finalize script uses; other bundles fall back to 0.4.
BUNDLE_BUFFER = {"launch": 0.2, "storybook": 0.5}


def count_words(text: str) -> int:
    return len(re.findall(r"[\w'’-]+", text))


def measure(mp3: Path) -> float | None:
    if not mp3.exists() or shutil.which("ffprobe") is None:
        return None
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
        capture_output=True, text=True,
    ).stdout.strip()
    return float(out) if out else None


def build(project_dir: Path, wps: float, buffer: float | None) -> tuple[dict, list[str], list[str]]:
    narr = json.loads((project_dir / "narration" / "narrations.json").read_text(encoding="utf-8"))
    config_path = project_dir / "config.json"
    bundle = json.loads(config_path.read_text(encoding="utf-8")).get("style_bundle") if config_path.exists() else None
    buffer = buffer if buffer is not None else BUNDLE_BUFFER.get(bundle, 0.4)
    words_range = (STYLE_BUNDLES.get(bundle) or {}).get("words")
    errors: list[str] = []
    warnings: list[str] = []
    scenes, t = [], 0.0
    for s in narr["scenes"]:
        sid, words = s["scene_id"], count_words(s.get("narration", ""))
        if words == 0:
            errors.append(f"{sid}: empty narration")
        measured = measure(project_dir / "voiceover" / f"{sid}.mp3")
        speech = measured if measured is not None else words / wps
        planned = s.get("duration_seconds")
        if planned is not None and planned < speech:
            # Once the voiceover exists the storyboard uses the audio length, so a stale plan is only advice.
            (warnings if measured is not None else errors).append(f"{sid}: planned {planned:.1f}s is shorter than the speech ({speech:.1f}s)")
        if words_range and not words_range[0] <= words <= words_range[1]:
            warnings.append(f"{sid}: {words} words, {bundle} style expects {words_range[0]}-{words_range[1]}")
        # Measured speech is the real length; before the voiceover exists the plan is a floor for the estimate.
        dur = (speech if measured is not None else max(speech, planned or 0)) + buffer
        scenes.append({
            "scene_id": sid, "start": round(t, 2), "end": round(t + dur, 2), "duration": round(dur, 2),
            "words": words, "speech_seconds": round(speech, 2), "source": "voiceover" if measured else "estimate",
        })
        t += dur
    return {"style_bundle": bundle, "wps": wps, "buffer": buffer, "total_seconds": round(t, 2), "scenes": scenes}, errors, warnings


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("project")
    ap.add_argument("--wps", type=float, default=2.6, help="spoken words per second used for estimates")
    ap.add_argument("--buffer", type=float, default=None, help="seconds added after each scene (default: the style bundle's, else 0.4)")
    ap.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = ap.parse_args()
    project_dir = Path(args.projects_dir) / args.project
    if not (project_dir / "narration" / "narrations.json").exists():
        print(f"No narration/narrations.json in {project_dir}", file=sys.stderr)
        return 1
    cut, errors, warnings = build(project_dir, args.wps, args.buffer)
    (project_dir / "plan").mkdir(exist_ok=True)
    (project_dir / "plan" / "radio_cut.json").write_text(json.dumps(cut, indent=2), encoding="utf-8")
    for s in cut["scenes"]:
        print(f"{s['start']:6.1f}-{s['end']:6.1f}s  {s['scene_id']:<20} {s['words']:>3} words  ({s['source']})")
    print(f"Total {cut['total_seconds']}s -> plan/radio_cut.json")
    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
