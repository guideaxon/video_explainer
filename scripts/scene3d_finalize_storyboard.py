"""Tighten pacing, build the storyboard, write captions and re-bake the simulations for a Scene3d style bundle video.

Usage:
    python scripts/scene3d_finalize_storyboard.py <project>

Run after ``python -m src.cli voiceover <project>``. Trims TTS silence and rebuilds the storyboard (0.4 s between
scenes, 12-frame dissolves), writes ``scenes/lipsync.ts`` (captions; there is no character, so no mouths), then
re-bakes ``scenes/sim.json`` at each scene's storyboard duration plus one second (three_core_bake_sim.mjs fails
closed on any check). Then run ``scripts/three_core_check_determinism.py <project>`` before rendering.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from _lipsync import bake_and_write
from _storyboard_pacing import REPO_ROOT, finalize
from scene3d_new_video import bake

BUFFER_SECONDS = 0.4
TRANSITION = {"style": "fade", "duration_frames": 12}


def scene_seconds(project_dir: Path) -> dict[str, float]:
    """Storyboard duration of each scene (audio + buffer + 1 s of slack), keyed by registry key."""
    sb = json.loads((project_dir / "storyboard" / "storyboard.json").read_text(encoding="utf-8"))
    buffer = float((sb.get("audio") or {}).get("buffer_between_scenes_seconds", BUFFER_SECONDS))
    return {s["type"].split("/")[-1]: float(s.get("audio_duration_seconds") or 0) + buffer + 1.0 for s in sb.get("scenes", [])}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = parser.parse_args(argv)
    code = finalize(args.project, args.projects_dir, BUFFER_SECONDS, TRANSITION)
    if code:
        return code
    project_dir = Path(args.projects_dir) / args.project
    bake_and_write(project_dir)
    return bake(args.project, Path(args.projects_dir), scene_seconds(project_dir))


if __name__ == "__main__":
    sys.exit(main())
