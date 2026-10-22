"""Build a static rotatable-comic bundle from a page image and per-panel orbit clips.

Usage:
    python scripts/comic_build_bundle.py <project> [--quality 3]
    python scripts/comic_build_bundle.py <spec.json> --out DIR [--quality 3]

With a project id it reads ``projects/<project>/comic/comic.json`` (from ``comic_new_comic.py``), uses
``clips/<panel id>.mp4`` for every panel that has one and writes ``projects/<project>/comic/bundle/``. A
panel without a clip stays a static part of the page. With a spec path (a name ending in ``.json``) the
files are given explicitly:

``spec.json``::

    {
      "title": "Desert Lighthouse",
      "page": "page.webp",                      # relative to the spec file
      "page_size": [1024, 1536],
      "panels": [
        {"id": "p1", "rect": [12, 8, 1013, 454]},                           # static panel
        {"id": "p3", "rect": [584, 479, 1013, 969], "video": "p3.mp4"}      # orbit clip
      ],
      "bubbles": [{"panel": "p2", "lines": ["..."], "x": 37, "y": 1, "w": 27, "h": 40}]
    }

``rect`` is ``[x0, y0, x1, y1]`` in page pixels. Bubble x, y, w, h are percentages of the panel.
Panel ids may only use letters, digits, ``_`` and ``-`` (they become folder names), and the page image and
the clips must live inside the spec's folder. Each ``video`` is decoded with ffmpeg (must be on PATH) into
``DIR/panels/<id>/0000.jpg ...``. The last frame of an orbit clip is the same view as the first, so the
viewer treats the turn as ``frames - 1`` long. The bundle is ``DIR/index.html`` (the manifest is inlined, so
it also opens from a file) plus the page image and the frame folders; frame folders of panels that no
longer have a clip are removed. It does not depend on the model that made the clips.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = REPO_ROOT / "templates" / "comic_viewer" / "index.html"
PLACEHOLDER = "__MANIFEST__"
PANEL_ID = re.compile(r"^[A-Za-z0-9_-]{1,32}$")


def _inside(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def _extract_frames(video: Path, out_dir: Path, quality: int) -> tuple[int, tuple[int, int]]:
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True)
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", str(video), "-q:v", str(quality), "-start_number", "0",
         str(out_dir / "%04d.jpg")],
        check=True,
    )
    frames = sorted(out_dir.glob("*.jpg"))
    if len(frames) < 2:
        raise RuntimeError(f"ffmpeg produced {len(frames)} frames from {video}")
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
         "-of", "csv=p=0", str(video)],
        check=True, capture_output=True, text=True,
    ).stdout.strip().split(",")
    return len(frames), (int(probe[0]), int(probe[1]))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("spec", help="Project id, or path to a spec json (a name ending in .json)")
    parser.add_argument("--out", help="Output bundle folder; default <project>/comic/bundle")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--quality", type=int, default=3, help="ffmpeg JPEG -q:v, 2 (best) to 31 (default 3)")
    args = parser.parse_args(argv)

    for tool in ("ffmpeg", "ffprobe"):
        if shutil.which(tool) is None:
            print(f"{tool} not found on PATH (install ffmpeg first)", file=sys.stderr)
            return 1

    is_spec_file = args.spec.lower().endswith(".json")
    spec_path = Path(args.spec) if is_spec_file else Path(args.projects_dir) / args.spec / "comic" / "comic.json"
    spec_path = spec_path.resolve()
    if not spec_path.exists():
        print(f"Spec not found: {spec_path} (run scripts/comic_new_comic.py first)", file=sys.stderr)
        return 1
    spec = json.loads(spec_path.read_text(encoding="utf-8"))
    base = spec_path.parent
    if args.out:
        out = Path(args.out)
    elif not is_spec_file:
        out = base / "bundle"
    else:
        print("--out is required with a spec path", file=sys.stderr)
        return 1

    ids = [p["id"] for p in spec["panels"]]
    bad = [i for i in ids if not isinstance(i, str) or not PANEL_ID.match(i)]
    if bad:
        print(f"Invalid panel id(s) {bad}: use 1 to 32 letters, digits, '_' or '-'", file=sys.stderr)
        return 1
    if len(set(ids)) != len(ids):
        print("Duplicate panel ids in the spec", file=sys.stderr)
        return 1

    page_src = base / spec["page"]
    if not _inside(page_src, base):
        print(f"Page image must be inside {base}: {spec['page']}", file=sys.stderr)
        return 1
    if not page_src.exists():
        print(f"Page image not found: {page_src}", file=sys.stderr)
        return 1

    # Resolve every clip before touching the output folder, so a bad spec changes nothing.
    videos: dict[str, Path | None] = {}
    for panel in spec["panels"]:
        rel = panel.get("video") or (f"clips/{panel['id']}.mp4" if (base / "clips" / f"{panel['id']}.mp4").exists() else None)
        video = base / rel if rel else None
        if video is not None and not _inside(video, base):
            print(f"Clip must be inside {base}: {rel}", file=sys.stderr)
            return 1
        if video is not None and not video.exists():
            print(f"Video not found: {video}", file=sys.stderr)
            return 1
        videos[panel["id"]] = video

    out.mkdir(parents=True, exist_ok=True)
    page_name = "page" + page_src.suffix.lower()
    for old in out.glob("page.*"):          # a page image of another extension from an earlier build
        if old.name != page_name and old.is_file():
            old.unlink()
    shutil.copyfile(page_src, out / page_name)

    panels_dir = out / "panels"
    if panels_dir.is_dir():                 # frame folders of panels that no longer have a clip
        for old in panels_dir.iterdir():
            if old.is_dir() and (old.name not in ids or videos.get(old.name) is None):
                shutil.rmtree(old)

    panels = []
    for panel in spec["panels"]:
        entry = {"id": panel["id"], "rect": panel["rect"], "frames": 0}
        video = videos[panel["id"]]
        if video is not None:
            count, size = _extract_frames(video, panels_dir / panel["id"], args.quality)
            entry["frames"] = count
            entry["frame_size"] = list(size)
            print(f"{panel['id']}: {count} frames {size[0]}x{size[1]}")
        panels.append(entry)

    manifest = {
        "title": spec.get("title", "Comic"),
        "page": page_name,
        "page_size": spec["page_size"],
        "panels": panels,
        "bubbles": spec.get("bubbles", []),
    }
    (out / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    html = TEMPLATE.read_text(encoding="utf-8")
    if PLACEHOLDER not in html:
        print(f"Template has no {PLACEHOLDER} placeholder: {TEMPLATE}", file=sys.stderr)
        return 1
    # "<" is escaped so a title can never close the script tag.
    inline = json.dumps(manifest, ensure_ascii=False).replace("<", "\\u003c")
    (out / "index.html").write_text(html.replace(PLACEHOLDER, inline), encoding="utf-8")
    size_mb = sum(f.stat().st_size for f in out.rglob("*") if f.is_file()) / 1e6
    print(f"Bundle written to {out} ({size_mb:.1f} MB)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
