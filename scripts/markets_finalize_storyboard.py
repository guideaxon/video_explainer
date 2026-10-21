"""Tighten pacing and build the storyboard for a Markets style bundle video.

Usage:
    python scripts/markets_finalize_storyboard.py <project>

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence, rebuilds the storyboard and
sets the markets pacing: 0.35 s between scenes and 12-frame plain fades (the pipeline defaults of
1.0 s and 45-frame cinematic transitions are too slow for this style). See ``_storyboard_pacing.py``.
"""

from __future__ import annotations

import argparse
import sys

from _storyboard_pacing import REPO_ROOT, finalize

BUFFER_SECONDS = 0.35
TRANSITION = {"style": "fade", "duration_frames": 12}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = parser.parse_args(argv)
    return finalize(args.project, args.projects_dir, BUFFER_SECONDS, TRANSITION)


if __name__ == "__main__":
    sys.exit(main())
