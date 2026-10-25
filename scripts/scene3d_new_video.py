"""Scaffold a Scene3d style bundle video (landscape 1920x1080): scenes, simulation specs, live page, brief, config.

Usage:
    python scripts/scene3d_new_video.py <project> [--force]

Copies ``templates/scene3d_video/`` (``scenes/``, ``live/``, ``brief.md``) into ``projects/<project>/``, writes a
starter ``narration/narrations.json`` (blow, drift, pop), a captions-only ``scenes/lipsync.ts``, sets the project
config for the scene3d style bundle (1920x1080, 30 fps, edge TTS) and bakes the simulations into
``scenes/sim.json`` (``scripts/three_core_bake_sim.mjs``; it refuses to write if a check fails).
Then: fill in brief.md, edit narration, sim.spec.ts and scenes, review_video, radio_cut, voiceover,
``scripts/scene3d_finalize_storyboard.py`` (re-bakes at the storyboard durations), the determinism check, render.
The live page: ``node scripts/three_core_build_html.mjs <project>`` -> ``projects/<project>/scene.html``.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

from _lipsync import write_lipsync_ts

REPO_ROOT = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = REPO_ROOT / "templates" / "scene3d_video"

# scene_id (registry key), title, starter narration. The registry key must equal the slug of the title.
SAMPLE_SCENES = [
    ("blow", "Blow", "Every bubble starts as one breath through a thin ring of soap."),
    ("drift", "Drift", "Once it is free, it rides air that you cannot even see."),
    ("pop", "Pop", "And when the film grows too thin, it lets go in an instant."),
    ("pool", "Pool", "Under water, that same light bends into bright, moving lines."),
]
WORDS_PER_SECOND = 2.3


def bake(project: str, projects_dir: Path, seconds: dict[str, float] | None = None) -> int:
    node = shutil.which("node")
    if not node:
        print("node not found. Install Node 22.", file=sys.stderr)
        return 1
    cmd = [node, str(REPO_ROOT / "scripts" / "three_core_bake_sim.mjs"), project, "--projects-dir", str(projects_dir.resolve())]
    if seconds:
        cmd += ["--seconds", ",".join(f"{k}={v:.3f}" for k, v in seconds.items())]
    return subprocess.run(cmd, cwd=REPO_ROOT).returncode


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true", help="Overwrite existing scenes/narration")
    parser.add_argument("--no-bake", action="store_true", help="Skip baking scenes/sim.json")
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

    for sub in ("scenes", "live"):
        (project_dir / sub).mkdir(parents=True, exist_ok=True)
        for src in (TEMPLATE_DIR / sub).glob("*"):
            shutil.copy2(src, project_dir / sub / src.name)
    if args.force or not (project_dir / "brief.md").exists():
        shutil.copy2(TEMPLATE_DIR / "brief.md", project_dir / "brief.md")

    narration_path.parent.mkdir(parents=True, exist_ok=True)
    narration_path.write_text(json.dumps({"scenes": [
        {"scene_id": sid, "title": title, "duration_seconds": round(max(3.0, len(text.split()) / WORDS_PER_SECOND + 1.0), 1), "narration": text}
        for sid, title, text in SAMPLE_SCENES
    ]}, indent=2), encoding="utf-8")
    write_lipsync_ts(project_dir, {})

    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["style_bundle"] = "scene3d"
    config.setdefault("video", {}).update({"resolution": {"width": 1920, "height": 1080}, "fps": 30, "target_duration_seconds": 20})
    config.setdefault("tts", {})["provider"] = "edge"
    config["style"] = {"background_color": "#f2c9b8", "primary_color": "#e0567a", "secondary_color": "#8fa6c9", "font_family": "Inter"}
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"Scenes, live page and brief copied to {project_dir}")
    print('Project config set to "style_bundle": "scene3d", 1920x1080')
    if not args.no_bake and bake(args.project, Path(args.projects_dir)) != 0:
        print("The simulation bake failed (see BAKE FAILED lines); fix scenes/sim.spec.ts and re-run the bake.", file=sys.stderr)
        return 1
    print("Next: brief.md, narration, sim.spec.ts and scenes, review_video, radio_cut, voiceover, scene3d_finalize_storyboard, determinism check, render")
    return 0


if __name__ == "__main__":
    sys.exit(main())
