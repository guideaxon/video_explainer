"""Pre-render review for a full-video project (Markets, Promo, Launch, Lyric).

Usage:
    python scripts/review_video.py <project> [--brief] [--projects-dir DIR]

Run it after the scenes and narration are edited and BEFORE ``voiceover`` (TTS and render are the slow
steps). It runs deterministic hard checks and exits 1 on any ERROR; WARN lines are advice. With
``--brief`` it also prints a review bundle (narration, on-screen text, style-guide copy rules) for the
reviewer (Claude) to check claims and tone; see ``docs/video_review_checklist.md``.

Hard checks cannot verify that data is true. They only catch what a script can: leftover SAMPLE text,
registry key/title mismatches, narration length, missing channel disclaimers.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from src.cli.main import _title_to_scene_key  # noqa: E402

# words: allowed spoken words per scene (None = not checked); required: phrases (any case) that must appear
# somewhere in the scene text or narration. Mirrors each channel style guide, section "Copy and data rules".
CHANNELS: dict[str, dict] = {
    "markets": {"words": (8, 14), "required": ["not financial advice"]},
    "promo": {"words": (4, 10), "required": []},
    "launch": {"words": (5, 12), "required": []},
    "lyric": {"words": None, "required": []},
    "leaderbot": {"words": (6, 12), "required": ["not business advice"], "headline_chars": 10},
}
# SAMPLE/TODO/FIXME are template tags (upper case only, whole word) so real copy like "free sample" or "Todoist" passes.
PLACEHOLDER = re.compile(r"(?-i:\b(?:SAMPLE|TODO|FIXME)\b)|(?i:lumenstage\.example|\bplaceholder\b|lorem ipsum)")


def _strip_comments(source: str) -> str:
    """Remove /* */ and // comments so notes in a scene file are not read as on-screen text."""
    no_block = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
    return re.sub(r"(?<![:\w])//[^\n]*", "", no_block)



class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, msg: str) -> None:
        self.errors.append(msg)

    def warn(self, msg: str) -> None:
        self.warnings.append(msg)


def _registry_entries(index_ts: str) -> list[tuple[str, str]]:
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index_ts, re.S)
    return re.findall(r"^\s*(\w+):\s*(\w+),?", block.group(1), re.M) if block else []


def _scene_text(source: str) -> list[str]:
    """Rough on-screen strings from a TSX scene: JSX text nodes and quoted string literals."""
    jsx = re.findall(r">\s*([^<>{}\n][^<>{}]*?)\s*<", source)
    quoted = re.findall(r"""["'`]([^"'`\n]{3,})["'`]""", source)
    keep = [s.strip() for s in jsx + quoted if re.search(r"[A-Za-z]{3}", s)]
    # Drop code noise: module paths and bare lowercase identifiers or props (tone names, "react", "suffix=").
    return [s for s in keep if "@" not in s and not re.fullmatch(r"[a-z_]+=?", s)]


def review(project_dir: Path) -> tuple[Report, dict]:
    rep = Report()
    config = json.loads((project_dir / "config.json").read_text(encoding="utf-8"))
    channel = config.get("channel")
    rules = CHANNELS.get(channel)
    if rules is None:
        rep.error(f"config.json channel is {channel!r}; expected one of {sorted(CHANNELS)}")
        return rep, {}

    res = config.get("video", {}).get("resolution", {})
    if (res.get("width"), res.get("height")) != (1080, 1920):
        rep.error(f"video.resolution is {res}; full videos must be 1080x1920 portrait")

    narration_path = project_dir / "narration" / "narrations.json"
    if not narration_path.exists():
        rep.error("narration/narrations.json is missing")
        return rep, {}
    scenes = json.loads(narration_path.read_text(encoding="utf-8")).get("scenes", [])

    scenes_dir = project_dir / "scenes"
    index_path = scenes_dir / "index.ts"
    if not index_path.exists():
        rep.error("scenes/index.ts is missing")
        return rep, {}
    entries = _registry_entries(index_path.read_text(encoding="utf-8"))
    keys = {k for k, _ in entries}
    for key, component in entries:
        if not component.endswith("Scene"):
            rep.error(f"registry component {component!r} must end in 'Scene' (key {key!r})")

    for i, s in enumerate(scenes, 1):
        if not s.get("title"):
            rep.error(f"narration scene {i} has no title")
    scenes = [s for s in scenes if s.get("title")]
    titles = [s["title"] for s in scenes]
    wanted = [_title_to_scene_key(t) for t in titles]
    for title, key in zip(titles, wanted):
        if key not in keys:
            rep.error(f"scene {title!r} needs registry key {key!r} in scenes/index.ts")
    for key in sorted(keys - set(wanted)):
        rep.warn(f"registry key {key!r} has no narration scene (unused scene or stale title)")
    if len(set(wanted)) != len(wanted):
        rep.error("two scene titles map to the same registry key")

    # Narration length per scene.
    if rules["words"]:
        lo, hi = rules["words"]
        for s in scenes:
            n = len(s.get("narration", "").split())
            if not lo <= n <= hi:
                rep.warn(f"{s['title']!r}: {n} spoken words (style guide: {lo} to {hi})")

    # Leftover template placeholders in narration and on-screen text.
    screen: dict[str, list[str]] = {}
    for tsx in sorted(scenes_dir.glob("*.tsx")):
        source = _strip_comments(tsx.read_text(encoding="utf-8"))
        texts = _scene_text(source)
        screen[tsx.stem] = texts
        if rules.get("headline_chars"):
            # Limit is for the default 112 px headline; a smaller `size` prop allows proportionally more.
            for tag in re.findall(r"<Headline\b(.*?)/>", source, re.S):
                size = re.search(r"size=\{(\d+)\}", tag)
                limit = int(rules["headline_chars"] * 112 / int(size.group(1))) if size else rules["headline_chars"]
                block = re.search(r"lines=\{\[(.*?)\]\}", tag, re.S)
                for line in re.findall(r'"([^"]+)"', block.group(1)) if block else []:
                    if len(line.lstrip("*")) > limit:
                        rep.warn(f"{tsx.name}: headline line {line!r} is over {limit} chars and may wrap")
        # The tag's "SAMPLE ..." text lives in the kit, so look for the component itself.
        if re.search(r"<SampleTag\b", source):
            rep.error(f"{tsx.name}: <SampleTag /> still present (remove it only when the data is real and sourced)")
        for t in texts:
            if PLACEHOLDER.search(t):
                rep.error(f"{tsx.name}: placeholder text left in: {t[:70]!r}")
    for s in scenes:
        if PLACEHOLDER.search(s.get("narration", "")):
            rep.error(f"narration for {s['title']!r} contains placeholder text")

    # Channel-required phrases (e.g. Markets disclaimer).
    haystack = " ".join(t for ts in screen.values() for t in ts) + " " + " ".join(s.get("narration", "") for s in scenes)
    for phrase in rules["required"]:
        if phrase.lower() not in haystack.lower():
            rep.error(f"required phrase missing from scenes and narration: {phrase!r}")

    bundle = {"channel": channel, "scenes": scenes, "screen_text": screen}
    return rep, bundle


def print_brief(bundle: dict) -> None:
    guide = REPO_ROOT / "docs" / f"{bundle['channel']}_video_style_guide.md"
    print("\n=== REVIEW BRIEF (for the reviewer) ===")
    print(f"Channel: {bundle['channel']}. Style guide: {guide.relative_to(REPO_ROOT)} (copy and data rules).")
    print("Checklist: docs/video_review_checklist.md. Report per issue: scene, original text, suggested fix.\n")
    print("-- Narration --")
    for s in bundle["scenes"]:
        print(f"[{s['title']}] {s.get('narration', '')}")
    print("\n-- On-screen text (per scene file) --")
    for name, texts in bundle["screen_text"].items():
        print(f"[{name}] " + " | ".join(dict.fromkeys(texts)))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--brief", action="store_true", help="also print the claims/tone review bundle")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    if not (project_dir / "config.json").exists():
        print(f"Project not found: {project_dir}", file=sys.stderr)
        return 1

    rep, bundle = review(project_dir)
    for w in rep.warnings:
        print(f"WARN  {w}")
    for e in rep.errors:
        print(f"ERROR {e}")
    print(f"{len(rep.errors)} error(s), {len(rep.warnings)} warning(s)")
    if args.brief and bundle:
        print_brief(bundle)
    return 1 if rep.errors else 0


if __name__ == "__main__":
    sys.exit(main())
