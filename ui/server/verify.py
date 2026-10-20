"""Post-render checks for a project's final video: size, decode, audio codec.

Usage: python -m ui.server.verify <project> [--projects-dir DIR]
Exits 1 on any failed check. Prints one PASS/FAIL line per check, so the job log is the report.
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]


def _probe(video: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(video)],
        capture_output=True, text=True, check=True,
    )
    return json.loads(out.stdout)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    config = json.loads((project_dir / "config.json").read_text(encoding="utf-8"))
    rel = config.get("paths", {}).get("final_video", "output/final.mp4")
    video = project_dir / rel
    if not video.exists():
        print(f"FAIL  missing video: {video}")
        return 1

    failures = 0

    def check(ok: bool, label: str) -> None:
        nonlocal failures
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
        failures += 0 if ok else 1

    info = _probe(video)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    res = config.get("video", {}).get("resolution", {})
    want = (res.get("width"), res.get("height"))
    if v:
        got = (v["width"], v["height"])
        check(got == want, f"size {got[0]}x{got[1]} (config says {want[0]}x{want[1]})")
    else:
        check(False, "video stream present")
    check(a is not None and a.get("codec_name") == "aac", f"audio codec {a.get('codec_name') if a else 'none'} (want aac)")
    if a:
        check(a.get("sample_rate") == "48000", f"audio sample rate {a.get('sample_rate')} (want 48000)")
    print(f"INFO  duration {float(info['format'].get('duration', 0)):.1f}s")

    decode = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(video), "-f", "null", "-"], capture_output=True, text=True,
    )
    check(decode.returncode == 0 and not decode.stderr.strip(), "decodes without errors")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
