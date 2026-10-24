"""Lowpoly style bundle (scaffold, lip sync, guard, review rules) and the story composer (validate, join)."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import compose_build  # noqa: E402
import lowpoly_finalize_storyboard as finalize  # noqa: E402
import lowpoly_new_video as new_video  # noqa: E402
from review_video import STYLE_BUNDLES  # noqa: E402

needs_ffmpeg = pytest.mark.skipif(not (shutil.which("ffmpeg") and shutil.which("ffprobe")), reason="ffmpeg not installed")


def _project(tmp_path: Path, name: str = "p") -> Path:
    d = tmp_path / name
    d.mkdir()
    (d / "config.json").write_text(json.dumps({"id": name, "title": name, "tts": {"provider": "edge", "voice_id": "v"}}), encoding="utf-8")
    return d


def test_scaffold_writes_scenes_narration_and_config(tmp_path):
    d = _project(tmp_path)
    assert new_video.main(["p", "--projects-dir", str(tmp_path)]) == 0
    cfg = json.loads((d / "config.json").read_text(encoding="utf-8"))
    assert cfg["style_bundle"] == "lowpoly" and cfg["video"]["resolution"] == {"width": 1280, "height": 720}
    scenes = json.loads((d / "narration" / "narrations.json").read_text(encoding="utf-8"))["scenes"]
    index = (d / "scenes" / "index.ts").read_text(encoding="utf-8")
    assert [s["scene_id"] for s in scenes] == ["hello", "problem", "idea", "steps", "twist", "finale"]
    assert all(f"  {s['scene_id']}: " in index for s in scenes)  # registry key equals the title slug
    assert "CAPTIONS" in (d / "scenes" / "lipsync.ts").read_text(encoding="utf-8")
    assert new_video.main(["p", "--projects-dir", str(tmp_path)]) == 1  # refuses to overwrite


def test_template_imports_only_the_lowpoly_kit():
    for f in (ROOT / "templates" / "lowpoly_video" / "scenes").glob("*.tsx"):
        text = f.read_text(encoding="utf-8")
        assert "components/lowpoly/" in text and not any(f"components/{b}/" in text for b in ("markets", "storybook", "isofigure")), f.name


def test_review_rules_for_lowpoly():
    assert STYLE_BUNDLES["lowpoly"]["words"] == (6, 16)


def test_guard_blocks_other_kits_in_lowpoly_scenes():
    sys.path.insert(0, str(ROOT / ".claude" / "hooks"))
    try:
        import guard
    finally:
        sys.path.pop(0)
    scene = ROOT / "projects" / "_lowpoly_guard" / "scenes" / "hello.tsx"
    (scene.parent.parent).mkdir(parents=True, exist_ok=True)
    (scene.parent.parent / "config.json").write_text(json.dumps({"style_bundle": "lowpoly"}), encoding="utf-8")
    try:
        deny = guard.decide({"tool_name": "Write", "tool_input": {"file_path": str(scene), "content": "import x from '@remotion-components/markets/kit'"}})
        allow = guard.decide({"tool_name": "Write", "tool_input": {"file_path": str(scene), "content": "import x from '@remotion-components/lowpoly/kit'"}})
    finally:
        shutil.rmtree(scene.parent.parent, ignore_errors=True)
    assert deny and "Do not mix style bundles" in json.dumps(deny)
    assert not allow


@needs_ffmpeg
def test_mouth_curve_follows_loudness(tmp_path):
    wav = tmp_path / "t.wav"  # 0.5 s tone, 0.5 s silence, 0.5 s tone
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=f=220:d=0.5", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono:d=0.5",
                    "-f", "lavfi", "-i", "sine=f=220:d=0.5", "-filter_complex", "[0][1][2]concat=n=3:v=0:a=1", str(wav)], check=True)
    curve = finalize.mouth_curve(wav)
    assert 44 <= len(curve) <= 46
    assert min(curve[2:12]) > 0.5 and max(curve[18:27]) < 0.2 and max(curve[-12:-2]) > 0.5
    assert all(0.0 <= x <= 1.0 for x in curve)


def test_write_lipsync_ts_carries_captions(tmp_path):
    d = _project(tmp_path)
    (d / "narration").mkdir()
    (d / "scenes").mkdir()
    (d / "narration" / "narrations.json").write_text(json.dumps({"scenes": [{"scene_id": "hello", "narration": "Hi, there."}]}), encoding="utf-8")
    text = finalize.write_lipsync_ts(d, {"hello": [0.0, 0.5]}).read_text(encoding="utf-8")
    assert '"hello": [0.0, 0.5]' in text and '"hello": "Hi, there."' in text


def _story(chapters):
    return {"_id": "s", "chapters": chapters}


def test_validate_flags_bundle_mismatch_and_mixed_voices(tmp_path):
    a, b = _project(tmp_path, "a"), _project(tmp_path, "b")
    for d, bundle, voice in ((a, "lowpoly", "v1"), (b, "markets", "v2")):
        cfg = json.loads((d / "config.json").read_text(encoding="utf-8"))
        cfg.update(style_bundle=bundle, tts={"provider": "edge", "voice_id": voice})
        (d / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    story = _story([{"id": "x", "bundle": "lowpoly", "project": "a"}, {"id": "y", "bundle": "promo", "project": "b"}, {"id": "z", "bundle": "lowpoly", "project": "gone"}])
    errors = "\n".join(compose_build.validate(story, tmp_path))
    assert "style_bundle is 'markets', chapter says 'promo'" in errors
    assert "different TTS voices" in errors
    assert "project gone not found" in errors


@needs_ffmpeg
def test_join_crossfades_to_the_expected_length(tmp_path):
    clips, durations = [], []
    for i, (w, h, d) in enumerate([(320, 180, 2.0), (180, 320, 3.0), (320, 180, 2.0)]):  # a portrait chapter in a landscape story
        raw, out = tmp_path / f"raw{i}.mp4", tmp_path / f"c{i}.mp4"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"color=c=blue:s={w}x{h}:d={d}:r=24", "-c:v", "libx264", str(raw)], check=True)
        info = compose_build.probe(raw)
        assert info["audio"] is False
        compose_build.normalise(raw, out, {"width": 320, "height": 180, "fps": 30}, "blur-pad", info)
        clips.append(out)
        durations.append(compose_build.probe(out)["duration"])
    final = tmp_path / "final.mp4"
    compose_build.join(clips, durations, 0.5, "fade", final)
    got = compose_build.probe(final)
    assert got["audio"] and abs(got["duration"] - (sum(durations) - 2 * 0.5)) < 0.15
    compose_build.join(clips, durations, 0.5, "cut", final)
    assert abs(compose_build.probe(final)["duration"] - sum(durations)) < 0.15
