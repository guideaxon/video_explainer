"""Scaffold a Vantage style bundle short: copy the reference scenes into a project variant.

Usage:
    python scripts/vantage_new_short.py <project> [--variant summary] [--force]

Creates ``projects/<project>/short/<variant>/scenes/`` from ``templates/vantage_short/scenes/``,
sets ``"style_bundle": "vantage"`` in the project config and adds the stub
``projects/<project>/scenes/index.ts`` that the renderer requires. Edit the copied scenes to match
your narration, then render with ``python -m src.cli render <project> --short --variant <v>``.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "vantage_short" / "scenes"

SCENES_STUB = """// Stub registry: this project only renders shorts, which use short/<variant>/scenes.
import type { ComponentType } from "react";
export type SceneComponent = ComponentType<any>;
export const PROJECT_SCENES: Record<string, SceneComponent> = {};
"""


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--variant", default="summary", help="Short variant name")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true", help="Overwrite existing scene files")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    config_path = project_dir / "config.json"
    if not config_path.exists():
        print(f"Project not found: {project_dir} (run: python -m src.cli create {args.project})", file=sys.stderr)
        return 1

    scenes_dir = project_dir / "short" / args.variant / "scenes"
    if scenes_dir.exists() and any(scenes_dir.iterdir()) and not args.force:
        print(f"{scenes_dir} is not empty; use --force to overwrite", file=sys.stderr)
        return 1
    scenes_dir.mkdir(parents=True, exist_ok=True)
    for src in TEMPLATE_DIR.glob("*"):
        shutil.copy2(src, scenes_dir / src.name)

    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["style_bundle"] = "vantage"
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    stub = project_dir / "scenes" / "index.ts"
    if not stub.exists():
        stub.parent.mkdir(parents=True, exist_ok=True)
        stub.write_text(SCENES_STUB, encoding="utf-8")

    print(f"Scenes copied to {scenes_dir}")
    print('Project config set to "style_bundle": "vantage"')
    print("Next: edit the Beat*Scene.tsx files to match the narration, then render.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
