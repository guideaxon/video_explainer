"""Tighten pacing, build the storyboard and bake lip sync for a Lowpoly style bundle video.

Usage:
    python scripts/lowpoly_finalize_storyboard.py <project>

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence, rebuilds the storyboard with the lowpoly
pacing (0.4 s between scenes, 10-frame dissolves), then writes ``scenes/lipsync.ts`` with the shared
``_lipsync.py``: mouth openness and (with Rhubarb on PATH) mouth shapes per frame at the project fps, plus the
caption text of every scene. Needs ffmpeg.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _lipsync import bake_and_write, mouth_curve, write_lipsync_ts  # noqa: F401 (re-exported for older callers)
from _storyboard_pacing import REPO_ROOT, finalize

BUFFER_SECONDS = 0.4
TRANSITION = {"style": "fade", "duration_frames": 10}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = parser.parse_args(argv)
    code = finalize(args.project, args.projects_dir, BUFFER_SECONDS, TRANSITION)
    if code:
        return code
    bake_and_write(Path(args.projects_dir) / args.project)
    return 0


if __name__ == "__main__":
    sys.exit(main())
