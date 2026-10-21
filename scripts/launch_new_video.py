"""Scaffold a Launch style bundle video (portrait 1080x1920): scenes, starter narration, project config.

Usage:
    python scripts/launch_new_video.py <project> [--force]

Copies ``templates/launch_video/scenes/`` to ``projects/<project>/scenes/``, writes a starter
``narration/narrations.json`` (SAMPLE text for the placeholder app "Gymbud" and mascot "Bud") and sets
the project config for the launch style bundle (1080x1920, 30 fps, edge TTS). Replace the sample brand,
copy and content, then run: voiceover, ``scripts/launch_finalize_storyboard.py``, render.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "launch_video" / "scenes"

# scene_id (registry key), title, SAMPLE narration. The storyboard derives each scene's type from its
# TITLE (src/cli/main.py _title_to_scene_key), so the registry key must equal that slug;
# tests/test_launch_template.py checks this.
SAMPLE_SCENES = [
    ("hook", "Hook", "You train. It grows. Your mascot evolves with every workout."),
    ("evolve", "Evolve", "Ten evolution stages, from seed to champion."),
    ("daily_mascot", "Daily Mascot", "Bud is there every day, with daily gifts, moods and little quips."),
    ("weekly_challenge", "Weekly Challenge", "A challenge every week. Beat it, earn coins."),
    ("streaks", "Streaks", "Never give up. Keep your streak alive and unlock trophies."),
    ("shop", "Shop", "Dress up your Bud with hats, accessories and collections."),
    ("widgets", "Widgets", "Always on your screen, with widgets and live activities."),
    ("finale", "Finale", "Gymbud. Your Bud is waiting. Coming soon to the App Store."),
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
    config["style_bundle"] = "launch"
    config.setdefault("video", {}).update({"resolution": {"width": 1080, "height": 1920}, "fps": 30, "target_duration_seconds": 30})
    config.setdefault("tts", {})["provider"] = "edge"
    config["style"] = {
        "background_color": "#d7f4e4",
        "primary_color": "#1b9c68",
        "secondary_color": "#ff7a59",
        "font_family": "Plus Jakarta Sans",
    }
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Scenes copied to {scenes_dir}")
    print(f"Starter narration written to {narration_path} (SAMPLE text, replace it)")
    print('Project config set to "style_bundle": "launch", 1080x1920 portrait')
    print(f"Next: edit scenes/data and narration, then: voiceover, launch_finalize_storyboard, render {args.project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
