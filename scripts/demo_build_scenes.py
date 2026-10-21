"""Generate scenes and narration for a Demo style bundle video from its manifest.

Usage:
    python scripts/demo_build_scenes.py <project>

Validates ``projects/<project>/manifest.json``, then writes ``scenes/*.tsx``, ``scenes/index.ts`` and
``narration/narrations.json``. Safe to re-run after every manifest edit (scene files are regenerated).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from _demo_manifest import REPO_ROOT, load_manifest, validate_manifest, write_scenes


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    if not (project_dir / "manifest.json").exists():
        print(f"No manifest.json in {project_dir} (run demo_new_video.py first)", file=sys.stderr)
        return 1
    manifest = load_manifest(project_dir)
    errors, warnings = validate_manifest(manifest, project_dir)
    for w in warnings:
        print(f"WARN  {w}")
    for e in errors:
        print(f"ERROR {e}")
    if errors:
        print(f"{len(errors)} error(s); fix the manifest and re-run")
        return 1
    entries = write_scenes(project_dir, manifest)
    print(f"Wrote {len(entries)} scenes, scenes/index.ts and narration/narrations.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
