"""The lyric template registry keys must match the keys the storyboard derives from titles."""

import importlib.util
import re
from pathlib import Path

from src.cli.main import _title_to_scene_key

ROOT = Path(__file__).resolve().parent.parent


def _scaffold_module():
    spec = importlib.util.spec_from_file_location("lyric_new_video", ROOT / "scripts" / "lyric_new_video.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_sample_scene_ids_match_title_keys():
    for scene_id, title, _ in _scaffold_module().SAMPLE_SCENES:
        assert _title_to_scene_key(title) == scene_id


def test_registry_keys_match_sample_scenes_and_end_in_scene():
    scenes = ROOT / "templates" / "lyric_video" / "scenes"
    index = (scenes / "index.ts").read_text(encoding="utf-8")
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index, re.S).group(1)
    entries = re.findall(r"^\s*(\w+):\s*(\w+),?", block, re.M)
    assert {k for k, _ in entries} == {s[0] for s in _scaffold_module().SAMPLE_SCENES}
    assert all(c.endswith("Scene") for _, c in entries)
    for key, _ in entries:
        assert (scenes / f"{key}.tsx").exists()
