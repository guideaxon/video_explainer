"""The neon template registry keys must match the keys the storyboard derives from titles."""

import importlib.util
import re
from pathlib import Path

from src.cli.main import _title_to_scene_key

ROOT = Path(__file__).resolve().parent.parent


def _scaffold_module():
    spec = importlib.util.spec_from_file_location("neon_new_video", ROOT / "scripts" / "neon_new_video.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_sample_scene_ids_match_title_keys():
    for scene_id, title, _ in _scaffold_module().SAMPLE_SCENES:
        assert _title_to_scene_key(title) == scene_id


def test_registry_keys_match_sample_scenes_and_end_in_scene():
    scenes = ROOT / "templates" / "neon_video" / "scenes"
    index = (scenes / "index.ts").read_text(encoding="utf-8")
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index, re.S).group(1)
    entries = re.findall(r"^\s*(\w+):\s*(\w+),?", block, re.M)
    assert {k for k, _ in entries} == {s[0] for s in _scaffold_module().SAMPLE_SCENES}
    assert all(c.endswith("Scene") for _, c in entries)
    for key, _ in entries:
        assert (scenes / f"{key}.tsx").exists()


def test_scenes_import_only_own_kit_lipsync_and_react():
    scenes = ROOT / "templates" / "neon_video" / "scenes"
    for f in scenes.glob("*.ts*"):
        for mod in re.findall(r'from\s+"([^"]+)"', f.read_text(encoding="utf-8")):
            assert mod in {"react", "remotion", "./lipsync"} or mod.startswith("./") or mod == "@remotion-components/neon/kit", (f.name, mod)


def test_kit_imports_only_rig_and_own_files():
    kit = ROOT / "remotion" / "src" / "components" / "neon"
    for f in kit.glob("*.ts*"):
        for mod in re.findall(r'from\s+"(\.[^"]*)"', f.read_text(encoding="utf-8")):
            assert mod in {"../rig", "./core", "./glow", "./character"}, (f.name, mod)
        code = re.sub(r"/\*.*?\*/|//[^\n]*", "", f.read_text(encoding="utf-8"), flags=re.S)
        assert "Math.random" not in code


def test_character_scenes_use_literal_rig_props():
    scenes = ROOT / "templates" / "neon_video" / "scenes"
    src = "".join(f.read_text(encoding="utf-8") for f in scenes.glob("*.tsx"))
    assert re.search(r"gestureAt=\{\d+\}", src) and re.search(r"walk=\{\{ from: \d+, to: \d+", src)
    assert {"wave", "point", "cheer"} <= set(re.findall(r'gesture="(\w+)"', src))


def test_narration_word_counts():
    for _, _, text in _scaffold_module().SAMPLE_SCENES:
        assert 5 <= len(text.split()) <= 12
