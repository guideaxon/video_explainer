"""The glossy template registry keys must match the keys the storyboard derives from titles."""

import importlib.util
import re
from pathlib import Path

from src.cli.main import _title_to_scene_key

ROOT = Path(__file__).resolve().parent.parent


def _scaffold_module():
    spec = importlib.util.spec_from_file_location("glossy_new_video", ROOT / "scripts" / "glossy_new_video.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_sample_scene_ids_match_title_keys():
    for scene_id, title, _ in _scaffold_module().SAMPLE_SCENES:
        assert _title_to_scene_key(title) == scene_id


def test_registry_keys_match_sample_scenes_and_end_in_scene():
    scenes = ROOT / "templates" / "glossy_video" / "scenes"
    index = (scenes / "index.ts").read_text(encoding="utf-8")
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index, re.S).group(1)
    entries = re.findall(r"^\s*(\w+):\s*(\w+),?", block, re.M)
    assert {k for k, _ in entries} == {s[0] for s in _scaffold_module().SAMPLE_SCENES}
    assert all(c.endswith("Scene") for _, c in entries)
    for key, _ in entries:
        assert (scenes / f"{key}.tsx").exists()


def test_scenes_import_only_own_kit_and_rig_and_use_literal_rig_props():
    scenes = ROOT / "templates" / "glossy_video" / "scenes"
    for f in scenes.glob("*.tsx"):
        src = f.read_text(encoding="utf-8")
        for mod in re.findall(r'from\s+"([^"]+)"', src):
            assert mod == "react" or mod == "./lipsync" or mod == "@remotion-components/glossy/kit", (f.name, mod)
        assert not re.search(r"Math\.random", src)
        assert not re.search(r"gestureAt=\{(?!\d)", src), f.name
        assert not re.search(r"walk=\{(?!\{ from: \d)", src), f.name


def test_kit_imports_only_rig_and_is_deterministic():
    kit = (ROOT / "remotion" / "src" / "components" / "glossy").glob("*.ts*")
    for f in kit:
        src = f.read_text(encoding="utf-8")
        assert "Math.random" not in src, f.name
        for mod in re.findall(r'from\s+"(\.{1,2}/[^"]*)"', src):
            assert mod in ("../rig", "./gloss"), (f.name, mod)


def test_lipsync_stub_exports_all_three_tables():
    stub = (ROOT / "templates" / "glossy_video" / "scenes" / "lipsync.ts").read_text(encoding="utf-8")
    for name in ("LIPSYNC", "VISEMES", "CAPTIONS"):
        assert f"export const {name}" in stub


def test_scenes_use_distinct_toy_gestures():
    scenes = ROOT / "templates" / "glossy_video" / "scenes"
    used = set(re.findall(r'gesture="(\w+)"', "".join(f.read_text(encoding="utf-8") for f in scenes.glob("*.tsx"))))
    assert {"wave", "cheer", "point", "shrug"} <= used
