"""Run the MovieBook voice check and then the finalize step (what the web UI's "Voice check and storyboard" step runs).

Usage:
    python scripts/moviebook_run_finalize.py <project> [--skip-asr]

``moviebook_voice_check.py check <project>`` (pitch against the anchors, Whisper against the script), and only if it
passes, ``moviebook_finalize_storyboard.py <project>``. A failing check stops here with the shots to re-roll; it is never
skipped silently. ``--skip-asr`` leaves out Whisper (dialogue unchecked, and the log says so).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import moviebook_finalize_storyboard  # noqa: E402
import moviebook_voice_check  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("
")[0])
    ap.add_argument("project")
    ap.add_argument("--skip-asr", action="store_true")
    ap.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = ap.parse_args(argv)
    check = ["--projects-dir", args.projects_dir, "check", args.project] + (["--skip-asr"] if args.skip_asr else [])
    code = moviebook_voice_check.main(check)
    if code:
        return code
    return moviebook_finalize_storyboard.main([args.project, "--projects-dir", args.projects_dir])


if __name__ == "__main__":
    sys.exit(main())
