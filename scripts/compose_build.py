"""Build a composed story: render each chapter in its own style bundle, normalise, and join them.

Usage:
    python scripts/compose_build.py <story> [--check] [--rerender] [--only ID[,ID]] [--no-join]

Reads ``projects/<story>/story.json``. For every chapter it makes sure ``projects/<project>/output/final.mp4``
exists (rendering the project with ``python -m src.cli render`` when it is missing, or when ``--rerender`` or
``--only`` names it), normalises it to the story's size, fps and audio format into
``projects/<story>/build/<id>.mp4`` and joins the chapters with a short crossfade (or a hard cut) into
``projects/<story>/output/final.mp4``.
``fit`` handles aspect differences: ``blur-pad`` (default: the chapter sits on a blurred copy of itself),
``pad`` (black bars) or ``crop``. ``--check`` only validates the story (projects exist, each project's
``style_bundle`` equals the chapter's ``bundle``, one TTS voice everywhere) and exits. Needs ffmpeg and ffprobe.
Chapters never share code: each is a complete video in its own bundle, so the bundle rules and the guard hook hold.
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
ENCODE = ["-c:v", "libx264", "-crf", "18", "-preset", "medium", "-c:a", "aac", "-b:a", "192k", "-ar", "48000"]


def probe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type:format=duration", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout
    data = json.loads(out)
    return {"duration": float(data["format"]["duration"]), "audio": any(s["codec_type"] == "audio" for s in data["streams"])}


def validate(story: dict, projects: Path) -> list[str]:
    errors: list[str] = []
    voices = set()
    for c in story["chapters"]:
        if c["bundle"] == "file":
            if not (projects / story["_id"] / c["file"]).exists():
                errors.append(f"{c['id']}: file {c['file']} is missing (put the mp4 in projects/{story['_id']}/)")
            continue
        cfg_path = projects / c["project"] / "config.json"
        if not cfg_path.exists():
            errors.append(f"{c['id']}: project {c['project']} not found")
            continue
        cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
        if cfg.get("style_bundle") != c["bundle"]:
            errors.append(f"{c['id']}: project style_bundle is {cfg.get('style_bundle')!r}, chapter says {c['bundle']!r}")
        tts = cfg.get("tts", {})
        voices.add(f"{tts.get('provider')}/{tts.get('voice_id')}")
    if len(voices) > 1:
        errors.append(f"chapters use different TTS voices {sorted(voices)}; one narrator should speak the whole story")
    return errors


def chapter_source(story: dict, c: dict, projects: Path, rerender: bool) -> Path:
    if c["bundle"] == "file":
        return projects / story["_id"] / c["file"]
    out = projects / c["project"] / "output" / "final.mp4"
    if rerender or not out.exists():
        print(f"[{c['id']}] rendering {c['project']} ({c['bundle']})")
        env = {**os.environ, "PYTHONUTF8": "1"}
        if c["bundle"] == "isofigure":  # an interactive figure is recorded from its tour.json, not rendered by Remotion
            cmd = [sys.executable, str(REPO_ROOT / "scripts" / "isofigure_capture_video.py"), c["project"], "--projects-dir", str(projects)]
        else:
            cmd = [sys.executable, "-m", "src.cli", "--projects-dir", str(projects), "render", c["project"]]
        subprocess.run(cmd, check=True, cwd=REPO_ROOT, env=env)
    if not out.exists():
        raise SystemExit(f"[{c['id']}] render produced no {out}")
    return out


def normalise(src: Path, dst: Path, target: dict, fit: str, info: dict) -> None:
    w, h, fps = target["width"], target["height"], target["fps"]
    inside = f"scale={w}:{h}:force_original_aspect_ratio=decrease"
    tail = f"fps={fps},format=yuv420p,setsar=1[v]"
    if fit == "crop":
        vf = f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},{tail}"
    elif fit == "pad":
        vf = f"{inside},pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:black,{tail}"
    else:
        vf = (f"split[a][b];[a]scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},boxblur=40:6[bg];"
              f"[b]{inside}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,{tail}")
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(src)]
    if not info["audio"]:
        cmd += ["-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={info['duration']:.3f}"]
    audio_in = "[0:a]" if info["audio"] else "[1:a]"
    cmd += ["-filter_complex", f"[0:v]{vf};{audio_in}aresample=48000,aformat=channel_layouts=stereo[a]",
            "-map", "[v]", "-map", "[a]", *ENCODE, str(dst)]
    subprocess.run(cmd, check=True)


def join(clips: list[Path], durations: list[float], seconds: float, style: str, dst: Path) -> None:
    if len(clips) == 1:
        shutil.copy2(clips[0], dst)
        return
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for c in clips:
        cmd += ["-i", str(c)]
    if style == "cut":
        ins = "".join(f"[{i}:v][{i}:a]" for i in range(len(clips)))
        graph = f"{ins}concat=n={len(clips)}:v=1:a=1[v][a]"
    else:
        # Each crossfade starts `seconds` before the end of everything joined so far.
        parts, v_prev, a_prev, acc = [], "0:v", "0:a", durations[0]
        for i in range(1, len(clips)):
            parts.append(f"[{v_prev}][{i}:v]xfade=transition=fade:duration={seconds}:offset={acc - seconds:.3f}[v{i}]")
            parts.append(f"[{a_prev}][{i}:a]acrossfade=d={seconds}[a{i}]")
            acc += durations[i] - seconds
            v_prev, a_prev = f"v{i}", f"a{i}"
        graph = ";".join(parts) + f";[{v_prev}]null[v];[{a_prev}]anull[a]"
    cmd += ["-filter_complex", graph, "-map", "[v]", "-map", "[a]", *ENCODE, str(dst)]
    subprocess.run(cmd, check=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("story")
    parser.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    parser.add_argument("--check", action="store_true", help="Validate story.json and the chapter projects, then exit")
    parser.add_argument("--rerender", action="store_true", help="Render every chapter again even if its final.mp4 exists")
    parser.add_argument("--only", default="", help="Comma list of chapter ids to render again; the join still uses all chapters")
    parser.add_argument("--no-join", action="store_true", help="Stop after normalising the chapters")
    args = parser.parse_args(argv)

    projects = Path(args.projects_dir)
    story_dir = projects / args.story
    path = story_dir / "story.json"
    if not path.exists():
        print(f"{path} not found; run scripts/compose_new_story.py first", file=sys.stderr)
        return 1
    story = json.loads(path.read_text(encoding="utf-8"))
    story["_id"] = args.story
    errors = validate(story, projects)
    for e in errors:
        print(f"ERROR {e}", file=sys.stderr)
    if errors:
        return 1
    if args.check:
        print(f"OK: {len(story['chapters'])} chapters, voice {story.get('voice') or 'default'}")
        return 0
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        print("ffmpeg and ffprobe must be on PATH", file=sys.stderr)
        return 1

    only = {x for x in args.only.split(",") if x}
    build = story_dir / "build"
    build.mkdir(parents=True, exist_ok=True)
    clips, durations, plan = [], [], []
    for c in story["chapters"]:
        src = chapter_source(story, c, projects, rerender=args.rerender or c["id"] in only)
        dst = build / f"{c['id']}.mp4"
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            print(f"[{c['id']}] normalising {src.name} -> {dst.name}")
            normalise(src, dst, story["target"], story.get("fit", "blur-pad"), probe(src))
        info = probe(dst)
        clips.append(dst)
        durations.append(info["duration"])
        plan.append({"id": c["id"], "bundle": c["bundle"], "source": str(src), "seconds": round(info["duration"], 2)})
    if args.no_join:
        return 0

    tr = story.get("transition", {"style": "fade", "seconds": 0.5})
    too_short = [p["id"] for p in plan if p["seconds"] <= 2 * float(tr.get("seconds", 0.5))] if tr.get("style", "fade") == "fade" else []
    if too_short:
        print(f"ERROR chapters {too_short} are not longer than two crossfades ({tr.get('seconds', 0.5)} s each); lengthen them or use a cut", file=sys.stderr)
        return 1
    out_dir = story_dir / "output"
    out_dir.mkdir(exist_ok=True)
    final = out_dir / "final.mp4"
    join(clips, durations, float(tr.get("seconds", 0.5)), tr.get("style", "fade"), final)
    (story_dir / "plan").mkdir(exist_ok=True)
    (story_dir / "plan" / "compose.json").write_text(json.dumps({"chapters": plan, "output": str(final)}, indent=2), encoding="utf-8")
    print(f"Story built: {final} ({probe(final)['duration']:.1f}s, {len(clips)} chapters)")
    print(f"Next: inspect frames at every chapter boundary, then python scripts/continuity_qc.py --project {args.story}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
