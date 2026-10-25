"""The rubberhose template registry keys must match the keys the storyboard derives from titles."""

import importlib.util
import re
from pathlib import Path

from src.cli.main import _title_to_scene_key

ROOT = Path(__file__).resolve().parent.parent


def _scaffold_module():
    spec = importlib.util.spec_from_file_location("rubberhose_new_video", ROOT / "scripts" / "rubberhose_new_video.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_sample_scene_ids_match_title_keys():
    for scene_id, title, _ in _scaffold_module().SAMPLE_SCENES:
        assert _title_to_scene_key(title) == scene_id


def test_registry_keys_match_sample_scenes_and_end_in_scene():
    scenes = ROOT / "templates" / "rubberhose_video" / "scenes"
    index = (scenes / "index.ts").read_text(encoding="utf-8")
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index, re.S).group(1)
    entries = re.findall(r"^\s*(\w+):\s*(\w+),?", block, re.M)
    assert {k for k, _ in entries} == {s[0] for s in _scaffold_module().SAMPLE_SCENES}
    assert all(c.endswith("Scene") for _, c in entries)
    for key, _ in entries:
        assert (scenes / f"{key}.tsx").exists()


def test_template_imports_only_own_kit_and_rig():
    scenes = ROOT / "templates" / "rubberhose_video" / "scenes"
    for tsx in scenes.glob("*.tsx"):
        for mod in re.findall(r'from\s+"([^"]+)"', tsx.read_text(encoding="utf-8")):
            assert mod in ("react", "./lipsync", "@remotion-components/rubberhose/kit", "@remotion-components/rig") or mod.startswith("@remotion-components/rubberhose/"), (tsx.name, mod)


def test_kit_has_rig_and_held_clock():
    kit = (ROOT / "remotion" / "src" / "components" / "rubberhose" / "kit.tsx").read_text(encoding="utf-8")
    assert 'from "../rig"' in kit and "Math.random" not in kit
    for name in ("Kip", "FilmFx", "Iris", "TitleCard", "EndCard", "useHeld"):
        assert f"export const {name}" in kit
    assert len(re.findall(r"^\s*[A-H]:\s*\{", kit, re.M)) >= 8  # a mouth per Rhubarb shape


def test_literal_rig_props_for_sound_cues():
    scenes = ROOT / "templates" / "rubberhose_video" / "scenes"
    text = "".join(t.read_text(encoding="utf-8") for t in scenes.glob("*.tsx"))
    assert re.search(r"gestureAt=\{\d+\}", text) and re.search(r"walk=\{\{ from: \d+, to: \d+ \}\}", text)
    assert not re.search(r"Math\.random", text)
