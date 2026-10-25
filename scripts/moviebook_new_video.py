"""Scaffold a MovieBook style bundle video (landscape 1280x720, 24 fps): plan, scenes, narration, config.

Usage:
    python scripts/moviebook_new_video.py <project> [--force]

Copies ``templates/moviebook_video/plan.json`` (SAMPLE story: a baker and a courier, two voices, six shots) to
``projects/<project>/moviebook/plan.json``, builds the scenes, registry, dialogue captions and narration from it
(``moviebook_build_scenes.py``) and sets the project config for the moviebook style bundle (1280x720; clips are 24 fps and are retimed to the 30 fps composition; no TTS,
the dialogue audio comes from the generated clips). Replace the story, then run: keyframes, clips, voice anchor and
check, review, finalize, render. See ``.claude/skills/moviebook_make_video/SKILL.md``.
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from moviebook_build_scenes import build  # noqa: E402

TEMPLATE_PLAN = REPO_ROOT / "templates" / "moviebook_video" / "plan.json"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true", help="Overwrite an existing plan")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    config_path = project_dir / "config.json"
    if not config_path.exists():
        print(f"Project not found: {project_dir} (run: python -m src.cli create {args.project})", file=sys.stderr)
        return 1
    plan_path = project_dir / "moviebook" / "plan.json"
    if plan_path.exists() and not args.force:
        print("moviebook/plan.json already exists; use --force to overwrite", file=sys.stderr)
        return 1
    for sub in ("keyframes", "clips", "anchors"):
        (project_dir / "moviebook" / sub).mkdir(parents=True, exist_ok=True)
    shutil.copy2(TEMPLATE_PLAN, plan_path)
    code = build(project_dir)
    if code:
        return code

    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["style_bundle"] = "moviebook"
    config.setdefault("video", {}).update({
        "resolution": {"width": plan["size"][0], "height": plan["size"][1]},
        "fps": 30,
        "target_duration_seconds": round(len(plan["shots"]) * plan["frames"] / plan["fps"]),
    })
    config.setdefault("tts", {})["provider"] = "edge"  # unused: finalize extracts the voiceover from the clips
    config["style"] = {"background_color": "#14110f", "primary_color": "#e0803a", "secondary_color": "#f6efe3", "font_family": "Fraunces"}
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Plan in {plan_path}; scenes built; config set to \"style_bundle\": \"moviebook\", {plan['size'][0]}x{plan['size'][1]} @ 30 fps (clips {plan['fps']} fps)")
    print(f"Next: python scripts/moviebook_keyframes_comfy.py {args.project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
