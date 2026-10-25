"""Run the MovieBook clip step in one command: write the H3 jobs, then generate the clips (what the web UI's Clips step runs).

Usage:
    python scripts/moviebook_run_clips.py <project> [--only dawn,arrival] [--force]

Same as ``moviebook_clip_jobs.py <project>`` followed by ``node scripts/moviebook_clips_comfy.mjs <project> [--only ..]
[--force]``; exits with the node script's status. Needs Node on PATH and ComfyUI running.
"""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

import moviebook_clip_jobs  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("
")[0])
    ap.add_argument("project")
    ap.add_argument("--only")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = ap.parse_args(argv)
    code = moviebook_clip_jobs.main([args.project, "--projects-dir", args.projects_dir])
    if code:
        return code
    node = shutil.which("node")
    if node is None:
        print("Node is not on PATH", file=sys.stderr)
        return 1
    cmd = [node, str(REPO_ROOT / "scripts" / "moviebook_clips_comfy.mjs"), args.project, "--projects-dir", args.projects_dir]
    if args.only:
        cmd += ["--only", args.only]
    if args.force:
        cmd.append("--force")
    return subprocess.run(cmd, cwd=REPO_ROOT).returncode


if __name__ == "__main__":
    sys.exit(main())
