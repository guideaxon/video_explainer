"""Build an Isofigure style bundle project into one self-contained HTML figure.

Usage:
    python scripts/isofigure_build_html.py <project>

Thin wrapper (so the UI can run it like every other step) around ``node scripts/isofigure_build_html.mjs``.
Output: ``projects/<project>/figure.html``; open it in any browser.
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print(__doc__, file=sys.stderr)
        return 2
    node = shutil.which("node")
    if not node:
        print("node not found. Install Node 22.", file=sys.stderr)
        return 1
    return subprocess.run([node, str(REPO_ROOT / "scripts" / "isofigure_build_html.mjs"), args[0]], cwd=REPO_ROOT).returncode


if __name__ == "__main__":
    sys.exit(main())
