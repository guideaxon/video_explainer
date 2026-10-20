"""Scaffold a Demo-channel video from product screenshots.

Usage:
    python scripts/demo_new_video.py <project> --screenshots DIR --name "Product" [--portrait] [--force]

Copies the screenshots (png, jpg, webp; sorted by file name = step order) into
``projects/<project>/screenshots/``, analyses them (device type, light or dark theme, accent colour) and
writes a draft ``manifest.json`` plus the project config (1920x1080, or 1080x1920 with ``--portrait``).
Captions and narration are written as TODO placeholders: look at each screenshot, write them from what
is visible, then run ``demo_build_scenes.py``. A file named ``logo.*`` is used as the brand logo, not a step.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
from pathlib import Path

from _demo_manifest import IMAGE_SUFFIXES, REPO_ROOT, analyze_image, pick_brand_style


def _title_from_filename(stem: str) -> str:
    words = re.sub(r"^[\d\s._-]+", "", stem)  # drop an order prefix like "01_"
    words = re.sub(r"[_\-.]+", " ", words).strip()
    return words.title() or stem.title()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--screenshots", required=True, help="Folder of screenshots, in step order by file name")
    parser.add_argument("--name", required=True, help="Product / brand name shown in the intro and outro")
    parser.add_argument("--portrait", action="store_true", help="1080x1920 instead of 1920x1080")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true", help="Overwrite an existing manifest")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    config_path = project_dir / "config.json"
    if not config_path.exists():
        print(f"Project not found: {project_dir} (run: python -m src.cli create {args.project})", file=sys.stderr)
        return 1
    manifest_path = project_dir / "manifest.json"
    if manifest_path.exists() and not args.force:
        print("manifest.json already exists; use --force to overwrite", file=sys.stderr)
        return 1

    source = Path(args.screenshots)
    files = sorted(p for p in source.iterdir() if p.suffix.lower() in IMAGE_SUFFIXES) if source.is_dir() else []
    logo = next((p for p in files if p.stem.lower() == "logo"), None)
    shots = [p for p in files if p is not logo]
    if not shots:
        print(f"No screenshots (png, jpg, webp) found in {source}", file=sys.stderr)
        return 1

    dest = project_dir / "screenshots"
    dest.mkdir(exist_ok=True)
    analyses = []
    for p in shots:
        shutil.copy2(p, dest / p.name)
        analyses.append(analyze_image(p))
    if logo:
        shutil.copy2(logo, dest / logo.name)
    accent, theme = pick_brand_style(analyses)

    brand = {"name": args.name, "tagline": "TODO tagline", "accent": accent, "theme": theme}
    if logo:
        brand["logo"] = f"screenshots/{logo.name}"
    scenes = [{"kind": "intro", "title": "Intro", "caption": f"TODO headline for {args.name}", "sub": "TODO one-line promise", "narration": "TODO"}]
    for p, a in zip(shots, analyses):
        scenes.append(
            {
                "kind": "step",
                "title": _title_from_filename(p.stem),
                "screenshot": f"screenshots/{p.name}",
                "aspect": a["aspect"],
                "device": a["device"],
                "caption": "TODO",
                "narration": "TODO",
            }
        )
    scenes.append({"kind": "outro", "title": "Outro", "caption": f"TODO closing line for {args.name}", "sub": "TODO call to action", "narration": "TODO"})
    manifest = {"brand": brand, "captions": True, "scenes": scenes}
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    config = json.loads(config_path.read_text(encoding="utf-8"))
    config["channel"] = "demo"
    size = {"width": 1080, "height": 1920} if args.portrait else {"width": 1920, "height": 1080}
    config.setdefault("video", {}).update({"resolution": size, "fps": 30, "target_duration_seconds": 90})
    config.setdefault("tts", {})["provider"] = "edge"
    config["style"] = {"background_color": "#0a0c14", "primary_color": accent, "secondary_color": accent, "font_family": "Inter"}
    config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    print(f"{len(shots)} screenshots copied to {dest}")
    for p, a in zip(shots, analyses):
        print(f"  {p.name}: {a['width']}x{a['height']}, device {a['device']}, luminance {a['luminance']:.2f}, accent {a['accent']}")
    print(f"Detected brand style: accent {accent}, theme {theme}; manifest written to {manifest_path} (TODO text, replace it)")
    print(f"Project config set to \"channel\": \"demo\", {size['width']}x{size['height']}")
    print(f"Next: fill the manifest, then: demo_build_scenes {args.project}, review_video, voiceover, demo_finalize_storyboard, render")
    return 0


if __name__ == "__main__":
    sys.exit(main())
