"""Scaffold a Comic style bundle project from a comic page image.

Usage:
    python scripts/comic_new_comic.py <project> --page PAGE.(png|jpg|webp) [--title "Title"]
        [--panels panels.json] [--margin 4] [--megapixels 0.64] [--seed 20260926] [--no-lora] [--force]

Writes ``projects/<project>/comic/``:

- ``page.<ext>``: the page image (copied).
- ``comic.json``: title, page size, one entry per panel (``rect`` = ``[x0, y0, x1, y1]`` in page pixels: the
  area just inside the black frame, whose thickness is measured, so the viewer overlay meets the frame with no
  seam) and the ``bubbles`` list (empty; fill it by hand).
- ``refs/<id>.png``: the reference image for each panel, cropped ``--margin`` px further inside the frame (so
  it holds no frame pixels), centre-cropped to the nearest aspect ratio ComfyUI's Resolution Selector
  offers, and upscaled to about ``--megapixels``.
- ``jobs.json``: one generation job per panel for ``scripts/comic_orbit_comfy.mjs``.
- ``orbit_caption.txt``: the ORB360 orbit caption (downloaded from the official Hugging Face repo unless
  ``--caption FILE`` is given).

Panels are found automatically when the layout is made of rectangles separated by white gutters (manga and
comic pages usually are); a page without such gutters is read as a single panel and a warning says so. For any
other layout pass ``--panels``: a json list of ``{"id": "p1", "rect": [x0, y0, x1, y1]}`` with the frame included
(the frame thickness is measured for you). Ids are 1 to 32 letters, digits, ``_`` or ``-`` (they become file
names) and every rectangle must lie inside the page. Check ``refs/`` by eye before generating: the reference
defines what the orbit shows.

Running it again on an existing project needs ``--force``. That regenerates ``comic.json``, ``jobs.json`` and the
references, but keeps the ``bubbles`` and each panel's ``seed`` and ``lora`` setting; jobs you deleted come back,
and ``--seed`` (when given) overrides every seed. Clips in ``clips/`` are never touched.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import sys
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parents[1]

# Resolution Selector options of ComfyUI (aspect label, width / height).
ASPECTS = [
    ("1:1 (Square)", 1.0),
    ("2:3 (Portrait Photo)", 2 / 3),
    ("3:2 (Photo)", 3 / 2),
    ("3:4 (Portrait Standard)", 3 / 4),
    ("4:3 (Standard)", 4 / 3),
    ("9:16 (Portrait Widescreen)", 9 / 16),
    ("16:9 (Widescreen)", 16 / 9),
    ("21:9 (Ultrawide)", 21 / 9),
]
CAPTION_URL = (
    "https://huggingface.co/MATLOWAI/MiniMax-H3-ORB360-CardSpin/resolve/main/prompts/orbit_realscene_caption.txt"
)
LIGHT = 235          # a pixel is gutter (white) when all channels are above this
LIGHT_ROW = 0.985    # a row or column is a gutter when this share of it is light
MIN_GUTTER = 3       # px
MIN_PANEL = 40       # px
MAX_FRAME = 8        # px; a measured frame thicker than this is dark picture content touching the frame
ID_RE = re.compile(r"^[A-Za-z0-9_-]{1,32}$")   # ids become file and folder names
FEATHER = 2          # px added to the measured frame so the overlay clears its soft inner edge


def _bands(light: np.ndarray) -> list[tuple[int, int]]:
    """Runs of non-gutter lines in a 1-D boolean 'is gutter' profile, as [start, end) pairs."""
    out, start = [], None
    n = len(light)
    i = 0
    while i < n:
        if not light[i]:
            if start is None:
                start = i
            i += 1
            continue
        j = i
        while j < n and light[j]:
            j += 1
        if (j - i >= MIN_GUTTER or i == 0 or j == n) and start is not None:
            out.append((start, i))
            start = None
        i = j
    if start is not None:
        out.append((start, n))
    return [(a, b) for a, b in out if b - a >= MIN_PANEL]


def detect_panels(img: Image.Image) -> list[list[int]]:
    """Find panel rectangles (frame included) in reading order, top to bottom then left to right."""
    rgb = np.asarray(img.convert("RGB"))
    light = (rgb > LIGHT).all(axis=2)

    def walk(x0: int, y0: int, x1: int, y1: int, depth: int = 0) -> list[list[int]]:
        sub = light[y0:y1, x0:x1]
        rows = _bands(sub.mean(axis=1) > LIGHT_ROW)
        if len(rows) > 1:
            return [r for a, b in rows for r in walk(x0, y0 + a, x1, y0 + b, depth + 1)]
        ya, yb = rows[0] if rows else (0, y1 - y0)
        cols = _bands(light[y0 + ya:y0 + yb, x0:x1].mean(axis=0) > LIGHT_ROW)
        if len(cols) > 1 and depth < 8:
            return [r for a, b in cols for r in walk(x0 + a, y0 + ya, x0 + b, y0 + yb, depth + 1)]
        xa, xb = cols[0] if cols else (0, x1 - x0)
        return [[x0 + xa, y0 + ya, x0 + xb, y0 + yb]]

    return walk(0, 0, rgb.shape[1], rgb.shape[0])


def frame_thickness(img: Image.Image, frame: list[int], dark: int = 90, reach: int = 24) -> tuple[int, int, int, int]:
    """Thickness in px of the dark panel frame on the (top, right, bottom, left) edges of ``frame``.

    Walks inward from each edge along five lines (20 to 80 percent of the edge), skips the light anti-aliased fringe,
    and measures to the end of the dark run (so the fringe counts as frame). The median is used so a dark picture
    detail touching the frame does not count as frame.
    """
    gray = np.asarray(img.convert("L"))
    x0, y0, x1, y1 = frame
    out = []
    for edge in ("top", "right", "bottom", "left"):
        counts = []
        for f in (0.2, 0.35, 0.5, 0.65, 0.8):
            line = []
            for d in range(reach):
                if edge == "top":
                    line.append(gray[y0 + d, x0 + int((x1 - x0) * f)])
                elif edge == "bottom":
                    line.append(gray[y1 - 1 - d, x0 + int((x1 - x0) * f)])
                elif edge == "left":
                    line.append(gray[y0 + int((y1 - y0) * f), x0 + d])
                else:
                    line.append(gray[y0 + int((y1 - y0) * f), x1 - 1 - d])
            # Skip the light anti-aliased fringe at the very edge, then follow the dark run to its end.
            first = next((i for i, v in enumerate(line) if v < dark), None)
            if first is None or first > 6:
                counts.append(0)
                continue
            end = first
            while end < reach and line[end] < dark:
                end += 1
            counts.append(end)
        out.append(min(int(np.median(counts)), MAX_FRAME))
    return out[0], out[1], out[2], out[3]


def nearest_aspect(ratio: float) -> tuple[str, float]:
    return min(ASPECTS, key=lambda a: abs(math.log(ratio / a[1])))


def crop_reference(img: Image.Image, rect: list[int], ratio: float, megapixels: float) -> Image.Image:
    """Centre-crop ``rect`` to exactly ``ratio`` (w / h) and resize to about ``megapixels`` (multiples of 32)."""
    x0, y0, x1, y1 = rect
    w, h = x1 - x0, y1 - y0
    if w / h > ratio:      # too wide: trim the sides
        nw = round(h * ratio)
        x0 += (w - nw) // 2
        w = nw
    else:                  # too tall: trim top and bottom
        nh = round(w / ratio)
        y0 += (h - nh) // 2
        h = nh
    crop = img.crop((x0, y0, x0 + w, y0 + h))
    tw = max(64, round(math.sqrt(megapixels * 1e6 * ratio) / 32) * 32)
    th = max(64, round(math.sqrt(megapixels * 1e6 / ratio) / 32) * 32)
    return crop.resize((tw, th), Image.LANCZOS)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project", help="Project id (folder under projects/)")
    parser.add_argument("--page", required=True, help="Comic page image (png, jpg or webp)")
    parser.add_argument("--title", help="Comic title (default: the project id)")
    parser.add_argument("--panels", help="json file with the panel rectangles instead of auto-detection")
    parser.add_argument("--margin", type=int, default=4,
                        help="px to trim from the reference inside the measured frame (default 4)")
    parser.add_argument("--megapixels", type=float, default=0.64, help="reference and generation size (default 0.64)")
    parser.add_argument("--seed", type=int, help="seed for every job (default 20260926, or the one already in jobs.json)")
    parser.add_argument("--no-lora", action="store_true", help="plain Omni graph, without the ORB360 LoRA")
    parser.add_argument("--caption", help="orbit caption file (default: download the official one)")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--force", action="store_true",
                        help="Regenerate an existing comic.json, jobs.json and references. Keeps the bubbles and each "
                             "panel's seed and LoRA setting; deleted jobs come back")
    args = parser.parse_args(argv)

    if not ID_RE.match(args.project):
        print(f"Invalid project id {args.project!r}: use 1 to 32 letters, digits, '_' or '-'", file=sys.stderr)
        return 1
    page_src = Path(args.page)
    if not page_src.exists():
        print(f"Page image not found: {page_src}", file=sys.stderr)
        return 1
    out = Path(args.projects_dir) / args.project / "comic"
    if (out / "comic.json").exists() and not args.force:
        print(f"{out / 'comic.json'} exists (use --force to regenerate it)", file=sys.stderr)
        return 1

    img = Image.open(page_src)
    img.load()

    if args.panels:
        raw = json.loads(Path(args.panels).read_text(encoding="utf-8"))
        found = [(p["id"], p["rect"]) for p in raw]
        bad_ids = [pid for pid, _ in found if not isinstance(pid, str) or not ID_RE.match(pid)]
        if bad_ids:
            print(f"Invalid panel id(s) {bad_ids}: use 1 to 32 letters, digits, '_' or '-'", file=sys.stderr)
            return 1
        if len({pid for pid, _ in found}) != len(found):
            print("Duplicate panel ids in --panels", file=sys.stderr)
            return 1
        for pid, rect in found:
            x0, y0, x1, y1 = rect
            if not (0 <= x0 < x1 <= img.width and 0 <= y0 < y1 <= img.height):
                print(f"{pid}: rect {rect} is not inside the {img.width}x{img.height} page", file=sys.stderr)
                return 1
    else:
        found = [(f"p{i + 1}", r) for i, r in enumerate(detect_panels(img))]
        if len(found) == 1:
            print("WARNING: found a single panel. The page has no white gutters between panels, or its "
                  "background is not white. Pass --panels with the rectangles if that is wrong.", file=sys.stderr)
    if not found:
        print("No panels given in --panels", file=sys.stderr)
        return 1

    # Keep what a person may have edited by hand when the project is regenerated.
    old_bubbles, old_jobs = [], {}
    if args.force:
        try:
            old_bubbles = json.loads((out / "comic.json").read_text(encoding="utf-8")).get("bubbles", [])
            old_jobs = {j["id"]: j for j in json.loads((out / "jobs.json").read_text(encoding="utf-8"))}
        except (OSError, ValueError, KeyError):
            pass

    out.mkdir(parents=True, exist_ok=True)
    page_name = "page" + page_src.suffix.lower()
    shutil.copyfile(page_src, out / page_name)

    refs = out / "refs"
    refs.mkdir(exist_ok=True)
    panels, jobs = [], []
    for pid, (x0, y0, x1, y1) in found:
        t, r, b, l = frame_thickness(img, [x0, y0, x1, y1])
        rect = [x0 + l + FEATHER, y0 + t + FEATHER, x1 - r - FEATHER, y1 - b - FEATHER]   # just inside the frame: the overlay
        m = args.margin
        ref_rect = [rect[0] + m, rect[1] + m, rect[2] - m, rect[3] - m]
        if ref_rect[2] - ref_rect[0] < MIN_PANEL or ref_rect[3] - ref_rect[1] < MIN_PANEL:
            print(f"{pid}: panel too small after the frame, skipped", file=sys.stderr)
            continue
        label, ratio = nearest_aspect((rect[2] - rect[0]) / (rect[3] - rect[1]))
        ref = crop_reference(img, ref_rect, ratio, args.megapixels)
        ref.save(refs / f"{pid}.png")
        panels.append({"id": pid, "rect": rect, "frame_rect": [x0, y0, x1, y1], "frame_px": [t, r, b, l],
                       "aspect": label})
        prev = old_jobs.get(pid, {})
        jobs.append({
            "id": pid, "image": f"refs/{pid}.png", "aspect": label, "megapixels": args.megapixels,
            "seed": args.seed if args.seed is not None else prev.get("seed", 20260926),
            "lora": (not args.no_lora) and prev.get("lora", True), "out": f"clips/{pid}.mp4",
        })
        print(f"{pid}: frame {t},{r},{b},{l} px  rect {rect}  aspect {label}  reference {ref.width}x{ref.height}")

    comic = {
        "title": args.title or args.project,
        "page": page_name,
        "page_size": [img.width, img.height],
        "panels": panels,
        "bubbles": old_bubbles,
    }
    (out / "comic.json").write_text(json.dumps(comic, ensure_ascii=False, indent=2), encoding="utf-8")
    (out / "jobs.json").write_text(json.dumps(jobs, indent=2), encoding="utf-8")
    (out / "clips").mkdir(exist_ok=True)

    caption = out / "orbit_caption.txt"
    if args.caption:
        shutil.copyfile(args.caption, caption)
    elif not caption.exists():
        try:
            with urllib.request.urlopen(CAPTION_URL, timeout=30) as resp:
                caption.write_bytes(resp.read())
        except OSError as exc:
            print(f"Could not download the orbit caption ({exc}); pass --caption FILE", file=sys.stderr)
    if old_bubbles:
        print(f"Kept {len(old_bubbles)} bubble(s) from the previous comic.json")
    print(f"Project scaffolded in {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
