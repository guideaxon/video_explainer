"""Record an Isofigure as a narrated mp4 so it can be a chapter of a composed story.

Usage:
    python scripts/isofigure_capture_video.py <project> [--no-voice] [--rebuild]

Reads ``projects/<project>/tour.json``, plays it against ``projects/<project>/figure.html`` in headless Chromium
(``scripts/isofigure_capture_video.mjs``, needs Playwright) and writes ``projects/<project>/output/final.mp4``
(1280x720, 30 fps, aac 48 kHz). The figure builds first if ``figure.html`` is missing (or with ``--rebuild``).

``tour.json``::

    {
      "lead_in": 0.6,                       # seconds of the idle figure before the first step (default 0.6)
      "steps": [
        {"say": "This is the machine.",     # narration; the step lasts at least as long as the speech
         "actions": [{"at": 0.5, "click": "power"}, {"at": 2.0, "key": "x"}],   # at = seconds into the step
         "hold": 3.0}                       # minimum step length in seconds (optional)
      ]
    }

An action is ``{"key": "x"}`` (a keyboard key: ``x`` toggles Look inside, ``l`` labels, plus the figure's own keys) or
``{"click": "<control id>"}``. The voice is the project's ``tts.voice_id`` (edge TTS; a composed story sets it so every
chapter has the same narrator). ``--no-voice`` makes a silent video. Because the timeline is built from the speech
lengths, the picture always matches the words. Needs ffmpeg, node and Playwright.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

GAP = 0.45  # seconds of air after each spoken step
TAIL = 0.8


def duration(path: Path) -> float:
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("project")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--no-voice", action="store_true")
    parser.add_argument("--rebuild", action="store_true", help="Rebuild figure.html first")
    args = parser.parse_args(argv)

    project_dir = Path(args.projects_dir) / args.project
    tour_path = project_dir / "tour.json"
    if not tour_path.exists():
        print(f"{tour_path} not found: write the tour (see this script's docstring)", file=sys.stderr)
        return 1
    for tool in ("ffmpeg", "ffprobe", "node"):
        if shutil.which(tool) is None:
            print(f"{tool} is not on PATH", file=sys.stderr)
            return 1
    tour = json.loads(tour_path.read_text(encoding="utf-8"))
    figure = project_dir / "figure.html"
    if args.rebuild or not figure.exists():
        subprocess.run([sys.executable, str(REPO_ROOT / "scripts" / "isofigure_build_html.py"), args.project], check=True, cwd=REPO_ROOT)

    work = project_dir / "capture"
    work.mkdir(exist_ok=True)
    out_dir = project_dir / "output"
    out_dir.mkdir(exist_ok=True)

    voice = ""
    cfg_path = project_dir / "config.json"
    if cfg_path.exists():
        voice = json.loads(cfg_path.read_text(encoding="utf-8")).get("tts", {}).get("voice_id", "")
    tts = None
    provider = json.loads(cfg_path.read_text(encoding="utf-8")).get("tts", {}).get("provider", "edge") if cfg_path.exists() else "edge"
    if provider != "edge" and not args.no_voice and any(s.get("say") for s in tour["steps"]):
        print(f"tts.provider is {provider!r}; the capture only voices with edge TTS (set it to edge, or use --no-voice)", file=sys.stderr)
        return 1
    if not args.no_voice and any(s.get("say") for s in tour["steps"]):
        from src.audio.tts import EdgeTTS, TTSConfig
        tts = EdgeTTS(TTSConfig(provider="edge", voice_id=voice))

    t = float(tour.get("lead_in", 0.6))
    actions, clips = [], []
    for i, step in enumerate(tour["steps"]):
        length = float(step.get("hold", 0))
        if tts and step.get("say"):
            mp3 = work / f"step{i:02d}.mp3"
            tts.generate(step["say"], mp3)
            clips.append((t, mp3))
            length = max(length, duration(mp3) + GAP)
        elif not length:
            length = 2.0
        actions += [{**a, "at": round(t + float(a["at"]), 3)} for a in step.get("actions", [])]
        t += length
    total = t + TAIL
    schedule = work / "schedule.json"
    schedule.write_text(json.dumps({"duration": total, "actions": actions}), encoding="utf-8")

    webm, timing = work / "raw.webm", work / "timing.json"
    subprocess.run(["node", str(REPO_ROOT / "scripts" / "isofigure_capture_video.mjs"), str(figure), str(schedule), str(webm), str(timing)],
                   check=True, cwd=REPO_ROOT)
    lead = json.loads(timing.read_text())["lead"]

    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", f"{lead:.3f}", "-t", f"{total:.3f}", "-i", str(webm)]
    for _, mp3 in clips:
        cmd += ["-i", str(mp3)]
    if clips:
        delays = "".join(f"[{i + 1}:a]adelay={int(at * 1000)}|{int(at * 1000)},aresample=48000[a{i}];" for i, (at, _) in enumerate(clips))
        mix = "".join(f"[a{i}]" for i in range(len(clips)))
        graph = f"{delays}{mix}amix=inputs={len(clips)}:normalize=0,aformat=channel_layouts=stereo,apad[a]"
        cmd += ["-filter_complex", graph, "-map", "0:v", "-map", "[a]"]
    else:
        cmd += ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v", "-map", "1:a"]
    cmd += ["-r", "30", "-vf", "format=yuv420p", "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-t", f"{total:.3f}", str(out_dir / "final.mp4")]
    subprocess.run(cmd, check=True)
    print(f"Isofigure video: {out_dir / 'final.mp4'} ({total:.1f}s, {len(clips)} spoken steps)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
