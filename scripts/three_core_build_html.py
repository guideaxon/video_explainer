"""Build a three-core project's live page into one self-contained HTML file.

Usage:
    python scripts/three_core_build_html.py <project> [--entry live/main.ts] [--out scene.html] [--title "Bubble toy"]

Thin wrapper (so the UI can run it like every other step) around ``node scripts/three_core_build_html.mjs``.
Output: ``projects/<project>/scene.html``; works offline. Fails if a bundled library's licence notice is missing.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if not args:
        print(__doc__, file=sys.stderr)
        return 2
    node = shutil.which("node")
    if not node:
        print("node not found. Install Node 22.", file=sys.stderr)
        return 1
    return subprocess.run([node, str(REPO_ROOT / "scripts" / "three_core_build_html.mjs"), *args], cwd=REPO_ROOT).returncode


if __name__ == "__main__":
    sys.exit(main())
