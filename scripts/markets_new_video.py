"""Scaffold a Markets style bundle video (portrait 1080x1920): scenes, starter narration and project config.

Usage:
    python scripts/markets_new_video.py <project> [--force]

Copies ``templates/markets_video/scenes/`` to ``projects/<project>/scenes/``, writes a starter
``narration/narrations.json`` (one scene per chapter, SAMPLE text and data), and sets the project
config for the markets style bundle (1080x1920 portrait, 30 fps, edge TTS). Then replace the sample narration and
data, and run: voiceover, storyboard, render (see ``.claude/skills/markets_make_video``).
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "markets_video" / "scenes"

# scene_id (registry key), title, SAMPLE narration (about 10 to 14 words each).
# The storyboard derives each scene's type from its TITLE (src/cli/main.py _title_to_scene_key), so the
# registry key must equal that slug; tests/test_markets_template.py checks this.
SAMPLE_SCENES = [
    ("bull_run", "Bull Run", "Market story number one. Bull run. How a rally is built."),
    ("long_road_up", "The Long Road Up", "Ten years, one staircase. Prices climbed, stalled, then broke out higher."),
    ("how_a_rally_is_built", "How a Rally Is Built", "Zoom in. Each green candle adds a brick, and volume shows who is buying."),
    ("todays_move", "Today's Move", "Today the index jumped twelve point four percent. Risk on."),
    ("who_led_the_charge", "Who Led the Charge", "Tech led, energy followed, utilities lagged. Leadership tells you the mood."),
    ("where_the_money_sits", "Where the Money Sits", "Forty five percent sits in stocks. That is the growth engine."),
    ("fear_meter", "Fear Meter", "Sentiment reads seventy two. Greed. Rallies feel safest right when they are riskiest."),
    ("market_heatmap", "The Market Heatmap", "Green across most of the big names, with a few red pockets."),
    ("money_never_sleeps", "Money Never Sleeps", "Markets chain around the globe. While you sleep, money keeps moving."),
    ("drop_and_climb_back", "Drop and Climb Back", "Every rally has a drop. The ones who held their nerve saw the climb back."),
    ("stay_bullish", "Stay Bullish", "Stay curious, stay diversified, and stay bullish."),
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
            "duration_seconds": round(max(4.0, len(text.split()) / WORDS_PER_SECOND + 1.5), 1),
            "narration": text,
        }
        for scene_id, title, text in SAMPLE_SCENES
    ]
    narration_path.write_text(json.dumps({"scenes": scenes}, indent=2), encoding="utf-8")

    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["style_bundle"] = "markets"
    config.setdefault("video", {}).update({"resolution": {"width": 1080, "height": 1920}, "fps": 30, "target_duration_seconds": 50})
    config.setdefault("tts", {})["provider"] = "edge"
    config["style"] = {
        "background_color": "#f4ecc8",
        "primary_color": "#1f9d55",
        "secondary_color": "#d64545",
        "font_family": "Libre Baskerville",
    }
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Scenes copied to {scenes_dir}")
    print(f"Starter narration written to {narration_path} (SAMPLE text, replace it)")
    print('Project config set to "style_bundle": "markets", 1080x1920 portrait')
    print(f"Next: edit scenes/data and narration, then: voiceover, storyboard, render {args.project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
