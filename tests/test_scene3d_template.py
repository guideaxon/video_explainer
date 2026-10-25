"""Scene3d bundle and three-core wiring: template registry, imports, sim specs, guard, UI and render defaults."""

import importlib.util
import json
import re
import sys
from pathlib import Path

from src.cli.main import _title_to_scene_key

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "templates" / "scene3d_video"


def _module(name: str):
    sys.path.insert(0, str(ROOT / "scripts"))
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _registry_keys() -> set[str]:
    index = (TEMPLATE / "scenes" / "index.ts").read_text(encoding="utf-8")
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index, re.S).group(1)
    entries = re.findall(r"^\s*(\w+):\s*(\w+),?", block, re.M)
    assert all(c.endswith("Scene") for _, c in entries)
    return {k for k, _ in entries}


def test_sample_scene_ids_match_title_keys_and_registry():
    samples = _module("scene3d_new_video").SAMPLE_SCENES
    for scene_id, title, _ in samples:
        assert _title_to_scene_key(title) == scene_id
    assert _registry_keys() == {s[0] for s in samples}
    for key in _registry_keys():
        assert (TEMPLATE / "scenes" / f"{key}.tsx").exists()


def test_every_scene_has_a_sim_spec():
    spec = (TEMPLATE / "scenes" / "sim.spec.ts").read_text(encoding="utf-8")
    block = re.search(r"export const SIMS[^{]*=\s*\{(.*)\n\};", spec, re.S).group(1)
    keys = set(re.findall(r"^  (\w+):", block, re.M))
    assert keys == _registry_keys()


def test_template_imports_only_own_kit_core_and_local_files():
    allowed = ("react", "./lipsync", "./sim.spec", "./sim.json")
    for tsx in list((TEMPLATE / "scenes").glob("*.ts*")) + list((TEMPLATE / "live").glob("*.ts")):
        for mod in re.findall(r'from\s+"([^"]+)"', tsx.read_text(encoding="utf-8")):
            ok = mod in allowed or mod.startswith(("@remotion-components/scene3d/", "@remotion-components/three-core/", "../scenes/", "./"))
            assert ok, (tsx.name, mod)


def test_no_random_or_wall_clock_in_template_scenes():
    for f in (TEMPLATE / "scenes").glob("*.ts*"):
        src = f.read_text(encoding="utf-8")
        assert not re.search(r"Math\.random|Date\.now|performance\.now", src), f.name


def test_guard_blocks_mixing_but_allows_shared_contracts():
    guard = (ROOT / ".claude" / "hooks" / "guard.py").read_text(encoding="utf-8")
    kits = re.search(r"KIT_IMPORT = re\.compile\(r\"components/\(([^)]+)\)", guard).group(1).split("|")
    assert "scene3d" in kits
    assert "three-core" not in kits and "rig" not in kits


def test_guard_denies_another_kit_in_a_scene3d_project(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location("guard", ROOT / ".claude" / "hooks" / "guard.py")
    guard = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(guard)
    project = tmp_path / "projects" / "p"
    (project / "scenes").mkdir(parents=True)
    (project / "config.json").write_text(json.dumps({"style_bundle": "scene3d"}), encoding="utf-8")
    monkeypatch.setattr(guard, "ROOT", tmp_path)
    call = lambda text: {"tool_name": "Write", "tool_input": {"file_path": str(project / "scenes" / "a.tsx"), "content": text}}
    assert guard.decide(call('import { X } from "@remotion-components/lowpoly/kit";')) is not None
    assert guard.decide(call('import { StageView } from "@remotion-components/three-core/video";\nimport { BubbleShot } from "@remotion-components/scene3d/kit";')) is None


def test_ui_review_and_render_know_the_bundle():
    from ui.server.steps import FULL_STYLE_BUNDLES

    assert "scene3d" in FULL_STYLE_BUNDLES
    assert "scene3d" in _module("review_video").STYLE_BUNDLES
    assert "scene3d" in _module("compose_new_story").BUNDLES
    table = json.loads((ROOT / "remotion" / "scripts" / "delivery_gl.json").read_text(encoding="utf-8"))
    assert table["scene3d"] == "angle"
    render = (ROOT / "remotion" / "scripts" / "render.mjs").read_text(encoding="utf-8")
    assert "delivery_gl.json" in render


def test_determinism_check_uses_the_delivery_backend():
    check = _module("three_core_check_determinism")
    assert check.delivery_gl("scene3d_demo_does_not_exist") == "auto"
    table = json.loads((ROOT / "remotion" / "scripts" / "delivery_gl.json").read_text(encoding="utf-8"))
    # lowpoly keeps Remotion's default backend (phase 5: adoption must not change what it delivers)
    assert table["lowpoly"] == "auto"


def test_lowpoly_follows_the_time_contract():
    files = list((ROOT / "remotion" / "src" / "components" / "lowpoly").glob("*.tsx")) + list((ROOT / "templates" / "lowpoly_video" / "scenes").glob("*.tsx"))
    assert files
    for f in files:
        src = re.sub(r"/\*.*?\*/|//[^\n]*", "", f.read_text(encoding="utf-8"), flags=re.S)
        assert not re.search(r"Math\.random|Date\.now|performance\.now|useFrame\b|new Clock\b", src), f.name


def test_three_is_the_official_pinned_release():
    pkg = json.loads((ROOT / "remotion" / "package.json").read_text(encoding="utf-8"))
    assert pkg["dependencies"]["three"] == "0.180.0"
    assert pkg["devDependencies"]["@types/three"] == "0.180.0"
    header = (ROOT / "remotion" / "node_modules" / "three" / "build" / "three.core.js").read_text(encoding="utf-8")[:200]
    assert "Copyright 2010-2025 Three.js Authors" in header and "SPDX-License-Identifier: MIT" in header


def test_review_matches_bakes_by_title_slug_not_scene_id(tmp_path, monkeypatch):
    review = _module("review_video")
    project = tmp_path / "p"
    (project / "scenes").mkdir(parents=True)
    (project / "narration").mkdir()
    (project / "config.json").write_text(json.dumps({"style_bundle": "scene3d", "video": {"resolution": {"width": 1920, "height": 1080}}}), encoding="utf-8")
    (project / "narration" / "narrations.json").write_text(json.dumps({"scenes": [
        {"scene_id": "scene_1", "title": "Blow", "narration": "Every bubble starts as one breath through a ring of soap."}]}), encoding="utf-8")
    (project / "scenes" / "sim.spec.ts").write_text("export const SIMS = {};", encoding="utf-8")
    (project / "scenes" / "sim.json").write_text(json.dumps({"scenes": {"blow": {}}}), encoding="utf-8")
    (project / "scenes" / "index.ts").write_text("const SCENE_REGISTRY = {\n  blow: BlowScene,\n};", encoding="utf-8")
    rep, _ = review.review(project)
    assert not any("no bake for" in e for e in rep.errors), rep.errors
    (project / "scenes" / "sim.json").write_text(json.dumps({"scenes": {"scene_1": {}}}), encoding="utf-8")
    rep, _ = review.review(project)
    assert any("no bake for 'blow'" in e for e in rep.errors), rep.errors


def test_bake_writes_into_a_custom_projects_dir(tmp_path):
    import shutil as sh
    import subprocess

    project = tmp_path / "p"
    (project / "scenes").mkdir(parents=True)
    (project / "config.json").write_text(json.dumps({"video": {"fps": 30}}), encoding="utf-8")
    sh.copy(TEMPLATE / "scenes" / "sim.spec.ts", project / "scenes" / "sim.spec.ts")
    assert _module("scene3d_new_video").bake("p", tmp_path, {"blow": 2.0}) == 0
    baked = json.loads((project / "scenes" / "sim.json").read_text(encoding="utf-8"))
    assert baked["scenes"]["blow"]["frames"] == 60
    assert not (ROOT / "projects" / "p").exists()


def test_determinism_check_explains_missing_ffmpeg(monkeypatch, capsys):
    check = _module("three_core_check_determinism")
    monkeypatch.setattr(check.shutil, "which", lambda b: None if b in ("ffmpeg", "ffprobe") else "node")
    assert check.main(["any_project", "--against-video", "x.mp4"]) == 1
    assert "ffmpeg" in capsys.readouterr().err


def test_finalize_bakes_at_storyboard_durations(tmp_path):
    finalize = _module("scene3d_finalize_storyboard")
    (tmp_path / "storyboard").mkdir()
    (tmp_path / "storyboard" / "storyboard.json").write_text(json.dumps({
        "audio": {"buffer_between_scenes_seconds": 0.4},
        "scenes": [{"type": "p/blow", "audio_duration_seconds": 3.0}, {"type": "p/pop", "audio_duration_seconds": 2.5}],
    }), encoding="utf-8")
    assert finalize.scene_seconds(tmp_path) == {"blow": 4.4, "pop": 3.9}
