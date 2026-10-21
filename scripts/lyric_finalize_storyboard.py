"""Tighten pacing and build the storyboard for a Lyric style bundle video.

Usage:
    python scripts/lyric_finalize_storyboard.py <project> [--no-trim]

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence, rebuilds the storyboard and
sets the lyric pacing: 0.15 s between scenes and 6-frame plain fades (near hard cuts, like a music video).
Use ``--no-trim`` when ``voiceover/<scene_id>.mp3`` are slices of a real song: silence trimming
would cut the music. See ``_storyboard_pacing.py``.
"""

from __future__ import annotations

import argparse
import sys

from _storyboard_pacing import REPO_ROOT, finalize

BUFFER_SECONDS = 0.15
TRANSITION = {"style": "fade", "duration_frames": 6}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--no-trim", action="store_true", help="Use the audio files as-is (song clips)")
    args = parser.parse_args(argv)
    return finalize(args.project, args.projects_dir, BUFFER_SECONDS, TRANSITION, trim=not args.no_trim)


if __name__ == "__main__":
    sys.exit(main())
