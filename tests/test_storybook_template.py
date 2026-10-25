"""The storybook template registry keys must match the keys the storyboard derives from titles."""

import importlib.util
import re
from pathlib import Path

from src.cli.main import _title_to_scene_key

ROOT = Path(__file__).resolve().parent.parent


def _scaffold_module():
    spec = importlib.util.spec_from_file_location("storybook_new_video", ROOT / "scripts" / "storybook_new_video.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_sample_scene_ids_match_title_keys():
    for scene_id, title, *_ in _scaffold_module().SAMPLE_SCENES:
        assert _title_to_scene_key(title) == scene_id


def test_registry_keys_match_sample_scenes_and_end_in_scene():
    scenes = ROOT / "templates" / "storybook_video" / "scenes"
    index = (scenes / "index.ts").read_text(encoding="utf-8")
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index, re.S).group(1)
    entries = re.findall(r"^\s*(\w+):\s*(\w+),?", block, re.M)
    assert {k for k, _ in entries} == {s[0] for s in _scaffold_module().SAMPLE_SCENES}
    assert all(c.endswith("Scene") for _, c in entries)
    for key, _ in entries:
        assert (scenes / f"{key}.tsx").exists()


def _load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_lipsync_stub_ships_and_finalize_bakes_it():
    scenes = ROOT / "templates" / "storybook_video" / "scenes"
    stub = (scenes / "lipsync.ts").read_text(encoding="utf-8")
    assert all(n in stub for n in ("LIPSYNC", "VISEMES", "CAPTIONS"))
    assert "bake_and_write" in (ROOT / "scripts" / "storybook_finalize_storyboard.py").read_text(encoding="utf-8")


def test_plate_shots_are_empty_and_others_unchanged():
    comfy = _load("storybook_stills_comfy")
    style = {"style_line": "STYLE", "cast": ["THE GIRL"], "negative": "n"}
    plate = comfy.build_prompt(style, {"prompt": "desk", "cast": True, "plate": True})
    assert "THE GIRL" not in plate and "no people" in plate and "desk" in plate
    assert comfy.build_prompt(style, {"prompt": "desk", "cast": True}) == "STYLE, desk, THE GIRL"
    assert comfy.build_prompt(style, {"prompt": "desk"}) == "STYLE, desk"
    assert "person" in comfy.graph({**style, "model": "m", "size": [8, 8], "steps": 1, "cfg": 1}, "x", 1, "p", True)["3"]["inputs"]["text"]


def test_template_plate_scenes_are_flagged_in_the_art_plan():
    scaffold = _scaffold_module()
    for sid in scaffold.PLATE_SHOTS:
        assert sid in {s[0] for s in scaffold.SAMPLE_SCENES}
        assert (ROOT / "templates" / "storybook_video" / "scenes" / f"{sid}.tsx").read_text(encoding="utf-8").count("<Wren") == 1
