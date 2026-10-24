"""Scaffold a Papercut style bundle project: an HTML paper-cut film with a generated score.

Usage:
    python scripts/papercut_new_video.py <project> [--voice] [--force]

Copies ``templates/papercut_video/`` (scenes.tsx, score.ts, main.tsx) to ``projects/<project>/`` and sets the project
config for the papercut style bundle (1280x720, 30 fps, no narration). The template IS the fox film, so a fresh
scaffold already builds: edit the scenes and the score, then run
``python scripts/papercut_build_html.py <project>`` and open ``projects/<project>/film.html``.

``--voice`` turns on the optional voice: ``"voice": true`` in config.json plus a starter
``narration/narrations.json`` (one entry per template scene, empty narration = silent scene). Fill in the lines, run
``python -m src.cli voiceover <project>``, then build.
"""

from __future__ import annotations

import argparse
import json
import re
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
    parser.add_argument("--voice", action="store_true", help="Turn on the optional voice and write a starter narration")
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
    if args.voice:
        config["voice"] = True
        config.setdefault("tts", {"provider": "edge", "voice_id": ""})  # free; change the provider/voice as you like
        config.setdefault("paths", {}).update({"narration": "narration/narrations.json", "voiceover": "voiceover/",
                                               "voiceover_manifest": "voiceover/manifest.json"})
        narr = project_dir / "narration" / "narrations.json"
        if args.force or not narr.exists():
            names = re.findall(r'"([^"]+)"', (TEMPLATE_DIR / "main.tsx").read_text(encoding="utf-8").split("sceneNames", 1)[1])
            scenes = [{"scene_id": f"s{i + 1:02d}_" + re.sub(r"[^a-z0-9]+", "_", n.lower()).strip("_"), "title": n,
                       "duration_seconds": 6, "narration": ""} for i, n in enumerate(names)]
            narr.parent.mkdir(parents=True, exist_ok=True)
            narr.write_text(json.dumps({"scenes": scenes}, indent=2), encoding="utf-8")
            print(f"Voice on: starter narration (one entry per scene) in {narr}")
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Copied {', '.join(FILES)} to {project_dir}")
    print('Project config set to "style_bundle": "papercut", 1280x720')
    print(f"Next: python scripts/papercut_build_html.py {args.project}  (then open projects/{args.project}/film.html)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
