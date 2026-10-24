"""Tighten pacing and build the storyboard for a Leader Bot style bundle video.

Usage:
    python scripts/leaderbot_finalize_storyboard.py <project>

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence, rebuilds the storyboard and
sets the leaderbot pacing: 0.2 s between scenes and 4-frame plain fades (hard, stepped, game-like cuts).
See ``_storyboard_pacing.py``.
Then bakes ``scenes/lipsync.ts`` with the shared ``_lipsync.py`` so the PixelBot / BotGrid can talk
(``mouth={LIPSYNC.<scene>} visemes={VISEMES.<scene>}``).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _lipsync import bake_and_write
from _storyboard_pacing import REPO_ROOT, finalize

BUFFER_SECONDS = 0.2
TRANSITION = {"style": "fade", "duration_frames": 4}


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
