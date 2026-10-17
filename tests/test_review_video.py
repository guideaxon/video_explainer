"""review_video.py: the untouched markets template must flag SAMPLE text; bad config must error."""

import importlib.util
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def _load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _project(tmp_path):
    scaffold = _load("markets_new_video")
    pdir = tmp_path / "p"
    (pdir / "scenes").mkdir(parents=True)
    (pdir / "narration").mkdir()
    for src in scaffold.TEMPLATE_DIR.glob("*"):
        shutil.copy2(src, pdir / "scenes" / src.name)
    scenes = [{"scene_id": i, "title": t, "narration": n} for i, t, n in scaffold.SAMPLE_SCENES]
    (pdir / "narration" / "narrations.json").write_text(json.dumps({"scenes": scenes}), encoding="utf-8")
    (pdir / "config.json").write_text(
        json.dumps({"channel": "markets", "video": {"resolution": {"width": 1080, "height": 1920}}}),
        encoding="utf-8",
    )
    return pdir


def test_template_is_flagged_for_sample_text(tmp_path):
    rep, _ = _load("review_video").review(_project(tmp_path))
    assert any("placeholder" in e for e in rep.errors)
    assert not any("registry" in e for e in rep.errors)  # template keys match its titles


def test_unknown_channel_is_an_error(tmp_path):
    pdir = _project(tmp_path)
    (pdir / "config.json").write_text(json.dumps({"channel": "nope"}), encoding="utf-8")
    rep, _ = _load("review_video").review(pdir)
    assert rep.errors and "channel" in rep.errors[0]


def _mini(tmp_path, channel, scene_src, narration="Short line here for the test."):
    """One-scene project: scenes/hook.tsx with `scene_src`, registered as key `hook`."""
    pdir = tmp_path / "mini"
    (pdir / "scenes").mkdir(parents=True)
    (pdir / "narration").mkdir()
    (pdir / "scenes" / "hook.tsx").write_text(scene_src, encoding="utf-8")
    (pdir / "scenes" / "index.ts").write_text(
        "const SCENE_REGISTRY: Record<string, X> = {\n  hook: HookScene,\n};\n", encoding="utf-8"
    )
    (pdir / "narration" / "narrations.json").write_text(
        json.dumps({"scenes": [{"scene_id": "hook", "title": "Hook", "narration": narration}]}), encoding="utf-8"
    )
    (pdir / "config.json").write_text(
        json.dumps({"channel": channel, "video": {"resolution": {"width": 1080, "height": 1920}}}), encoding="utf-8"
    )
    return pdir


def test_placeholder_pattern_matches_template_tags_not_real_copy():
    rv = _load("review_video")
    assert rv.PLACEHOLDER.search("SAMPLE DATA")
    assert rv.PLACEHOLDER.search("TODO fix this")
    assert not rv.PLACEHOLDER.search("Todoist integration and a free sample pack")


def test_sample_tag_component_is_an_error(tmp_path):
    rep, _ = _load("review_video").review(_mini(tmp_path, "lyric", "<Scene><SampleTag /></Scene>"))
    assert any("SampleTag" in e for e in rep.errors)


def test_phrase_in_a_comment_does_not_satisfy_required_phrase(tmp_path):
    rv = _load("review_video")
    src = '// remember "Not business advice" on the sign-off\nexport const X = () => <div>Hello there</div>;\n'
    rep, _ = rv.review(_mini(tmp_path, "leaderbot", src))
    assert any("not business advice" in e for e in rep.errors)
    rep, _ = rv.review(_mini(tmp_path / "ok", "leaderbot", "<div>Fictional. Not business advice.</div>"))
    assert not any("not business advice" in e for e in rep.errors)


def test_leaderbot_headline_width_warning_respects_size(tmp_path):
    rv = _load("review_video")
    long_line = '<Headline lines={["Meet the", "*Leader bot."]} />'
    rep, _ = rv.review(_mini(tmp_path, "leaderbot", long_line + "<p>Not business advice.</p>"))
    assert any("may wrap" in w for w in rep.warnings)
    smaller = '<Headline lines={["Meet the", "*Leader bot."]} size={96} />'
    rep, _ = rv.review(_mini(tmp_path / "b", "leaderbot", smaller + "<p>Not business advice.</p>"))
    assert not any("may wrap" in w for w in rep.warnings)


def test_narration_scene_without_title_is_an_error_not_a_crash(tmp_path):
    pdir = _mini(tmp_path, "lyric", "<div>Hi there</div>")
    (pdir / "narration" / "narrations.json").write_text(json.dumps({"scenes": [{"scene_id": "x"}]}), encoding="utf-8")
    rep, _ = _load("review_video").review(pdir)
    assert any("no title" in e for e in rep.errors)
