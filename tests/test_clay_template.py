"""The clay template registry keys must match the keys the storyboard derives from titles."""

import importlib.util
import re
from pathlib import Path

from src.cli.main import _title_to_scene_key

ROOT = Path(__file__).resolve().parent.parent


def _scaffold_module():
    spec = importlib.util.spec_from_file_location("clay_new_video", ROOT / "scripts" / "clay_new_video.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_sample_scene_ids_match_title_keys():
    for scene_id, title, _ in _scaffold_module().SAMPLE_SCENES:
        assert _title_to_scene_key(title) == scene_id


def test_registry_keys_match_sample_scenes_and_end_in_scene():
    scenes = ROOT / "templates" / "clay_video" / "scenes"
    index = (scenes / "index.ts").read_text(encoding="utf-8")
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index, re.S).group(1)
    entries = re.findall(r"^\s*(\w+):\s*(\w+),?", block, re.M)
    assert {k for k, _ in entries} == {s[0] for s in _scaffold_module().SAMPLE_SCENES}
    assert all(c.endswith("Scene") for _, c in entries)
    for key, _ in entries:
        assert (scenes / f"{key}.tsx").exists()


def test_template_imports_only_own_kit_and_rig():
    scenes = ROOT / "templates" / "clay_video" / "scenes"
    for f in scenes.glob("*.tsx"):
        for mod in re.findall(r'from "([^"]+)"', f.read_text(encoding="utf-8")):
            assert mod in ("react", "./lipsync") or mod.startswith("@remotion-components/clay/") or mod.endswith("/rig"), (f.name, mod)
    kit = ROOT / "remotion" / "src" / "components" / "clay"
    for f in kit.glob("*.ts*"):
        for mod in re.findall(r'from "(\.[^"]*)"', f.read_text(encoding="utf-8")):
            assert mod.startswith("./") or mod == "../rig", (f.name, mod)


def test_scenes_use_literal_rig_props_for_sound_cues():
    scenes = ROOT / "templates" / "clay_video" / "scenes"
    text = "".join(f.read_text(encoding="utf-8") for f in scenes.glob("*.tsx"))
    assert re.search(r"walk=\{\{ from: \d+, to: \d+ \}\}", text)
    assert len(set(re.findall(r'gesture="(\w+)"', text))) >= 3
    assert "Math.random(" not in text and "Math.random(" not in "".join(f.read_text(encoding="utf-8") for f in (ROOT / "remotion" / "src" / "components" / "clay").glob("*.ts*"))


def test_every_scene_wires_lip_sync():
    scenes = ROOT / "templates" / "clay_video" / "scenes"
    for key, _, _ in _scaffold_module().SAMPLE_SCENES:
        src = (scenes / f"{key}.tsx").read_text(encoding="utf-8")
        assert f"LIPSYNC.{key}" in src and f"VISEMES.{key}" in src
