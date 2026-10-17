"""Shared pacing helper for channel finalize scripts (full-video path).

``finalize(project, buffer_seconds, transition, trim=True)`` trims TTS silence in ``voiceover/`` (keeping the
originals in ``voiceover/original/``), rebuilds the storyboard from the trimmed audio and writes the
channel's pacing (scene buffer and transition) into it. Pass ``trim=False`` for music clips. Needs ffmpeg on PATH. Safe to re-run:
trimming always starts from the originals.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent

# Leading silence is cut to 0.05 s; pauses longer than 0.4 s (including the tail) are compressed to 0.2 s.
SILENCE_FILTER = (
    "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
    "silenceremove=stop_periods=-1:stop_duration=0.4:stop_threshold=-45dB:stop_silence=0.2"
)


def trim_voiceovers(voiceover_dir: Path) -> int:
    """Trim silence from every clip, always starting from the untouched original.

    ``voiceover/original/<name>.mp3`` keeps the pristine TTS output. ``original/.trimmed.json`` records
    the size and mtime of each file we wrote, so a clip that no longer matches (the voiceover step was
    re-run) is treated as fresh TTS output and replaces its stale backup instead of being overwritten
    by it.
    """
    originals = voiceover_dir / "original"
    originals.mkdir(exist_ok=True)
    state_path = originals / ".trimmed.json"
    state: dict[str, list[int]] = json.loads(state_path.read_text()) if state_path.exists() else {}
    count = 0
    for mp3 in sorted(voiceover_dir.glob("*.mp3")):
        backup = originals / mp3.name
        stat = mp3.stat()
        ours = state.get(mp3.name) == [stat.st_size, stat.st_mtime_ns]
        if not backup.exists() or not ours:
            shutil.copy2(mp3, backup)  # fresh TTS (or first run): this is the new original
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", str(backup), "-af", SILENCE_FILTER, str(mp3)],
            check=True,
        )
        done = mp3.stat()
        state[mp3.name] = [done.st_size, done.st_mtime_ns]
        count += 1
    state_path.write_text(json.dumps(state))
    return count


def finalize(project: str, projects_dir: str, buffer_seconds: float, transition: dict, trim: bool = True) -> int:
    project_dir = Path(projects_dir) / project
    voiceover_dir = project_dir / "voiceover"
    if not any(voiceover_dir.glob("*.mp3")):
        print(f"No voiceover files in {voiceover_dir}; run the voiceover step first", file=sys.stderr)
        return 1
    if shutil.which("ffmpeg") is None:
        print("ffmpeg is not on PATH", file=sys.stderr)
        return 1

    if trim:
        print(f"Trimmed {trim_voiceovers(voiceover_dir)} voiceover files")
    else:
        print("Skipping silence trimming (audio used as-is)")

    subprocess.run(
        [sys.executable, "-m", "src.cli", "--projects-dir", projects_dir, "storyboard", project, "--force"],
        check=True,
        cwd=REPO_ROOT,
        env={**os.environ, "PYTHONUTF8": "1"},
    )

    storyboard_path = project_dir / "storyboard" / "storyboard.json"
    storyboard = json.loads(storyboard_path.read_text(encoding="utf-8"))
    storyboard.setdefault("audio", {})["buffer_between_scenes_seconds"] = buffer_seconds
    storyboard["transitions"] = transition
    storyboard_path.write_text(json.dumps(storyboard, indent=2), encoding="utf-8")
    print(f"Pacing set: buffer {buffer_seconds}s, transitions {transition}")
    return 0
