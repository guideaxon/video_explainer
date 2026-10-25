"""Scaffold a Storybook style bundle video (landscape 1280x720): scenes, starter narration, art plan, config.

Usage:
    python scripts/storybook_new_video.py <project> [--force]

Copies ``templates/storybook_video/scenes/`` to ``projects/<project>/scenes/``, writes a starter
``narration/narrations.json`` (SAMPLE story: a document turned into a video by a small workshop), writes
``art/style.json`` (style line, cast lines, one shot per scene) for ``scripts/storybook_stills_comfy.py``, and sets
the project config for the storybook style bundle (1280x720, 30 fps, edge TTS). Replace the story, cast and
shots, then run: radio_cut, stills, review, voiceover, ``scripts/storybook_finalize_storyboard.py``, render.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "storybook_video" / "scenes"

# scene_id (registry key), title, SAMPLE narration, shot description for the stills generator. The storyboard derives
# each scene's type from its TITLE (src/cli/main.py _title_to_scene_key), so the registry key must equal that slug.
SAMPLE_SCENES = [
    ("idea", "Idea", "It starts with a single idea on a page.",
     "(a wooden desk close to a window:1.2), a sheet of paper with a drawn lightbulb in the middle of the desk, closed laptop, pinboard with drawings, no people"),
    ("workshop", "Workshop", "Drop it in, and a little workshop wakes up.",
     "(a small brick workshop with a big metal funnel on the roof and a tall chimney topped by a film reel:1.3), cobblestone village square, conveyor belt beside the door, no people"),
    ("script", "Script", "First, a script, written line by line.",
     "(old typewriter on a wooden desk:1.4), the girl sitting at the typewriter, paper pages, workshop interior, side view"),
    ("storyboard", "Storyboard", "Then a storyboard, panel by panel.",
     "(large cork board with nine small painted pictures in a grid:1.4), the girl pinning a picture to the board, workshop interior"),
    ("voice", "Voice", "A voice reads it aloud, in time with every picture.",
     "(vintage microphone on a stand:1.4), reel-to-reel tape machine, workshop interior, wooden floor, no people"),
    ("review", "Review", "Nothing leaves until you approve it.",
     "(big wooden double gate:1.3), (red rubber stamp on a counter:1.3), the girl standing beside the stamp, workshop interior"),
    ("render", "Render", "Then the film rolls out, ready to share.",
     "(film cassette on a conveyor belt:1.4) leaving the open door of the brick workshop, the girl waving, village square"),
    ("finale", "Finale", "Video Explainer. Documents in, videos out.",
     "(small brick workshop with a funnel roof and a film reel on the chimney:1.3), village square, blue sky with clouds, empty sky at the top, empty ground at the bottom, no people"),
]
STYLE = {
    "style_line": "(children's picture book illustration:1.3), (gouache and watercolor painting:1.2), flat painted shapes, "
                  "ink outlines, warm cream and terracotta and teal palette, soft window light, paper texture, "
                  "wide establishing shot, small figures",
    "cast": ["(solo:1.5), (one small girl:1.4), red scarf, round glasses, brown cap, teal overalls"],
    "negative": "photo, photograph, photorealistic, 3d render, closeup, portrait, text, letters, watermark, logo, apple logo, brand, extra fingers, deformed hands, blurry, lowres, multiple children, duplicate, two girls, three girls, group, crowd, several children, many people, siblings",
    "model": "sd15\\juggernaut_reborn.safetensors",
    "size": [768, 432],
    "upscale": 1.667,
    "steps": 28,
    "cfg": 6.5,
}
CAST_SHOTS = {"script", "storyboard", "voice", "review", "render"}
# Shots generated as empty plates; the template scene draws the code-drawn character (Wren) over them.
PLATE_SHOTS = {"workshop", "voice"}
WORDS_PER_SECOND = 2.3


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true", help="Overwrite existing scenes/narration/art plan")
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
    narration_path.write_text(json.dumps({"scenes": [
        {"scene_id": sid, "title": title, "duration_seconds": round(max(3.0, len(text.split()) / WORDS_PER_SECOND + 1.0), 1), "narration": text}
        for sid, title, text, _ in SAMPLE_SCENES
    ]}, indent=2), encoding="utf-8")

    art_dir = project_dir / "art"
    (art_dir / "refs").mkdir(parents=True, exist_ok=True)
    (art_dir / "style.json").write_text(json.dumps({
        **STYLE,
        "shots": [{"id": sid, "prompt": shot, "seed": 1500 + i * 7, "cast": sid in CAST_SHOTS and sid not in PLATE_SHOTS, **({"plate": True} if sid in PLATE_SHOTS else {})} for i, (sid, _, _, shot) in enumerate(SAMPLE_SCENES)],
    }, indent=2), encoding="utf-8")

    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["style_bundle"] = "storybook"
    config.setdefault("video", {}).update({"resolution": {"width": 1280, "height": 720}, "fps": 30, "target_duration_seconds": 34})
    config.setdefault("tts", {})["provider"] = "edge"
    config["style"] = {"background_color": "#fbf1de", "primary_color": "#c8553d", "secondary_color": "#2f7d80", "font_family": "Fraunces"}
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Scenes copied to {scenes_dir}; art plan in {art_dir / 'style.json'}")
    print('Project config set to "style_bundle": "storybook", 1280x720')
    print(f"Next: radio_cut, then: python scripts/storybook_stills_comfy.py {args.project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
