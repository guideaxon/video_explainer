"""Measure the clips, extract their dialogue audio and build the storyboard for a MovieBook style bundle video.

Usage:
    python scripts/moviebook_finalize_storyboard.py <project> [--skip-voice-check]

Run after the clips exist and ``scripts/moviebook_voice_check.py check`` has passed (a passing, up-to-date
``moviebook/qc_voice.json`` is required; ``--skip-voice-check`` goes ahead and says so). It:
  1. measures every clip with ffprobe (frames, rate, audio stream; frames also retimed to the 30 fps composition) into ``moviebook/clips.json`` and refuses a missing
     or silent clip;
  2. extracts each clip's audio to ``voiceover/<scene>.mp3`` (a clip with no speaker keeps its own ambience; the
     voiceover is the clip's audio, never TTS, so the voice cannot drift from the picture);
  3. rebuilds the scenes with the measured frame counts (``moviebook_build_scenes.py``);
  4. builds the storyboard with the MovieBook pacing: 0.1 s between scenes, 6-frame dissolves, **no silence trimming**
     (trimming would break the sync between the clip's picture and its audio). See ``_storyboard_pacing.py``.
Needs ffmpeg and ffprobe. Safe to re-run.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from _storyboard_pacing import finalize  # noqa: E402
from moviebook_build_scenes import COMP_FPS, build, shot_id  # noqa: E402

BUFFER_SECONDS = 0.1
TRANSITION = {"style": "fade", "duration_frames": 6}


def probe(clip: Path) -> dict:
    """Frame count, rate, duration and whether there is an audio stream."""
    out = json.loads(subprocess.run(
        ["ffprobe", "-v", "error", "-show_streams", "-show_format", "-of", "json", str(clip)], capture_output=True, check=True, text=True).stdout)
    video = next((s for s in out["streams"] if s["codec_type"] == "video"), None)
    if video is None:
        raise ValueError("no video stream")
    num, den = (int(x) for x in video["r_frame_rate"].split("/"))
    fps = num / den
    duration = float(video.get("duration") or out["format"]["duration"])
    frames = int(video["nb_frames"]) if video.get("nb_frames", "N/A").isdigit() else round(duration * fps)
    return {"fps": fps, "frames_src": frames, "duration": duration, "has_audio": any(s["codec_type"] == "audio" for s in out["streams"]),
            "width": video["width"], "height": video["height"]}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--skip-voice-check", action="store_true")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    mb = project_dir / "moviebook"
    plan = json.loads((mb / "plan.json").read_text(encoding="utf-8"))
    if shutil.which("ffmpeg") is None or shutil.which("ffprobe") is None:
        print("ffmpeg and ffprobe must be on PATH", file=sys.stderr)
        return 1

    measured: dict[str, dict] = {}
    problems = []
    for shot in plan["shots"]:
        sid = shot_id(shot)
        clip = mb / "clips" / f"{sid}.mp4"
        if not clip.exists():
            problems.append(f"{sid}: clip {clip.name} is missing")
            continue
        try:
            info = probe(clip)
        except (ValueError, subprocess.CalledProcessError) as e:
            problems.append(f"{sid}: cannot read the clip ({e})")
            continue
        if shot.get("speaker") and not info["has_audio"]:
            problems.append(f"{sid}: the clip has no audio but {shot['speaker']} has a line")
        info["frames"] = round(info["frames_src"] / info["fps"] * COMP_FPS)
        measured[sid] = info
    if problems:
        print("Cannot finalize:\n  " + "\n  ".join(problems), file=sys.stderr)
        return 1

    qc = mb / "qc_voice.json"
    if args.skip_voice_check:
        print("WARNING: voice check skipped; pitch and dialogue are unchecked")
    else:
        if not qc.exists():
            print("moviebook/qc_voice.json is missing: run scripts/moviebook_voice_check.py check <project> (or --skip-voice-check)", file=sys.stderr)
            return 1
        report = json.loads(qc.read_text(encoding="utf-8"))
        newest_clip = max((mb / "clips" / f"{s}.mp4").stat().st_mtime for s in measured)
        if not report.get("passed"):
            print("moviebook/qc_voice.json did not pass: fix the listed shots (or --skip-voice-check)", file=sys.stderr)
            return 1
        if qc.stat().st_mtime < newest_clip:
            print("moviebook/qc_voice.json is older than a clip: re-run the voice check", file=sys.stderr)
            return 1
        if not report.get("asr_checked"):
            print("WARNING: the passing voice check skipped Whisper; dialogue is unchecked")

    (mb / "clips.json").write_text(json.dumps(measured, indent=2), encoding="utf-8")
    voiceover = project_dir / "voiceover"
    voiceover.mkdir(exist_ok=True)
    for sid, info in measured.items():
        dst = voiceover / f"{sid}.mp3"
        clip = mb / "clips" / f"{sid}.mp4"
        if info["has_audio"]:
            cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(clip), "-vn", "-ar", "44100", "-c:a", "libmp3lame", "-q:a", "2", str(dst)]
        else:  # a silent establishing shot still needs an audio file of its own length
            cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", f"{info['duration']:.3f}", "-c:a", "libmp3lame", "-q:a", "2", str(dst)]
        subprocess.run(cmd, check=True)
    print(f"Extracted {len(measured)} dialogue tracks to {voiceover}")

    code = build(project_dir)
    if code:
        return code
    return finalize(args.project, args.projects_dir, BUFFER_SECONDS, TRANSITION, trim=False)


if __name__ == "__main__":
    sys.exit(main())
