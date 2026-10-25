"""Scaffold a Glossy style bundle video (portrait 1080x1920): scenes, starter narration, project config.

Usage:
    python scripts/glossy_new_video.py <project> [--force]

Copies ``templates/glossy_video/scenes/`` to ``projects/<project>/scenes/``, writes a starter
``narration/narrations.json`` (SAMPLE text for the placeholder "Pebbo") and sets the project config for
the glossy style bundle (1080x1920, 30 fps, edge TTS). Replace the sample story and data, then run: voiceover,
``scripts/glossy_finalize_storyboard.py``, render (see ``.claude/skills/glossy_make_video``).
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "glossy_video" / "scenes"

# scene_id (registry key), title, SAMPLE narration (6 to 12 words). The storyboard derives each scene's type
# from its TITLE (src/cli/main.py _title_to_scene_key), so the registry key must equal that slug;
# tests/test_glossy_template.py checks this.
SAMPLE_SCENES = [
    ("unboxing", "Unboxing", "Say hi to Pebbo. The little toy that tidies your day."),
    ("too_much_stuff", "Too Much Stuff", "Too many tabs, lost notes and missed pings. Sound familiar?"),
    ("one_button", "One Button", "Pebbo has one big button. One tap and it is sorted."),
    ("three_easy_steps", "Three Easy Steps", "Pick what matters, tap the button, then relax. That is it."),
    ("big_number", "The Big Number", "Daily tidying takes half the time. Twice as fast."),
    ("turntable", "Turntable", "Private by default. Works offline and needs no account."),
    ("get_yours", "Get Yours", "Get Pebbo free today. Download it and say hi."),
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
    config["style_bundle"] = "glossy"
    config.setdefault("video", {}).update({"resolution": {"width": 1080, "height": 1920}, "fps": 30, "target_duration_seconds": 30})
    config.setdefault("tts", {})["provider"] = "edge"
    config["style"] = {
        "background_color": "#ffece3",
        "primary_color": "#ff4766",
        "secondary_color": "#ffd23a",
        "font_family": "Fredoka",
    }
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Scenes copied to {scenes_dir}")
    print(f"Starter narration written to {narration_path} (SAMPLE text, replace it)")
    print('Project config set to "style_bundle": "glossy", 1080x1920 portrait')
    print(f"Next: edit scenes/data and narration, review_video, then: voiceover, glossy_finalize_storyboard, render {args.project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
