"""Papercut optional voice: the build embeds each scene's MP3 as a data URI with its lip sync (ffmpeg tone clips)."""

from __future__ import annotations

import base64
import importlib.util
import json
import re
import shutil
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
pytestmark = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg not installed")


def _load(name: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def _tone(path: Path, seconds: float) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # a 220 Hz tone pulsing at 3 Hz, so the loudness curve opens and closes like syllables
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"sine=frequency=220:duration={seconds}",
                    "-af", "volume='0.2+0.8*abs(sin(3*PI*t))':eval=frame", "-ac", "1", str(path)], check=True)


def _project(tmp_path: Path, voice: bool = True) -> Path:
    p = tmp_path / "pc"
    p.mkdir()
    (p / "config.json").write_text(json.dumps({"style_bundle": "papercut", "voice": voice, "video": {"fps": 30}}))
    (p / "main.tsx").write_text("mountPlayer({ title: 't', scenes: SCENES, events: score, sceneSeconds: 4 });")
    scenes = [
        {"scene_id": "a", "title": "A", "duration_seconds": 4, "narration": "Hello fox."},
        {"scene_id": "b", "title": "B", "duration_seconds": 4, "narration": ""},  # silent scene
        {"scene_id": "c", "title": "C", "duration_seconds": 4, "narration": "A long line.", "scene": 4},
    ]
    (p / "narration").mkdir()
    (p / "narration" / "narrations.json").write_text(json.dumps({"scenes": scenes}))
    _tone(p / "voiceover" / "a.mp3", 1.5)
    (p / "voiceover" / "b.mp3").write_bytes(b"")  # what the voiceover CLI leaves for empty narration
    _tone(p / "voiceover" / "c.mp3", 5.0)
    return p


def test_payload_places_clips_by_scene_with_lipsync(tmp_path, capsys):
    build = _load("papercut_build_html")
    p = _project(tmp_path)
    assert build.voice_enabled(p) and build.scene_seconds(p) == 4
    v = build.voice_payload(p)
    assert v["fps"] == 30
    assert [c and c["id"] for c in v["clips"]] == ["a", None, None, "c"]  # "scene": 4 places c at index 3
    a = v["clips"][0]
    assert a["src"].startswith("data:audio/mpeg;base64,")
    assert base64.b64decode(a["src"].split(",", 1)[1]) == (p / "voiceover" / "a.mp3").read_bytes()
    assert abs(a["dur"] - 1.5) < 0.1 and abs(len(a["mouth"]) - 45) <= 2
    assert max(a["mouth"]) > 0.8 and min(a["mouth"]) < 0.5  # it opens and closes
    assert a["text"] == "Hello fox."
    assert "longer than its 4 s scene 4" in capsys.readouterr().err


def test_voice_off_by_default(tmp_path):
    build = _load("papercut_build_html")
    assert not build.voice_enabled(_project(tmp_path, voice=False))
    assert not build.voice_enabled(tmp_path)


def test_no_clips_is_an_error(tmp_path):
    build = _load("papercut_build_html")
    p = _project(tmp_path)
    shutil.rmtree(p / "voiceover")
    with pytest.raises(SystemExit):
        build.voice_payload(p)


@pytest.mark.skipif(not shutil.which("node"), reason="node not installed")
def test_build_embeds_the_voice_in_film_html(tmp_path):
    new, build = _load("papercut_new_video"), _load("papercut_build_html")
    name = "_pytest_papercut_voice"
    projects = ROOT / "projects"
    try:
        assert new.main([name, "--projects-dir", str(projects), "--voice"]) == 0
        p = projects / name
        assert json.loads((p / "config.json").read_text())["voice"] is True
        narr = json.loads((p / "narration" / "narrations.json").read_text())["scenes"]
        assert len(narr) == 10
        narr[0]["narration"] = "Hello fox."
        (p / "narration" / "narrations.json").write_text(json.dumps({"scenes": narr}))
        _tone(p / "voiceover" / f"{narr[0]['scene_id']}.mp3", 1.0)
        assert build.main([name]) == 0
        html = (p / "film.html").read_text(encoding="utf-8")
        m = re.search(r'<script type="application/json" id="pc-voice">(.*?)</script>', html)
        assert m and json.loads(m.group(1))["clips"][0]["src"].startswith("data:audio/mpeg;base64,")
    finally:
        shutil.rmtree(projects / name, ignore_errors=True)
