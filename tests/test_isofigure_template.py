"""Isofigure style bundle: scaffold, UI step table, guard rule and a self-contained HTML build."""

from __future__ import annotations

import importlib.util
import json
import shutil
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent


def _load(name: str, folder: str = "scripts"):
    spec = importlib.util.spec_from_file_location(name, ROOT / folder / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_scaffold_writes_project_files_and_config(tmp_path):
    new = _load("isofigure_new_figure")
    assert new.main(["washer", "--projects-dir", str(tmp_path)]) == 0
    for name in ("model.ts", "figure.tsx", "main.tsx", "config.json"):
        assert (tmp_path / "washer" / name).exists()
    assert json.loads((tmp_path / "washer" / "config.json").read_text())["style_bundle"] == "isofigure"
    assert new.main(["washer", "--projects-dir", str(tmp_path)]) == 1  # refuses to overwrite


def test_template_imports_only_the_isofigure_kit_and_the_model_is_pure():
    files = {p.name: p.read_text(encoding="utf-8") for p in (ROOT / "templates" / "isofigure_figure").glob("*")}
    assert all("components/" not in t for t in files.values())
    assert "@isofigure/" in files["figure.tsx"]
    assert "import " not in files["model.ts"]  # the truth has no imports and no DOM


def test_worked_example_matches_the_template():
    for name in ("model.ts", "figure.tsx", "main.tsx"):
        assert (ROOT / "projects" / "isofigure_washer" / name).read_text(encoding="utf-8") == (ROOT / "templates" / "isofigure_figure" / name).read_text(encoding="utf-8"), name


def test_ui_steps_for_isofigure():
    from ui.server.steps import FULL_STYLE_BUNDLES, STEPS, Ctx

    assert "isofigure" in FULL_STYLE_BUNDLES
    ctx = Ctx("p", "isofigure", ROOT / "projects" / "_missing")
    by_id = {s.id: s.variant(ctx) for s in STEPS}
    assert by_id["scenes"].build(ctx) == ["scripts/isofigure_new_figure.py", "p"]
    assert by_id["render"].build(ctx) == ["scripts/isofigure_build_html.py", "p"]
    assert by_id["render"].outputs == ("figure.html",)
    assert all(by_id[k].mode == "skipped" for k in ("narration", "voiceover", "storyboard", "sound", "verify"))
    # papercut keeps its own variants
    pc = {s.id: s.variant(Ctx("p", "papercut", ROOT / "projects" / "_missing")) for s in STEPS}
    assert pc["render"].outputs == ("film.html",)


def test_guard_blocks_other_bundle_kits_in_isofigure_sources():
    sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
    try:
        import guard
    finally:
        sys.path.pop(0)
    project = ROOT / "projects" / "isofigure_washer" / "figure.tsx"
    deny = guard.decide({"tool_name": "Write", "tool_input": {"file_path": str(project), "content": "import x from '../../remotion/src/components/papercut/paper'"}})
    allow = guard.decide({"tool_name": "Write", "tool_input": {"file_path": str(project), "content": "import { Box } from '@isofigure/iso'"}})
    assert deny and "Do not mix style bundles" in json.dumps(deny)
    assert not allow


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_build_makes_one_self_contained_html():
    new, build = _load("isofigure_new_figure"), _load("isofigure_build_html")
    projects = ROOT / "projects"
    name = "_pytest_isofigure"
    try:
        assert new.main([name, "--projects-dir", str(projects)]) == 0
        assert build.main([name]) == 0
        html = (projects / name / "figure.html").read_text(encoding="utf-8")
        assert "createRoot" in html or "createElement" in html
        assert 'src="http' not in html and 'href="http' not in html  # no external files
    finally:
        shutil.rmtree(projects / name, ignore_errors=True)
