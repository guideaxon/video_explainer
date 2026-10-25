"""Scaffold a Pop-art style bundle video (portrait 1080x1920): scenes, starter narration, project config.

Usage:
    python scripts/popart_new_video.py <project> [--force]

Copies ``templates/popart_video/scenes/`` to ``projects/<project>/scenes/``, writes a starter
``narration/narrations.json`` (SAMPLE text for the placeholder hero "Dot Dash") and sets the project config for
the popart style bundle (1080x1920, 30 fps, edge TTS). Replace the sample story and data, then run: voiceover,
``scripts/popart_finalize_storyboard.py``, render (see ``.claude/skills/popart_make_video``).
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "popart_video" / "scenes"

# scene_id (registry key), title, SAMPLE narration (6 to 12 words). The storyboard derives each scene's type
# from its TITLE (src/cli/main.py _title_to_scene_key), so the registry key must equal that slug;
# tests/test_popart_template.py checks this.
SAMPLE_SCENES = [
    ("cover", "Cover", "Meet Dot Dash, the hero of the inbox. Issue number one."),
    ("setup", "The Setup", "Monday morning. Dot Dash opens the laptop and smiles."),
    ("problem", "The Problem", "Then it hits. Hundreds of emails. All of them urgent."),
    ("pow", "POW", "That is enough! One mighty tap changes everything."),
    ("fix", "The Fix", "Dot Dash strides in. One tap, and the inbox is empty."),
    ("numbers", "The Numbers", "Email time fell from twelve hours to two. Eighty three percent less."),
    ("end", "The End", "The end. Or is it? To be continued."),
]
WORDS_PER_SECOND = 2.3


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true", help="Overwrite existing scenes/narration")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    config_path = project_dir / "config.json"
    if not config_path.exists():
        print(f"Project not found: {project_dir} (run: python -m src.cli create {args.project})", file=sys.stderr)
        return 1

    scenes_dir = project_dir / "scenes"
    narration_path = project_dir / "narration" / "narrations.json"
    if not args.force and (any(scenes_dir.glob("*.tsx")) or narration_path.exists()):
        print("Scenes or narration already exist; use --force to overwrite", file=sys.stderr)
        return 1

    scenes_dir.mkdir(parents=True, exist_ok=True)
    for src in TEMPLATE_DIR.glob("*"):
        shutil.copy2(src, scenes_dir / src.name)

    narration_path.parent.mkdir(parents=True, exist_ok=True)
    scenes = [
        {
            "scene_id": scene_id,
            "title": title,
            "duration_seconds": round(max(3.0, len(text.split()) / WORDS_PER_SECOND + 1.0), 1),
            "narration": text,
        }
        for scene_id, title, text in SAMPLE_SCENES
    ]
    narration_path.write_text(json.dumps({"scenes": scenes}, indent=2), encoding="utf-8")

    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["style_bundle"] = "popart"
    config.setdefault("video", {}).update({"resolution": {"width": 1080, "height": 1920}, "fps": 30, "target_duration_seconds": 30})
    config.setdefault("tts", {})["provider"] = "edge"
    config["style"] = {
        "background_color": "#fbf4e2",
        "primary_color": "#ffe100",
        "secondary_color": "#e5007d",
        "font_family": "Bangers",
    }
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Scenes copied to {scenes_dir}")
    print(f"Starter narration written to {narration_path} (SAMPLE text, replace it)")
    print('Project config set to "style_bundle": "popart", 1080x1920 portrait')
    print(f"Next: edit scenes/data and narration, review_video, then: voiceover, popart_finalize_storyboard, render {args.project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
