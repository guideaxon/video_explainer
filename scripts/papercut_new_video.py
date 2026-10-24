"""Scaffold a Papercut style bundle project: an HTML paper-cut film with a generated score.

Usage:
    python scripts/papercut_new_video.py <project> [--force]

Copies ``templates/papercut_video/`` (scenes.tsx, score.ts, main.tsx) to ``projects/<project>/`` and sets the project
config for the papercut style bundle (1280x720, 30 fps, no narration). The template IS the fox film, so a fresh
scaffold already builds: edit the scenes and the score, then run
``python scripts/papercut_build_html.py <project>`` and open ``projects/<project>/film.html``.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "papercut_video"
FILES = ("scenes.tsx", "score.ts", "main.tsx")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true", help="Overwrite existing scenes/score/main")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    project_dir.mkdir(parents=True, exist_ok=True)
    if not args.force and any((project_dir / f).exists() for f in FILES):
        print("Scenes or score already exist; use --force to overwrite", file=sys.stderr)
        return 1
    for name in FILES:
        shutil.copy2(TEMPLATE_DIR / name, project_dir / name)

    config_path = project_dir / "config.json"
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.exists() else {"id": args.project, "title": args.project}
    config["style_bundle"] = "papercut"
    config.setdefault("video", {}).update({"resolution": {"width": 1280, "height": 720}, "fps": 30, "target_duration_seconds": 60})
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Copied {', '.join(FILES)} to {project_dir}")
    print('Project config set to "style_bundle": "papercut", 1280x720')
    print(f"Next: python scripts/papercut_build_html.py {args.project}  (then open projects/{args.project}/film.html)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
