"""Shared lip sync for every style bundle: bake the voiceover into ``scenes/lipsync.ts`` once, so rendering pays nothing.

Usage (normally called from a bundle's finalize script, after the voiceover is trimmed):
    python scripts/_lipsync.py <project> [--out scenes/lipsync.ts]
    python scripts/_lipsync.py <project> --short <variant>   # Vantage shorts: one voiceover, sliced per beat

For each ``voiceover/<scene_id>.mp3`` it writes, at the project fps (``video.fps`` in config.json, default 30):
  - ``LIPSYNC.<scene>``: mouth openness per frame (0..1) from the clip's loudness. Always written; enough for tiny
    mouths such as pixel sprites.
  - ``VISEMES.<scene>``: one Rhubarb Lip Sync mouth shape per frame as a string (A..H, X = rest), when ``rhubarb`` is
    on PATH (or ``RHUBARB_BIN`` points at it). The scene's narration is passed as ``--dialogFile`` for accuracy.
    Without Rhubarb a warning is printed and only the loudness curve is written, so no video is blocked.
  - ``CAPTIONS.<scene>``: the narration text.
Shorts (``--short``) read ``short/<v>/voiceover/short_voiceover.mp3`` and the beats in
``short/<v>/storyboard/shorts_storyboard.json`` and write ``short/<v>/scenes/lipsync.ts`` keyed by beat id, each
array starting at the beat's own frame 0 (the player gives custom short scenes a beat-local clock).
Characters read these through the shared rig contract (``remotion/src/components/rig/``). Needs ffmpeg.
"""

from __future__ import annotations

import argparse
import array
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
RATE = 16000
SHAPES = "ABCDEFGHX"


def project_fps(project_dir: Path, default: int = 30) -> int:
    cfg = project_dir / "config.json"
    if not cfg.exists():
        return default
    return int(json.loads(cfg.read_text(encoding="utf-8")).get("video", {}).get("fps") or default)


def mouth_curve(audio: Path, fps: int = 30) -> list[float]:
    """Loudness per 1/fps window, normalised to 0..1 and lightly smoothed: how far the mouth opens."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(audio), "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
        capture_output=True, check=True,
    ).stdout
    samples = array.array("h")
    samples.frombytes(raw[: len(raw) // 2 * 2])
    step = RATE // fps
    rms = []
    for i in range(0, len(samples) - step + 1, step):
        chunk = samples[i:i + step]
        rms.append((sum(s * s for s in chunk) / step) ** 0.5)
    if not rms:
        return []
    ordered = sorted(rms)
    ref = max(ordered[int(len(ordered) * 0.92)], 1.0)
    floor = ref * 0.08
    raw_open = [0.0 if r < floor else min(1.0, (r / ref) ** 0.8) for r in rms]
    smooth = []
    for i, x in enumerate(raw_open):
        prev = raw_open[i - 1] if i else x
        smooth.append(round(0.6 * x + 0.4 * prev, 2))
    return smooth


def find_rhubarb() -> str | None:
    env = os.environ.get("RHUBARB_BIN")
    if env and Path(env).is_file():
        return env
    return shutil.which("rhubarb")


def rhubarb_cues(audio: Path, dialog: str, rhubarb: str) -> list[dict]:
    """Rhubarb's mouth cues for one clip: ``[{"start": s, "end": s, "value": "A".."X"}, ...]``.

    Rhubarb reads WAV or OGG, not MP3, so the clip is converted with ffmpeg first.
    """
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "clip.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(audio), "-ac", "1", "-ar", str(RATE), str(wav)], check=True)
        out = Path(tmp) / "cues.json"  # with -q Rhubarb prints nothing to stdout, so it writes a file
        cmd = [rhubarb, "-q", "-f", "json", "--extendedShapes", "GHX", "-o", str(out), str(wav)]
        if dialog.strip():
            dialog_file = Path(tmp) / "dialog.txt"
            dialog_file.write_text(dialog, encoding="utf-8")
            cmd[1:1] = ["--dialogFile", str(dialog_file)]
        subprocess.run(cmd, capture_output=True, check=True)
        return json.loads(out.read_text(encoding="utf-8")).get("mouthCues", [])


def cues_to_frames(cues: list[dict], fps: int, frames: int) -> str:
    """One shape letter per frame: the cue covering each frame's start time (X where no cue covers it)."""
    out = []
    i = 0
    for f in range(frames):
        t = f / fps
        while i < len(cues) and cues[i]["end"] <= t:
            i += 1
        v = cues[i]["value"] if i < len(cues) and cues[i]["start"] <= t else "X"
        out.append(v if v in SHAPES else "X")
    return "".join(out)


def bake(project_dir: Path, fps: int | None = None) -> tuple[dict[str, list[float]], dict[str, str]]:
    """Openness curves and (when Rhubarb is available) shape strings for every voiceover clip."""
    fps = fps or project_fps(project_dir)
    clips = [c for c in sorted((project_dir / "voiceover").glob("*.mp3")) if c.stat().st_size]  # TTS writes 0 bytes for silence
    texts = _captions(project_dir)
    rhubarb = find_rhubarb()
    if clips and not rhubarb:
        print("Warning: rhubarb not on PATH (or RHUBARB_BIN); writing loudness lip sync only (no mouth shapes). "
              "See CLAUDE.md, Setup.", file=sys.stderr)
    lipsync: dict[str, list[float]] = {}
    visemes: dict[str, str] = {}
    for clip in clips:
        lipsync[clip.stem] = mouth_curve(clip, fps)
        if rhubarb:
            try:
                cues = rhubarb_cues(clip, texts.get(clip.stem, ""), rhubarb)
                visemes[clip.stem] = cues_to_frames(cues, fps, len(lipsync[clip.stem]))
            except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
                print(f"Warning: rhubarb failed on {clip.name} ({e}); loudness only for this scene", file=sys.stderr)
    return lipsync, visemes


def _captions(project_dir: Path) -> dict[str, str]:
    path = project_dir / "narration" / "narrations.json"
    if not path.exists():
        return {}
    narr = json.loads(path.read_text(encoding="utf-8"))
    return {s["scene_id"]: s.get("narration", "") for s in narr.get("scenes", [])}


def write_lipsync_ts(project_dir: Path, lipsync: dict[str, list[float]], visemes: dict[str, str] | None = None,
                     out: Path | None = None) -> Path:
    out = out or project_dir / "scenes" / "lipsync.ts"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        "/** Generated by scripts/_lipsync.py: mouth openness and Rhubarb mouth shapes per frame from the voiceover "
        f"(at {project_fps(project_dir)} fps), captions from the narration. */\n"
        f"export const LIPSYNC: Record<string, number[] | undefined> = {json.dumps(lipsync)};\n"
        f"export const VISEMES: Record<string, string | undefined> = {json.dumps(visemes or {}, indent=2)};\n"
        f"export const CAPTIONS: Record<string, string | undefined> = {json.dumps(_captions(project_dir), ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    return out


def bake_and_write(project_dir: Path, out: Path | None = None) -> Path:
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is not on PATH")
    lipsync, visemes = bake(project_dir)
    path = write_lipsync_ts(project_dir, lipsync, visemes, out)
    shapes = f", mouth shapes for {len(visemes)}" if visemes else ""
    print(f"Lip sync for {len(lipsync)} scenes{shapes} written to {path}")
    return path


def bake_short(project_dir: Path, variant: str) -> Path:
    """Lip sync for a short: the single voiceover sliced at each beat's start and end."""
    if shutil.which("ffmpeg") is None:
        raise SystemExit("ffmpeg is not on PATH")
    short = project_dir / "short" / variant
    board = json.loads((short / "storyboard" / "shorts_storyboard.json").read_text(encoding="utf-8"))
    clip = short / "voiceover" / "short_voiceover.mp3"
    fps = project_fps(project_dir)
    curve = mouth_curve(clip, fps)
    rhubarb = find_rhubarb()
    shapes = ""
    if rhubarb:
        dialog = " ".join(b.get("caption_text", "") for b in board["beats"])
        try:
            shapes = cues_to_frames(rhubarb_cues(clip, dialog, rhubarb), fps, len(curve))
        except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
            print(f"Warning: rhubarb failed on {clip.name} ({e}); loudness only", file=sys.stderr)
    else:
        print("Warning: rhubarb not on PATH (or RHUBARB_BIN); writing loudness lip sync only.", file=sys.stderr)
    lipsync, visemes, captions = {}, {}, {}
    for b in board["beats"]:
        a, z = round(b["start_seconds"] * fps), round(b["end_seconds"] * fps)
        lipsync[b["id"]] = curve[a:z]
        if shapes:
            visemes[b["id"]] = shapes[a:z]
        captions[b["id"]] = b.get("caption_text", "")
    out = short / "scenes" / "lipsync.ts"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        f"/** Generated by scripts/_lipsync.py --short {variant}: per-beat mouth openness and Rhubarb mouth shapes "
        f"(at {fps} fps, beat-local frames), captions from the storyboard. */\n"
        f"export const LIPSYNC: Record<string, number[] | undefined> = {json.dumps(lipsync)};\n"
        f"export const VISEMES: Record<string, string | undefined> = {json.dumps(visemes, indent=2)};\n"
        f"export const CAPTIONS: Record<string, string | undefined> = {json.dumps(captions, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(f"Lip sync for {len(lipsync)} beats{' with mouth shapes' if shapes else ''} written to {out}")
    return out


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--out", help="Output .ts path (default: projects/<p>/scenes/lipsync.ts)")
    parser.add_argument("--short", metavar="VARIANT", help="Bake a short's single voiceover per beat instead")
    args = parser.parse_args(argv)
    project_dir = Path(args.projects_dir) / args.project
    if args.short:
        bake_short(project_dir, args.short)
        return 0
    bake_and_write(project_dir, Path(args.out) if args.out else None)
    return 0


if __name__ == "__main__":
    sys.exit(main())
