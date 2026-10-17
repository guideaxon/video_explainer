"""Tighten pacing and build the storyboard for a Launch-channel video.

Usage:
    python scripts/launch_finalize_storyboard.py <project>

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence, rebuilds the storyboard and
sets the launch pacing: 0.2 s between scenes and 8-frame plain fades (short, bouncy scenes).
See ``_storyboard_pacing.py``.
"""

from __future__ import annotations

import argparse
import sys

from _storyboard_pacing import REPO_ROOT, finalize

BUFFER_SECONDS = 0.2
TRANSITION = {"style": "fade", "duration_frames": 8}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = parser.parse_args(argv)
    return finalize(args.project, args.projects_dir, BUFFER_SECONDS, TRANSITION)


if __name__ == "__main__":
    sys.exit(main())
