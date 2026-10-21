"""Tests for per style bundle shorts styles."""

import json

import pytest

from src.short.style_bundles import STYLE_BUNDLES, load_style, style_for_scenes_dir


def test_load_style_none_and_unknown():
    assert load_style(None) is None
    with pytest.raises(ValueError):
        load_style("does-not-exist")


def test_vantage_style_assets_exist():
    style = load_style("vantage")
    assert style is STYLE_BUNDLES["vantage"]
    assert style.guide_path.exists()
    for name in style.example_files:
        assert (style.reference_scenes_dir / name).exists()


def test_vantage_brief_is_extracted_from_guide():
    brief = load_style("vantage").brief()
    assert brief.startswith("## Scene brief")
    assert "@remotion-components/vantage/kit" in brief
    assert "LLM-BRIEF" not in brief


def test_style_for_scenes_dir_reads_style_bundle(tmp_path):
    project = tmp_path / "proj"
    scenes = project / "short" / "v1" / "scenes"
    scenes.mkdir(parents=True)
    (project / "config.json").write_text(json.dumps({"id": "proj", "style": {"primary_color": "#fff"}}))
    assert style_for_scenes_dir(scenes) is None  # colour dict is not a style bundle

    (project / "config.json").write_text(json.dumps({"id": "proj", "style_bundle": "vantage"}))
    assert style_for_scenes_dir(scenes).name == "vantage"
