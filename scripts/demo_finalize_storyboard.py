"""Tighten pacing and build the storyboard for a Demo style bundle video.

Usage:
    python scripts/demo_finalize_storyboard.py <project> [--keep-audio]

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence (skip with ``--keep-audio`` for your own
recorded voiceover), rebuilds the storyboard and sets the demo pacing: 0.5 s between scenes and 12-frame
fades, so the camera moves and cursor clicks of each step can finish. See ``_storyboard_pacing.py``.
"""

from __future__ import annotations

import argparse
import sys

from _storyboard_pacing import REPO_ROOT, finalize

BUFFER_SECONDS = 0.5
TRANSITION = {"style": "fade", "duration_frames": 12}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--keep-audio", action="store_true", help="do not trim silence (own recordings)")
    args = parser.parse_args(argv)
    return finalize(args.project, args.projects_dir, BUFFER_SECONDS, TRANSITION, trim=not args.keep_audio)


if __name__ == "__main__":
    sys.exit(main())
