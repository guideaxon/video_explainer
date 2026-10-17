"""Tighten pacing and build the storyboard for a Promo-channel video.

Usage:
    python scripts/promo_finalize_storyboard.py <project>

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence, rebuilds the storyboard and
sets the promo pacing: 0.25 s between scenes and 10-frame plain fades (promo scenes are short and
punchy). See ``_storyboard_pacing.py``.
"""

from __future__ import annotations

import argparse
import sys

from _storyboard_pacing import REPO_ROOT, finalize

BUFFER_SECONDS = 0.25
TRANSITION = {"style": "fade", "duration_frames": 10}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = parser.parse_args(argv)
    return finalize(args.project, args.projects_dir, BUFFER_SECONDS, TRANSITION)


if __name__ == "__main__":
    sys.exit(main())
