"""Scaffold a composed story: several style-bundle videos (chapters) joined into one film.

Usage:
    python scripts/compose_new_story.py <story> --chapters lowpoly:intro,markets:anatomy,lowpoly:steps [--voice VOICE]
                                        [--size 1920x1080] [--fps 30] [--transition fade|cut]

An ``isofigure`` chapter is an interactive figure recorded to video from its ``tour.json``. Each chapter is its own project ``<story>__<chapter>`` in its own style bundle (so the bundles stay unmixed and the
guard hook is satisfied). A chapter spec is ``<bundle>:<id>``, or ``file:<id>`` for an mp4 you made elsewhere (for
example a screen capture of an Isofigure). The script creates each chapter project, runs that bundle's
``<bundle>_new_video.py``, gives every chapter the same TTS voice, and writes ``projects/<story>/story.json``.
Next: write the story, then ``python scripts/compose_build.py <story>``. See docs/compose_story_guide.md.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
BUNDLES = ("lowpoly", "isofigure", "markets", "promo", "launch", "lyric", "leaderbot", "demo", "storybook")
# Bundles whose scaffold needs more than a project id: the project is created, the bundle skill scaffolds it by hand.
MANUAL_SCAFFOLD = {"demo": "demo_new_video.py <project> --screenshots DIR --name NAME"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("story")
    parser.add_argument("--chapters", required=True, help="Comma list of <bundle>:<id> (bundle is one of %s, or file)" % ", ".join(BUNDLES))
    parser.add_argument("--voice", default="", help="TTS voice id shared by every chapter (default: provider default)")
    parser.add_argument("--provider", default="edge", help="TTS provider shared by every chapter (default: edge)")
    parser.add_argument("--size", default="1920x1080", help="Output size WxH (landscape 1920x1080 or portrait 1080x1920)")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--transition", choices=["fade", "cut"], default="fade")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = parser.parse_args(argv)

    if not re.fullmatch(r"[a-z0-9_]+", args.story):
        print("Story id must be lowercase letters, digits and underscores", file=sys.stderr)
        return 1
    width, height = (int(x) for x in args.size.lower().split("x"))
    projects = Path(args.projects_dir)
    story_dir = projects / args.story
    if (story_dir / "story.json").exists():
        print(f"{story_dir / 'story.json'} exists; edit it by hand", file=sys.stderr)
        return 1

    chapters = []
    env = {**os.environ, "PYTHONUTF8": "1"}
    for spec in args.chapters.split(","):
        bundle, _, cid = spec.strip().partition(":")
        if not cid or not re.fullmatch(r"[a-z0-9_]+", cid) or bundle not in (*BUNDLES, "file"):
            print(f"Bad chapter spec {spec!r}: use <bundle>:<id> with bundle in {BUNDLES} or file", file=sys.stderr)
            return 1
        if any(c["id"] == cid for c in chapters):
            print(f"Duplicate chapter id {cid!r}", file=sys.stderr)
            return 1
        entry: dict = {"id": cid, "bundle": bundle, "title": cid.replace("_", " ").title()}
        if bundle == "file":
            entry["file"] = f"chapters/{cid}.mp4"
        else:
            project = f"{args.story}__{cid}"
            entry["project"] = project
            if not (projects / project / "config.json").exists():
                subprocess.run([sys.executable, "-m", "src.cli", "--projects-dir", str(projects), "create", project, "--title", f"{args.story}: {cid}"],
                               check=True, cwd=REPO_ROOT, env=env, stdout=subprocess.DEVNULL)
            if bundle in MANUAL_SCAFFOLD:
                print(f"  {cid}: scaffold it yourself: python scripts/{MANUAL_SCAFFOLD[bundle].replace('<project>', project)}")
            else:
                scaffold = "isofigure_new_figure.py" if bundle == "isofigure" else f"{bundle}_new_video.py"
                subprocess.run([sys.executable, str(REPO_ROOT / "scripts" / scaffold), project, "--projects-dir", str(projects), "--force"],
                               check=True, cwd=REPO_ROOT, env=env, stdout=subprocess.DEVNULL)
            cfg_path = projects / project / "config.json"
            cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
            cfg.setdefault("tts", {})["provider"] = args.provider
            cfg["tts"]["voice_id"] = args.voice
            cfg_path.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
        chapters.append(entry)

    (story_dir / "chapters").mkdir(parents=True, exist_ok=True)
    (story_dir / "story.json").write_text(json.dumps({
        "title": args.story.replace("_", " ").title(),
        "voice": args.voice,
        "provider": args.provider,
        "target": {"width": width, "height": height, "fps": args.fps},
        "fit": "blur-pad",
        "transition": {"style": args.transition, "seconds": 0.5},
        "chapters": chapters,
    }, indent=2), encoding="utf-8")
    print(f"Story scaffolded in {story_dir / 'story.json'} with {len(chapters)} chapters")
    for c in chapters:
        print(f"  {c['id']:<14} {c['bundle']:<10} {c.get('project') or c.get('file')}")
    print(f"Next: write each chapter (its bundle skill), then: python scripts/compose_build.py {args.story}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
