"""MovieBook support for the web UI: a read model of the plan, keyframes, clips and voice check, and the few edits the
panel makes (save the plan, re-roll a shot, set a voice anchor). The pipeline itself is the scripts/moviebook_*.py files;
this module only reads their files and calls them."""

from __future__ import annotations

import importlib.util
import json
import os
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ID_RE = re.compile(r"^[a-z0-9_]{1,64}$")
SEED_STEP = 101  # the same stride the Storybook stills use for a re-roll


def _builder():
    spec = importlib.util.spec_from_file_location("moviebook_build_scenes", REPO_ROOT / "scripts" / "moviebook_build_scenes.py")
    module = importlib.util.module_from_spec(spec)
    sys.path.insert(0, str(REPO_ROOT))  # the builder imports src.cli
    try:
        spec.loader.exec_module(module)
    finally:
        sys.path.remove(str(REPO_ROOT))
    return module


def plan_path(project_dir: Path) -> Path:
    return project_dir / "moviebook" / "plan.json"


def load_plan(project_dir: Path) -> dict | None:
    try:
        return json.loads(plan_path(project_dir).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return None


def _file(project_dir: Path, path: Path) -> tuple[str | None, float | None]:
    """Project-relative path and modification time of a file, or (None, None) when it does not exist."""
    if not path.is_file():
        return None, None
    return path.relative_to(project_dir).as_posix(), path.stat().st_mtime


def overview(project_dir: Path) -> dict:
    """Plan summary plus, per shot, its keyframe and clip files and the latest voice-check entry."""
    plan = load_plan(project_dir)
    if plan is None:
        return {"plan": None, "problems": [], "shots": [], "cast": [], "qc": None}
    build = _builder()
    problems = build.validate(plan)
    mb = project_dir / "moviebook"
    try:
        qc = json.loads((mb / "qc_voice.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        qc = None
    clips_newest = max((p.stat().st_mtime for p in (mb / "clips").glob("*.mp4")), default=0)
    qc_stale = bool(qc) and (mb / "qc_voice.json").stat().st_mtime < clips_newest
    shots = []
    for s in plan.get("shots", []):
        if not s.get("title"):
            continue
        sid = build.shot_id(s)
        keyframe, keyframe_time = _file(project_dir, mb / "keyframes" / f"{sid}.png")
        clip, clip_time = _file(project_dir, mb / "clips" / f"{sid}.mp4")
        shots.append({
            "id": sid, "title": s["title"], "speaker": s.get("speaker"), "line": s.get("line", ""), "visual": s.get("visual", ""),
            "cast": s.get("cast", []), "seed": s.get("seed"), "clip_seed": s.get("clip_seed", s.get("seed")),
            "keyframe": keyframe, "keyframe_time": keyframe_time, "clip": clip, "clip_time": clip_time,
            "qc": (qc or {}).get("shots", {}).get(sid),
        })
    cast = [{"key": k, "name": c.get("name", k), "gender": c.get("gender", ""), "description": c.get("voice", {}).get("description", ""),
             "anchor_hz": c.get("voice", {}).get("anchor_hz"), "tolerance": c.get("voice", {}).get("tolerance", 0.12)}
            for k, c in plan.get("cast", {}).items()]
    return {"plan": plan, "problems": problems, "shots": shots, "cast": cast,
            "qc": None if qc is None else {"passed": qc.get("passed"), "asr_checked": qc.get("asr_checked"), "stale": qc_stale,
                                           "speaker_f0_hz": qc.get("speaker_f0_hz", {})}}


def save_plan(project_dir: Path, plan: dict) -> list[str]:
    """Validate and write the plan. Returns the problems; nothing is written when there are any."""
    problems = _builder().validate(plan)
    if problems:
        return problems
    path = plan_path(project_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
    return []


def reroll(project_dir: Path, shot: str, kind: str) -> dict:
    """Move a shot's seed so the next run of its step gives a different result. The keyframe and the clip have separate seeds."""
    plan = load_plan(project_dir)
    if plan is None:
        raise ValueError("no plan yet")
    if kind not in ("keyframe", "clip"):
        raise ValueError("kind must be keyframe or clip")
    build = _builder()
    for s in plan["shots"]:
        if s.get("title") and build.shot_id(s) == shot:
            if kind == "keyframe":
                s.setdefault("clip_seed", s.get("seed", 1000))  # keep the clip's seed where it was
                s["seed"] = s.get("seed", 1000) + SEED_STEP
            else:
                s["clip_seed"] = s.get("clip_seed", s.get("seed", 1000)) + SEED_STEP
            plan_path(project_dir).write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
            return {"seed": s["seed"], "clip_seed": s.get("clip_seed", s["seed"])}
    raise ValueError(f"no shot {shot!r}")


def set_anchor(project_dir: Path, project: str, character: str, shot: str) -> str:
    """Measure the voice of a character in an accepted clip and store it as that character's anchor."""
    plan = load_plan(project_dir) or {}
    if character not in plan.get("cast", {}):
        raise ValueError(f"no character {character!r}")
    clip = project_dir / "moviebook" / "clips" / f"{shot}.mp4"
    if not clip.is_file():
        raise ValueError(f"clip {shot}.mp4 does not exist yet")
    done = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts" / "moviebook_voice_check.py"), "--projects-dir", str(project_dir.parent), "anchor", project, character, str(clip)],
        capture_output=True, text=True, cwd=REPO_ROOT, env={**os.environ, "PYTHONUTF8": "1"},
    )
    if done.returncode:
        raise ValueError((done.stderr or done.stdout).strip() or "anchoring failed")
    return done.stdout.strip()
