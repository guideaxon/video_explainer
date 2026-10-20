"""Demo channel: manifest validation, screenshot analysis and scene generation."""

import json
import sys
from pathlib import Path

import pytest

from src.cli.main import _title_to_scene_key

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
PIL = pytest.importorskip("PIL")
import _demo_manifest as dm  # noqa: E402


def _png(path: Path, size: tuple[int, int], color=(40, 110, 240)) -> None:
    from PIL import Image

    Image.new("RGB", size, color).save(path)


def _manifest(shot: str = "shot.png") -> dict:
    return {
        "brand": {"name": "Acme", "accent": "#2e6ff0", "theme": "light"},
        "scenes": [
            {"kind": "intro", "title": "Intro", "caption": "Hi", "narration": "Meet Acme."},
            {"kind": "step", "title": "The Inbox", "screenshot": shot, "aspect": 0.5, "caption": "Inbox", "narration": "Open the inbox."},
            {"kind": "outro", "title": "Outro", "caption": "Bye", "narration": "Try Acme."},
        ],
    }


def test_analyze_image_detects_device_theme_and_accent(tmp_path):
    _png(tmp_path / "p.png", (600, 1200))
    a = dm.analyze_image(tmp_path / "p.png")
    assert a["device"] == "phone" and a["aspect"] == 0.5
    assert a["accent"] == "#2860f0" or a["accent"].startswith("#")  # vivid blue found
    assert dm.guess_device(1.6) == "laptop" and dm.guess_device(0.8) == "tablet"
    assert dm.pick_brand_style([a])[1] == "dark"  # blue (40,110,240) is dark overall


def test_validate_catches_missing_file_and_bad_regions(tmp_path):
    m = _manifest("missing.png")
    errors, _ = dm.validate_manifest(m, tmp_path)
    assert any("screenshot not found" in e for e in errors)
    _png(tmp_path / "shot.png", (600, 1200))
    m = _manifest()
    m["scenes"][1]["focus"] = {"x": 0.6, "y": 0.1, "w": 0.6, "h": 0.2}
    m["scenes"][1]["cursor"] = {"to": [1.4, 0.5]}
    errors, _ = dm.validate_manifest(m, tmp_path)
    assert any("focus" in e for e in errors) and any("cursor" in e for e in errors)
    assert dm.validate_manifest(_manifest(), tmp_path)[0] == []


def test_write_scenes_registry_matches_title_keys(tmp_path):
    _png(tmp_path / "shot.png", (600, 1200))
    entries = dm.write_scenes(tmp_path, _manifest())
    assert [k for k, _, _ in entries] == ["intro", "inbox", "outro"]
    narration = json.loads((tmp_path / "narration" / "narrations.json").read_text(encoding="utf-8"))["scenes"]
    for s in narration:
        assert _title_to_scene_key(s["title"]) == s["scene_id"]
    index = (tmp_path / "scenes" / "index.ts").read_text(encoding="utf-8")
    assert "inbox: InboxScene," in index and (tmp_path / "scenes" / "inbox.tsx").exists()


def test_duplicate_title_keys_are_rejected(tmp_path):
    _png(tmp_path / "shot.png", (600, 1200))
    m = _manifest()
    m["scenes"][1]["title"] = "Intro"
    errors, _ = dm.validate_manifest(m, tmp_path)
    assert any("same registry key" in e for e in errors)
