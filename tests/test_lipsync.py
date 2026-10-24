"""Shared lip sync (scripts/_lipsync.py): fps from config, Rhubarb cues to frames, fallback without Rhubarb, shorts."""

from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import _lipsync  # noqa: E402

needs_ffmpeg = pytest.mark.skipif(not shutil.which("ffmpeg"), reason="ffmpeg not installed")


def _tone(path: Path, seconds: float = 1.0) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"sine=f=220:d={seconds}", str(path)], check=True)
    return path


def _project(tmp_path: Path, fps: int | None = None) -> Path:
    d = tmp_path / "p"
    d.mkdir()
    cfg = {"id": "p"} | ({"video": {"fps": fps}} if fps else {})
    (d / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    return d


def test_project_fps_reads_config_with_default(tmp_path):
    assert _lipsync.project_fps(_project(tmp_path, 12)) == 12
    assert _lipsync.project_fps(tmp_path / "missing") == 30


def test_cues_to_frames_holds_each_shape_and_rests_outside_cues():
    cues = [{"start": 0.0, "end": 0.1, "value": "X"}, {"start": 0.1, "end": 0.25, "value": "D"},
            {"start": 0.25, "end": 0.3, "value": "?"}]
    assert _lipsync.cues_to_frames(cues, 20, 8) == "XXDDDXXX"  # unknown letters and the tail rest as X
    assert _lipsync.cues_to_frames(cues, 10, 3) == "XDD"


@needs_ffmpeg
def test_bake_without_rhubarb_writes_loudness_only(tmp_path, monkeypatch, capsys):
    d = _project(tmp_path, 24)
    _tone(d / "voiceover" / "hello.mp3")
    (d / "voiceover" / "silent.mp3").write_bytes(b"")  # TTS writes 0 bytes for an empty line
    monkeypatch.setattr(_lipsync, "find_rhubarb", lambda: None)
    lipsync, visemes = _lipsync.bake(d)
    assert list(lipsync) == ["hello"] and 23 <= len(lipsync["hello"]) <= 25 and visemes == {}
    assert "rhubarb not on PATH" in capsys.readouterr().err


@needs_ffmpeg
def test_bake_with_rhubarb_writes_one_shape_per_frame(tmp_path, monkeypatch):
    d = _project(tmp_path)
    _tone(d / "voiceover" / "hello.mp3")
    monkeypatch.setattr(_lipsync, "find_rhubarb", lambda: "rhubarb")
    monkeypatch.setattr(_lipsync, "rhubarb_cues", lambda clip, text, exe: [{"start": 0.0, "end": 5.0, "value": "C"}])
    lipsync, visemes = _lipsync.bake(d)
    assert visemes["hello"] == "C" * len(lipsync["hello"])
    text = _lipsync.write_lipsync_ts(d, lipsync, visemes).read_text(encoding="utf-8")
    assert "export const VISEMES" in text and '"hello": "CCC' in text and "at 30 fps" in text


@needs_ffmpeg
def test_short_is_sliced_per_beat(tmp_path, monkeypatch):
    d = _project(tmp_path)
    short = d / "short" / "v"
    _tone(short / "voiceover" / "short_voiceover.mp3", 2.0)
    (short / "storyboard").mkdir(parents=True)
    (short / "storyboard" / "shorts_storyboard.json").write_text(json.dumps({"beats": [
        {"id": "beat_1", "start_seconds": 0.0, "end_seconds": 1.0, "caption_text": "One"},
        {"id": "beat_2", "start_seconds": 1.0, "end_seconds": 2.0, "caption_text": "Two"},
    ]}), encoding="utf-8")
    monkeypatch.setattr(_lipsync, "find_rhubarb", lambda: None)
    text = _lipsync.bake_short(d, "v").read_text(encoding="utf-8")
    lipsync = json.loads(text.split("= ", 1)[1].split(";\n", 1)[0])
    assert set(lipsync) == {"beat_1", "beat_2"} and all(29 <= len(v) <= 30 for v in lipsync.values())
    assert '"beat_2": "Two"' in text


@pytest.mark.skipif(not (_lipsync.find_rhubarb() and shutil.which("ffmpeg")), reason="rhubarb not installed")
def test_real_rhubarb_returns_cues(tmp_path):
    cues = _lipsync.rhubarb_cues(_tone(tmp_path / "t.mp3"), "hello", _lipsync.find_rhubarb())
    assert cues and all(c["value"] in _lipsync.SHAPES for c in cues)
