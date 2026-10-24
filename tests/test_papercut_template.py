"""Papercut style bundle: scaffold, UI step table and a self-contained HTML build."""

from __future__ import annotations

import importlib.util
import json
import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def _load(name: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_scaffold_writes_project_files_and_config(tmp_path):
    new = _load("papercut_new_video")
    assert new.main(["fox", "--projects-dir", str(tmp_path)]) == 0
    for name in ("scenes.tsx", "score.ts", "main.tsx", "config.json"):
        assert (tmp_path / "fox" / name).exists()
    assert json.loads((tmp_path / "fox" / "config.json").read_text())["style_bundle"] == "papercut"
    assert new.main(["fox", "--projects-dir", str(tmp_path)]) == 1  # refuses to overwrite


def test_template_imports_only_the_papercut_kit():
    text = "".join(p.read_text(encoding="utf-8") for p in (ROOT / "templates" / "papercut_video").glob("*"))
    assert "components/" not in text
    assert "@papercut/" in text


def test_worked_example_matches_the_template():
    for name in ("scenes.tsx", "score.ts", "main.tsx"):
        assert (ROOT / "projects" / "papercut_fox" / name).read_text(encoding="utf-8") == (ROOT / "templates" / "papercut_video" / name).read_text(encoding="utf-8"), name


def test_ui_steps_for_papercut():
    from ui.server.steps import FULL_STYLE_BUNDLES, STEPS, Ctx

    assert "papercut" in FULL_STYLE_BUNDLES
    ctx = Ctx("p", "papercut", ROOT / "projects" / "_missing")
    by_id = {s.id: s.variant(ctx) for s in STEPS}
    assert by_id["render"].mode == "run" and by_id["scenes"].mode == "run"
    assert by_id["narration"].mode == by_id["voiceover"].mode == by_id["verify"].mode == "skipped"
    assert by_id["render"].build(ctx) == ["scripts/papercut_build_html.py", "p"]
    assert by_id["scenes"].build(ctx) == ["scripts/papercut_new_video.py", "p"]


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_build_makes_one_self_contained_html():
    new, build = _load("papercut_new_video"), _load("papercut_build_html")
    projects = ROOT / "projects"
    name = "_pytest_papercut"
    try:
        assert new.main([name, "--projects-dir", str(projects)]) == 0
        assert build.main([name]) == 0
        html = (projects / name / "film.html").read_text(encoding="utf-8")
        assert "createRoot" in html or "createElement" in html
        assert 'src="http' not in html and 'href="http' not in html  # no external files
    finally:
        shutil.rmtree(projects / name, ignore_errors=True)
