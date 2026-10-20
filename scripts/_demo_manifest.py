"""Shared helpers for the Demo channel: manifest load/validate, screenshot analysis, scene generation.

``projects/<p>/manifest.json`` is the single source of truth for a demo video (brand, scenes, narration,
focus regions, cursor). ``write_scenes`` turns it into ``scenes/*.tsx``, ``scenes/index.ts`` and
``narration/narrations.json``, so a video never needs hand-written scene code.
"""

from __future__ import annotations

import colorsys
import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from src.cli.main import _title_to_scene_key  # noqa: E402

IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp"}
DEVICES = {"phone", "tablet", "laptop", "none"}
KINDS = {"intro", "step", "outro"}
DEFAULT_ACCENT = "#4d7cff"
WORDS_PER_SECOND = 2.3


def load_manifest(project_dir: Path) -> dict:
    return json.loads((project_dir / "manifest.json").read_text(encoding="utf-8"))


def scene_key(title: str) -> str:
    return _title_to_scene_key(title)


def component_name(key: str) -> str:
    return "".join(part.capitalize() for part in key.split("_")) + "Scene"


# ---------------------------------------------------------------- screenshot analysis


def guess_device(aspect: float) -> str:
    """Device frame from the screenshot's width/height ratio."""
    return "phone" if aspect < 0.7 else "tablet" if aspect < 1.15 else "laptop"


def analyze_image(path: Path) -> dict:
    """Size, aspect, device guess, mean luminance and the dominant saturated colour of a screenshot.

    Why Pillow: it is the only dependency that decodes png/jpg/webp screenshots, reads their pixel size (for the
    aspect ratio that picks the device frame and stops stretching) and downsamples them to a 160 px thumbnail,
    so the colour analysis stays fast on 4K captures.
    How numpy is used: the thumbnail becomes an (N, 3) float array of RGB pixels, and vectorised maths then
    computes (1) mean luminance (Rec. 709 weights) to choose the light or dark theme, (2) per-pixel saturation
    and brightness to keep only vivid pixels (skipping greys, text and shadows), and (3) a saturation-weighted
    histogram of 24 hue bins whose winning bin is averaged into the brand accent colour.
    """
    import numpy as np
    from PIL import Image

    with Image.open(path) as im:
        width, height = im.size
        small = im.convert("RGB")
        small.thumbnail((160, 160))
    px = np.asarray(small, dtype=np.float32).reshape(-1, 3) / 255.0
    luminance = float((0.2126 * px[:, 0] + 0.7152 * px[:, 1] + 0.0722 * px[:, 2]).mean())
    mx, mn = px.max(axis=1), px.min(axis=1)
    sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    keep = (sat > 0.45) & (mx > 0.35)  # vivid pixels only: skip greys, text and shadows
    accent = None
    if keep.sum() >= 30:
        hues = np.array([colorsys.rgb_to_hsv(*c)[0] for c in px[keep]])
        bins = np.minimum((hues * 24).astype(int), 23)
        weights = np.bincount(bins, weights=sat[keep], minlength=24)
        top = int(weights.argmax())
        sel = px[keep][bins == top].mean(axis=0)
        accent = "#%02x%02x%02x" % tuple(int(round(v * 255)) for v in sel)
    aspect = round(width / height, 4)
    return {"width": width, "height": height, "aspect": aspect, "device": guess_device(aspect), "luminance": luminance, "accent": accent}


def pick_brand_style(analyses: list[dict]) -> tuple[str, str]:
    """(accent, theme) from several screenshots: most common accent family, majority light/dark."""
    accents = [a["accent"] for a in analyses if a.get("accent")]
    accent = max(set(accents), key=accents.count) if accents else DEFAULT_ACCENT
    theme = "light" if sum(a["luminance"] > 0.55 for a in analyses) > len(analyses) / 2 else "dark"
    return accent, theme


# ---------------------------------------------------------------- validation


def _rect_problem(name: str, rect, rep: list[str], scene: str) -> None:
    if not isinstance(rect, dict) or not all(isinstance(rect.get(k), (int, float)) for k in ("x", "y", "w", "h")):
        rep.append(f"{scene}: {name} needs numeric x, y, w, h (0 to 1)")
        return
    x, y, w, h = rect["x"], rect["y"], rect["w"], rect["h"]
    if w <= 0 or h <= 0 or x < 0 or y < 0 or x + w > 1.0001 or y + h > 1.0001:
        rep.append(f"{scene}: {name} {rect} must stay inside the screenshot (x, y >= 0, x+w and y+h <= 1)")


def validate_manifest(manifest: dict, project_dir: Path) -> tuple[list[str], list[str]]:
    """(errors, warnings) for a manifest. Pure file/shape checks; it cannot verify the claims."""
    errors: list[str] = []
    warnings: list[str] = []
    brand = manifest.get("brand") or {}
    if not brand.get("name"):
        errors.append("brand.name is missing")
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(brand.get("accent", ""))):
        errors.append(f"brand.accent {brand.get('accent')!r} must be a 6-digit hex colour like #4d7cff")
    if brand.get("theme") not in ("dark", "light"):
        errors.append("brand.theme must be 'dark' or 'light'")
    if brand.get("logo") and not (project_dir / brand["logo"]).exists():
        errors.append(f"brand.logo file not found: {brand['logo']}")

    scenes = manifest.get("scenes") or []
    if not scenes:
        errors.append("manifest has no scenes")
        return errors, warnings
    steps = [s for s in scenes if s.get("kind") == "step"]
    if not steps:
        errors.append("manifest needs at least one scene with kind 'step'")
    if scenes[0].get("kind") != "intro":
        warnings.append("first scene is not an intro")
    if scenes[-1].get("kind") != "outro":
        warnings.append("last scene is not an outro")

    seen: dict[str, str] = {}
    for i, s in enumerate(scenes, 1):
        title = s.get("title", "")
        label = f"scene {i} ({title!r})"
        if s.get("kind") not in KINDS:
            errors.append(f"{label}: kind must be one of {sorted(KINDS)}")
        if not title:
            errors.append(f"scene {i}: title is missing")
            continue
        key = scene_key(title)
        if not key:
            errors.append(f"{label}: title gives an empty registry key")
        elif key in seen:
            errors.append(f"{label}: title maps to the same registry key {key!r} as {seen[key]!r}")
        seen[key] = title
        if not s.get("narration", "").strip():
            errors.append(f"{label}: narration is empty")
        if s.get("kind") == "step":
            shot = s.get("screenshot")
            if not shot:
                errors.append(f"{label}: step has no screenshot")
            elif not (project_dir / shot).exists():
                errors.append(f"{label}: screenshot not found: {shot}")
            else:
                try:
                    actual = analyze_image(project_dir / shot)["aspect"]
                    if abs(actual / float(s.get("aspect", actual)) - 1) > 0.02:
                        warnings.append(f"{label}: aspect {s.get('aspect')} differs from the file ({actual}); the image will look stretched")
                except Exception as exc:  # corrupt or unsupported image
                    errors.append(f"{label}: cannot read screenshot {shot}: {exc}")
            if not s.get("aspect"):
                errors.append(f"{label}: aspect (width/height of the screenshot) is missing")
            if s.get("device") and s["device"] not in DEVICES:
                errors.append(f"{label}: device must be one of {sorted(DEVICES)}")
            for name in ("focus", "highlight"):
                if s.get(name) is not None:
                    _rect_problem(name, s[name], errors, label)
            cur = s.get("cursor")
            if cur is not None:
                for pt in [cur.get("to")] + ([cur["from"]] if cur.get("from") else []):
                    if not (isinstance(pt, list) and len(pt) == 2 and all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in pt)):
                        errors.append(f"{label}: cursor points must be [x, y] within 0 to 1, got {pt}")
            if not s.get("caption"):
                warnings.append(f"{label}: no on-screen caption (the video must read when muted)")
    return errors, warnings


# ---------------------------------------------------------------- generation


def estimate_seconds(narration: str) -> float:
    return round(max(3.0, len(narration.split()) / WORDS_PER_SECOND + 1.0), 1)


def write_scenes(project_dir: Path, manifest: dict) -> list[tuple[str, str, str]]:
    """Generate scenes/*.tsx, scenes/index.ts and narration/narrations.json. Returns (key, title, component)."""
    scenes_dir = project_dir / "scenes"
    scenes_dir.mkdir(parents=True, exist_ok=True)
    for stale in scenes_dir.glob("*.tsx"):
        stale.unlink()  # scenes are generated: the manifest is the source of truth

    entries: list[tuple[str, str, str]] = []
    narration = []
    for i, s in enumerate(manifest["scenes"]):
        key = scene_key(s["title"])
        comp = component_name(key)
        entries.append((key, s["title"], comp))
        (scenes_dir / f"{key}.tsx").write_text(
            "// Generated by scripts/demo_build_scenes.py from manifest.json. Edit the manifest, not this file.\n"
            'import React from "react";\n'
            'import { DemoScene, DemoManifest } from "@remotion-components/demo/kit";\n'
            'import rawManifest from "../manifest.json";\n\n'
            "const manifest = rawManifest as unknown as DemoManifest;\n"
            f"export const {comp}: React.FC<{{ startFrame?: number }}> = () => <DemoScene manifest={{manifest}} index={{{i}}} />;\n"
            f"export default {comp};\n",
            encoding="utf-8",
        )
        narration.append(
            {"scene_id": key, "title": s["title"], "duration_seconds": estimate_seconds(s["narration"]), "narration": s["narration"]}
        )

    imports = "\n".join(f'import {c} from "./{k}";' for k, _, c in entries)
    registry = "\n".join(f"  {k}: {c}," for k, _, c in entries)
    (scenes_dir / "index.ts").write_text(
        "/**\n * Demo channel scene registry (generated by scripts/demo_build_scenes.py). Keys equal the slug of each\n"
        " * scene title; component names end in \"Scene\" because the storyboard CLI and render-utils.mjs parse this\n"
        " * registry with regexes.\n */\n\n"
        'import React from "react";\n\n'
        f"{imports}\n\n"
        "export type SceneComponent = React.FC<{ startFrame?: number }>;\n\n"
        f"const SCENE_REGISTRY: Record<string, SceneComponent> = {{\n{registry}\n}};\n\n"
        "// Standard export name for the build system (required by remotion/src/scenes/index.ts)\n"
        "export const PROJECT_SCENES = SCENE_REGISTRY;\n\n"
        "export function getScene(type: string): SceneComponent | undefined {\n  return SCENE_REGISTRY[type];\n}\n\n"
        "export function getAvailableSceneTypes(): string[] {\n  return Object.keys(SCENE_REGISTRY);\n}\n",
        encoding="utf-8",
    )

    narration_path = project_dir / "narration" / "narrations.json"
    narration_path.parent.mkdir(parents=True, exist_ok=True)
    narration_path.write_text(json.dumps({"scenes": narration}, indent=2), encoding="utf-8")
    return entries
