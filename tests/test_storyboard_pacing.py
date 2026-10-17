"""trim_voiceovers must not resurrect stale originals after the voiceover step is re-run."""

import shutil
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import _storyboard_pacing as pacing  # noqa: E402

pytestmark = pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg not installed")


def _tone(path: Path, seconds: float, hz: int) -> None:
    # tone followed by 1.5 s of silence, like TTS output with a long tail
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"sine=frequency={hz}:duration={seconds}",
         "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-filter_complex", "[0][1]concat=n=2:v=0:a=1",
         "-t", str(seconds + 1.5), "-c:a", "libmp3lame", str(path)],
        check=True,
    )


def _duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    return float(out)


def test_trim_shortens_and_is_idempotent(tmp_path):
    clip = tmp_path / "a.mp3"
    _tone(clip, 2.0, 440)
    raw = _duration(clip)
    pacing.trim_voiceovers(tmp_path)
    first = _duration(clip)
    pacing.trim_voiceovers(tmp_path)
    assert first < raw - 0.8
    assert abs(_duration(clip) - first) < 0.1


def test_rerun_of_voiceover_replaces_stale_original(tmp_path):
    clip = tmp_path / "a.mp3"
    _tone(clip, 2.0, 440)
    pacing.trim_voiceovers(tmp_path)
    _tone(clip, 4.0, 660)  # voiceover step re-run with longer narration
    pacing.trim_voiceovers(tmp_path)
    assert _duration(clip) > 3.5  # would be ~2 s if the stale original had been restored
    assert _duration(tmp_path / "original" / "a.mp3") > 5.0
