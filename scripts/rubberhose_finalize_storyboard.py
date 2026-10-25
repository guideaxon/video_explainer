"""Tighten pacing and build the storyboard for a Rubberhose style bundle video.

Usage:
    python scripts/rubberhose_finalize_storyboard.py <project>

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence, rebuilds the storyboard and
sets the rubberhose pacing: 0.3 s between scenes and 6-frame plain fades (half a second of held drawings; the iris scenes cut through black).
See ``_storyboard_pacing.py``.
Then bakes ``scenes/lipsync.ts`` with the shared ``_lipsync.py`` so the Kip can talk
(``mouth={LIPSYNC.<scene>} visemes={VISEMES.<scene>}``).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _lipsync import bake_and_write
from _storyboard_pacing import REPO_ROOT, finalize

BUFFER_SECONDS = 0.3
TRANSITION = {"style": "fade", "duration_frames": 6}


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
