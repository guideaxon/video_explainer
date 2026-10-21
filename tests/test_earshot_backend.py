"""Tests for the optional Earshot SFX backend, the kit analyzer and registry scene lookup.

Earshot itself is never run here: its status and renders are replaced, so these tests need neither
torch nor the models.
"""

import json
import wave

import numpy as np
import pytest

from src.sound import earshot_backend as eb
from src.sound.kit_analyzer import analyze_kit_scene
from src.sound.library import SOUND_MANIFEST, SoundLibrary
from src.sound.sfx_orchestrator import SFXOrchestrator


def _wav(path, seconds=0.1, rate=48000):
    path.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes((np.zeros(int(seconds * rate)) * 32767).astype("<i2").tobytes())


# ----- palettes ----------------------------------------------------------------------------------
def test_every_palette_entry_names_a_real_library_sound():
    assert set(eb.DEFAULT_PALETTE) == set(SOUND_MANIFEST)  # nothing missing, nothing extra
    for name, overrides in eb.STYLE_PALETTES.items():
        assert set(overrides) <= set(SOUND_MANIFEST), name


def test_a_style_palette_inherits_the_default_for_what_it_does_not_override():
    mapping = eb.palette("markets")
    assert set(mapping) == set(SOUND_MANIFEST)
    assert mapping["lock_click"] == "pro_click/mouse" and mapping["warning_tone"] == eb.DEFAULT_PALETTE["warning_tone"]


def test_style_bundles_do_not_share_one_sound_set():
    sets = {name: tuple(sorted(eb.palette(name).items())) for name in eb.palette_names()}
    assert len(set(sets.values())) == len(sets)


@pytest.mark.parametrize("config,expected", [
    ({}, "default"),
    ({"style_bundle": "lyric"}, "lyric"),
    ({"style_bundle": "unknown"}, "default"),
    ({"style_bundle": "lyric", "sound": {"palette": "promo"}}, "promo"),  # a per-project override wins
    ({"style_bundle": "lyric", "sound": {"palette": "bogus"}}, "lyric"),
])
def test_palette_for_project(config, expected):
    assert eb.palette_for_project(config) == expected


# ----- the library: engine choice and per-sound fallback -------------------------------------------
def test_project_overrides_replace_single_sounds_of_the_starting_palette(tmp_path, monkeypatch):
    config = {"style_bundle": "markets", "sound": {"overrides": {"ui_pop": "pro_pop/boop", "nonsense": "a/b", "text_tick": ""}}}
    assert eb.overrides_for_project(config) == {"ui_pop": "pro_pop/boop"}  # unknown names and blanks are dropped

    rendered = {}
    monkeypatch.setattr(eb, "status", lambda refresh=False: eb.Status(True, "earshot", "bank"))
    monkeypatch.setattr(eb, "_render_one", lambda exe, name, bank_id, out: rendered.setdefault(name, bank_id) and
                        {"engine": "earshot", "bank": bank_id, "seconds": 0.1, "warnings": []})
    eb.render_palette(tmp_path, "markets", ["ui_pop", "lock_click"], {"ui_pop": "pro_pop/boop"})
    assert rendered == {"ui_pop": "pro_pop/boop", "lock_click": "pro_click/mouse"}  # override wins; the rest is markets


def test_builtin_is_the_default_engine_so_earshot_is_opt_in(tmp_path, monkeypatch):
    monkeypatch.setattr(eb, "status", lambda refresh=False: eb.Status(True, "earshot", "bank"))
    monkeypatch.setattr(eb, "render_palette", lambda *a, **k: pytest.fail("Earshot must not run unless chosen"))
    lib = SoundLibrary(tmp_path / "sfx")
    lib.generate_all()
    assert lib.last_report["engine"] == "builtin"


def test_builtin_engine_writes_files_and_a_manifest(tmp_path):
    lib = SoundLibrary(tmp_path / "sfx")
    generated = lib.generate_all()
    assert set(generated) == set(SOUND_MANIFEST)
    manifest = eb.read_manifest(tmp_path / "sfx")
    assert manifest["engine"] == "builtin" and manifest["palette"] == "default"
    assert all(e["engine"] == "builtin" for e in manifest["sounds"].values())


def test_earshot_engine_falls_back_to_builtin_for_a_sound_it_cannot_render(tmp_path, monkeypatch):
    def fake_render(sfx_dir, palette_name, names, overrides=None):
        out = {}
        for n in names:
            if n == "ui_pop":
                out[n] = {"bank": "pro_pop/thup", "error": "timed out"}
            else:
                _wav(sfx_dir / f"{n}.wav")
                out[n] = {"engine": "earshot", "bank": "x/y", "seconds": 0.1, "warnings": []}
        return out

    monkeypatch.setattr(eb, "render_palette", fake_render)
    lib = SoundLibrary(tmp_path / "sfx")
    lib.generate_all(engine="earshot", palette="markets")
    sounds = lib.last_report["sounds"]
    assert sounds["ui_pop"]["engine"] == "builtin" and sounds["ui_pop"]["fallback_reason"] == "timed out"
    assert sounds["text_tick"]["engine"] == "earshot"
    assert (tmp_path / "sfx" / "ui_pop.wav").is_file()  # a file exists either way, so the render never 404s
    assert eb.read_manifest(tmp_path / "sfx")["palette"] == "markets"


def test_auto_engine_uses_builtin_when_earshot_is_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(eb, "status", lambda refresh=False: eb.Status(False, detail="not installed"))
    lib = SoundLibrary(tmp_path / "sfx")
    lib.generate_all(engine="auto")
    assert lib.last_report["engine"] == "builtin"


def test_unknown_engine_is_rejected(tmp_path):
    with pytest.raises(ValueError):
        SoundLibrary(tmp_path).generate_all(engine="magic")


def test_render_palette_refuses_when_earshot_is_missing(tmp_path, monkeypatch):
    monkeypatch.setattr(eb, "status", lambda refresh=False: eb.Status(False, detail="not installed", fix="pip install"))
    with pytest.raises(RuntimeError, match="not available"):
        eb.render_palette(tmp_path, "default", ["ui_pop"])


def test_render_palette_skips_bank_ids_this_earshot_does_not_have(tmp_path, monkeypatch):
    monkeypatch.setattr(eb, "status", lambda refresh=False: eb.Status(True, "earshot", "bank", bank=("pro_pop/thup",)))
    monkeypatch.setattr(eb, "_render_one", lambda exe, name, bank_id, out: {"engine": "earshot", "bank": bank_id, "seconds": 0.1, "warnings": []})
    result = eb.render_palette(tmp_path, "default", ["ui_pop", "text_tick"])
    assert result["ui_pop"]["engine"] == "earshot"
    assert "not in this Earshot's bank" in result["text_tick"]["error"]


# ----- audit ---------------------------------------------------------------------------------------
def _project_with_cues(tmp_path, cues, sounds=None):
    (tmp_path / "storyboard").mkdir()
    (tmp_path / "storyboard" / "storyboard.json").write_text(json.dumps({"scenes": [{"id": "s", "sfx_cues": cues}]}), encoding="utf-8")
    if sounds is not None:
        eb.write_manifest(tmp_path / "sfx", "earshot", "markets", sounds)
    return tmp_path


def test_audit_flags_a_cue_with_no_sound_file_as_an_error(tmp_path):
    p = _project_with_cues(tmp_path, [{"sound": "ui_pop", "frame": 4}])
    assert ("ERROR", "cue sound 'ui_pop' has no file: sfx/ui_pop.wav (run: sound <project> build)") in eb.audit_project(p)


def test_audit_reports_earshot_warnings_and_sounds_that_will_be_clipped(tmp_path):
    sounds = {"ui_pop": {"engine": "earshot", "bank": "a/b", "seconds": 2.5, "warnings": ["tail cut"]}}
    p = _project_with_cues(tmp_path, [{"sound": "ui_pop", "frame": 4}], sounds)
    _wav(p / "sfx" / "ui_pop.wav", 0.1)
    levels = [(lvl, msg) for lvl, msg in eb.audit_project(p)]
    assert not any(lvl == "ERROR" for lvl, _ in levels)
    assert any(lvl == "WARN" and "tail cut" in msg for lvl, msg in levels)
    assert any(lvl == "WARN" and "cut at 60 frames" in msg for lvl, msg in levels)


def test_no_cues_is_only_info_until_the_sound_step_has_run_then_a_warning(tmp_path):
    p = _project_with_cues(tmp_path, [])
    assert eb.audit_project(p) == [("INFO", "no SFX cues in the storyboard (the Sound step has not run)")]
    eb.write_manifest(p / "sfx", "builtin", "default", {})
    assert eb.audit_project(p) == [("WARN", "no SFX cues in the storyboard: nothing will play in the render")]


def test_count_cues_sums_over_scenes_and_tolerates_a_missing_storyboard(tmp_path):
    assert eb.count_cues(tmp_path) == 0
    (tmp_path / "storyboard").mkdir()
    (tmp_path / "storyboard" / "storyboard.json").write_text(json.dumps({"scenes": [
        {"id": "a", "sfx_cues": [{"sound": "ui_pop", "frame": 1}, {"sound": "text_tick", "frame": 9}]},
        {"id": "b"}, {"id": "c", "sfx_cues": None}, {"id": "d", "sfx_cues": [{"sound": "ui_pop", "frame": 3}]},
    ]}), encoding="utf-8")
    assert eb.count_cues(tmp_path) == 3


# ----- the sound build command ----------------------------------------------------------------------------
class _Project:
    def __init__(self, root):
        self.root_dir, self.id = root, root.name


def _build(tmp_path, monkeypatch, cues):
    import argparse
    import importlib

    cli = importlib.import_module("src.cli.main")  # `from src.cli import main` is the entry function, not the module
    root = tmp_path / "vid"
    root.mkdir()
    (root / "config.json").write_text("{}", encoding="utf-8")
    (root / "storyboard").mkdir()
    (root / "storyboard" / "storyboard.json").write_text(json.dumps({"scenes": [{"id": "s", "sfx_cues": cues}]}), encoding="utf-8")
    monkeypatch.setattr(cli, "_cmd_sound_generate", lambda project, args: 0)  # cue placement is tested elsewhere
    args = argparse.Namespace(engine="builtin", palette=None, llm=False)
    return cli._cmd_sound_build(_Project(root), args), root


def test_build_fails_when_it_places_no_cues_so_the_ui_does_not_show_a_green_step(tmp_path, monkeypatch, capsys):
    code, root = _build(tmp_path, monkeypatch, [])
    assert code == 1
    assert "No SFX cues were placed" in capsys.readouterr().err
    assert (root / "sfx" / "manifest.json").is_file()  # the files are still produced and recorded


def test_build_succeeds_when_cues_exist(tmp_path, monkeypatch):
    code, root = _build(tmp_path, monkeypatch, [{"sound": "ui_pop", "frame": 4}])
    assert code == 0
    assert (root / "sfx" / "ui_pop.wav").is_file()


# ----- the package stays light -----------------------------------------------------------------------------
def test_importing_the_backend_does_not_load_numpy_or_scipy():
    """The UI server imports the backend for palette names; it must not need the heavy sound stack."""
    import subprocess
    import sys

    code = ("import sys; from src.sound import earshot_backend; "
            "heavy = [m for m in ('numpy', 'scipy') if m in sys.modules]; "
            "sys.exit(1 if heavy else 0)")
    r = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True,
                       cwd=str(__import__("pathlib").Path(__file__).resolve().parent.parent))
    assert r.returncode == 0, r.stderr


def test_package_exports_still_resolve_lazily():
    import src.sound as sound

    assert sound.SoundLibrary is SoundLibrary and sound.SOUND_MANIFEST is SOUND_MANIFEST
    assert "SFXOrchestrator" in dir(sound) and "SFXOrchestrator" in sound.__all__
    with pytest.raises(AttributeError):
        sound.does_not_exist  # noqa: B018


# ----- kit analyzer ----------------------------------------------------------------------------------
KIT = """
export const Title: React.FC<{ children: React.ReactNode; top: number; delay?: number }> = ({ children, top, delay = 6 }) => {
  return null;
};
export const LineChart: React.FC<{ data: number[]; from?: number }> = ({ data, from = 8 }) => {
  return null;
};
export const Ticker: React.FC<{ y: number }> = ({ y }) => null;
"""

SCENE = """
import React from "react";
import { MScene, Layer, LineChart, Title, Ticker, Annotation } from "@remotion-components/markets/kit";
// <Title delay={999}>commented out</Title>
export const S = () => (
  <MScene>
    <Ticker y={1} />
    <Title top={700}>HELLO</Title>
    <LineChart data={d} />
    <Annotation x={1} y={2} text="hi" from={86} />
    <Title top={9} delay={t}>dynamic</Title>
  </MScene>
);
"""


def test_kit_analyzer_reads_literal_props_then_kit_defaults(tmp_path):
    (tmp_path / "markets").mkdir()
    (tmp_path / "markets" / "kit.tsx").write_text(KIT, encoding="utf-8")
    scene = tmp_path / "scene.tsx"
    scene.write_text(SCENE, encoding="utf-8")
    moments = analyze_kit_scene(scene, kit_dir=tmp_path)
    got = [(m.frame, m.type) for m in moments]
    assert (6, "text_reveal") in got  # Title: no prop, kit default delay = 6
    assert (8, "chart_grow") in got  # LineChart: kit default from = 8
    assert (86, "element_appear") in got  # Annotation: literal from={86}
    assert all(m.frame != 999 for m in moments)  # commented-out tags are ignored
    assert not any("Ticker" in m.context for m in moments)  # unrecognised or untimed components make no sound
    assert [m.frame for m in moments] == sorted(m.frame for m in moments)


def test_kit_analyzer_ignores_scenes_that_do_not_import_a_kit(tmp_path):
    scene = tmp_path / "plain.tsx"
    scene.write_text('import React from "react"; export const A = () => <div />;', encoding="utf-8")
    assert analyze_kit_scene(scene) == []


# ----- registry scene lookup ---------------------------------------------------------------------------
def test_scene_file_is_found_through_the_registry_when_the_file_name_differs(tmp_path):
    scenes = tmp_path / "scenes"
    scenes.mkdir()
    (scenes / "title.tsx").write_text("export default 1;", encoding="utf-8")
    (scenes / "index.ts").write_text(
        'import TitleScene from "./title";\n'
        "const SCENE_REGISTRY: Record<string, SceneComponent> = {\n  bull_run: TitleScene,\n};\n", encoding="utf-8")
    assert SFXOrchestrator._registry_scene_file(scenes, "bull_run") == scenes / "title.tsx"
    assert SFXOrchestrator._registry_scene_file(scenes, "missing") is None
    assert SFXOrchestrator._registry_scene_file(tmp_path / "nowhere", "bull_run") is None
