"""Scaffold an Isofigure style bundle project: an interactive isometric figure of a working object.

Usage:
    python scripts/isofigure_new_figure.py <project> [--force]

Copies ``templates/isofigure_figure/`` (model.ts, figure.tsx, main.tsx) to ``projects/<project>/`` and sets the project
config for the isofigure style bundle. The template IS the washing machine, so a fresh scaffold already builds: replace
the model (the truth), the drawing and the controls, then run ``python scripts/isofigure_build_html.py <project>`` and
open ``projects/<project>/figure.html``.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "isofigure_figure"
FILES = ("model.ts", "figure.tsx", "main.tsx")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true", help="Overwrite existing model/figure/main")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    project_dir.mkdir(parents=True, exist_ok=True)
    if not args.force and any((project_dir / f).exists() for f in FILES):
        print("Model or figure already exist; use --force to overwrite", file=sys.stderr)
        return 1
    for name in FILES:
        shutil.copy2(TEMPLATE_DIR / name, project_dir / name)
    if not (project_dir / "tour.json").exists():  # the narrated tour used to record the figure as a video chapter
        shutil.copy2(TEMPLATE_DIR / "tour.json", project_dir / "tour.json")

    config_path = project_dir / "config.json"
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.exists() else {"id": args.project, "title": args.project}
    config["style_bundle"] = "isofigure"
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Copied {', '.join(FILES)} to {project_dir}")
    print('Project config set to "style_bundle": "isofigure"')
    print(f"Next: python scripts/isofigure_build_html.py {args.project}  (then open projects/{args.project}/figure.html)")
    print(f"As a video chapter: edit tour.json, then python scripts/isofigure_capture_video.py {args.project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
