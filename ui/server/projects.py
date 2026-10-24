"""Project folders: name validation, config, source document, and per-step status from files."""

from __future__ import annotations

import json
import re
import shlex
import time
from pathlib import Path

from .jobs import Job
from .steps import DEFAULT_PATHS, FULL_STYLE_BUNDLES, HIDDEN, MANUAL, RUN, SKIPPED, STEPS, Ctx, StepDef

NAME_RE = re.compile(r"^[a-z0-9][a-z0-9_-]{0,63}$")
# One command can write several steps' files a few milliseconds apart (a style bundle scaffold writes the
# scenes and then the narration). Real edits are minutes apart, so ignore differences smaller than this.
STALE_TOLERANCE_SECONDS = 5.0


def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:64] or "video"


def project_path(projects_dir: Path, name: str) -> Path | None:
    """The project folder, or None if the name is not a plain id of an existing project."""
    if not NAME_RE.match(name):
        return None
    path = projects_dir / name
    return path if (path / "config.json").is_file() else None


def load_config(project_dir: Path) -> dict:
    return json.loads((project_dir / "config.json").read_text(encoding="utf-8"))


def save_config(project_dir: Path, config: dict) -> None:
    (project_dir / "config.json").write_text(json.dumps(config, indent=2), encoding="utf-8")


def source_path(project_dir: Path, config: dict) -> Path:
    return project_dir / config.get("source", {}).get("document", "input/source.md")


def resolve_path(project_dir: Path, config: dict, spec: str) -> Path:
    """`@key` is a path from config.json "paths"; anything else is relative to the project folder."""
    if spec.startswith("@"):
        key = spec[1:]
        return project_dir / config.get("paths", {}).get(key, DEFAULT_PATHS.get(key, key))
    return project_dir / spec


def _mtime(path: Path) -> float | None:
    """Newest modification time of a file, or of the files in a folder; None if absent or empty."""
    if path.is_file():
        return path.stat().st_mtime
    if path.is_dir():
        times = [p.stat().st_mtime for p in path.rglob("*") if p.is_file()]
        return max(times) if times else None
    return None


# State file: {"approved": {step_id: epoch_seconds}}
def _state_path(project_dir: Path) -> Path:
    return project_dir / ".ui" / "state.json"


def load_state(project_dir: Path) -> dict:
    try:
        return json.loads(_state_path(project_dir).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"approved": {}}


def approve(project_dir: Path, step_id: str) -> None:
    state = load_state(project_dir)
    state.setdefault("approved", {})[step_id] = time.time()
    _state_path(project_dir).parent.mkdir(parents=True, exist_ok=True)
    _state_path(project_dir).write_text(json.dumps(state, indent=2), encoding="utf-8")


def project_style_bundle(config: dict) -> str:
    return config.get("style_bundle") or ""


def _output_time(step: StepDef, ctx: Ctx, config: dict, jobs: list[Job]) -> float | None:
    v = step.variant(ctx)
    if v.job_output:
        ok = [j.finished for j in jobs if j.step == step.id and j.status == "succeeded" and j.finished]
        return max(ok) if ok else None
    times = [t for t in (_mtime(resolve_path(ctx.project_dir, config, o)) for o in v.outputs) if t is not None]
    if not times:
        return None
    # A scaffold copies template files that keep their old modification times, so a successful run of
    # the step counts as producing its output when the job finished.
    ran = [j.finished for j in jobs if j.step == step.id and j.status == "succeeded" and j.finished]
    return max(times + ran)


def keep_user_settings(project_dir: Path):
    """Snapshot the settings a user chose at creation; the returned function puts them back.

    Style bundle scaffold scripts reset the project config (for example to edge TTS), which would silently
    discard the voice and length picked on the Home screen.
    """
    config = load_config(project_dir)
    kept = {
        "provider": config.get("tts", {}).get("provider"),
        "voice_id": config.get("tts", {}).get("voice_id"),
        "target": config.get("video", {}).get("target_duration_seconds"),
    }

    def restore() -> None:
        fresh = load_config(project_dir)
        tts, video = fresh.setdefault("tts", {}), fresh.setdefault("video", {})
        if kept["provider"] is not None:
            tts["provider"] = kept["provider"]
        if kept["voice_id"] is not None:
            tts["voice_id"] = kept["voice_id"]
        if kept["target"] is not None:
            video["target_duration_seconds"] = kept["target"]
        save_config(project_dir, fresh)

    return restore


def _copyable_commands(step_id: str, argv: list[str] | None) -> list[dict]:
    """Shell commands the UI offers to copy for a step: the CLI equivalent of its Run button."""
    if argv is None:
        return []
    cmds = [{"label": "Copy command", "text": "python " + " ".join(shlex.quote(a) for a in argv)}]
    if step_id == "render":
        # Remotion Studio is where you preview scenes before rendering the final video.
        cmds = [{"label": "Copy preview command", "text": "cd remotion && npm run dev"},
                {"label": "Copy render command", "text": cmds[0]["text"]}]
    return cmds


def step_statuses(project_dir: Path, config: dict, jobs: list[Job]) -> list[dict]:
    """Status of all nine steps. `jobs` is newest first. A pure function of files and job records."""
    ctx = Ctx(project_dir.name, project_style_bundle(config), project_dir)
    approved = load_state(project_dir).get("approved", {})
    out: list[dict] = []
    upstream_times: list[float] = []  # outputs of earlier active steps, for staleness
    prev_active_has_output = True  # nothing gates the first step

    for step in STEPS:
        v = step.variant(ctx)
        argv = v.build(ctx) if (v.mode == RUN and v.build) else None
        mode = v.mode if (v.mode != RUN or argv is not None) else MANUAL
        entry = {
            "id": step.id, "title": step.title, "mode": mode, "note": v.note, "gated": step.gated,
            "can_run": argv is not None, "force_flag": v.force_flag, "output_time": None,
            "commands": _copyable_commands(step.id, argv), "optional": step.optional,
        }
        if mode in (HIDDEN, SKIPPED):
            entry["status"] = mode
            out.append(entry)
            continue

        out_time = _output_time(step, ctx, config, jobs)
        entry["output_time"] = out_time
        last = next((j for j in jobs if j.step == step.id), None)

        if last and last.status == "running":
            status = "running"
        elif last and last.status in ("failed", "interrupted") and (out_time is None or (last.finished or 0) > out_time):
            status = "failed"
        elif out_time is None:
            status = "ready" if prev_active_has_output else "not started"
        elif upstream_times and out_time < max(upstream_times) - STALE_TOLERANCE_SECONDS:
            status = "stale"
        elif not step.gated:
            status = "done"
        else:
            status = "approved" if approved.get(step.id, 0) >= out_time else "needs review"
        entry["status"] = status
        out.append(entry)

        if not step.optional:  # an optional step that has not run must not make the next step look blocked
            prev_active_has_output = out_time is not None
        # A review or verify run produces no content, so it must not make later steps stale.
        if out_time is not None and not v.job_output:
            upstream_times.append(out_time)
    return out


def sound_summary(config: dict) -> dict:
    """The Sound step's palette: the effective one, any per-project override, and the choices."""
    from src.sound import earshot_backend as eb  # lazy: importing src.sound pulls in numpy and scipy

    return {
        "palette": eb.palette_for_project(config),
        "override": (config.get("sound") or {}).get("palette", ""),
        "palettes": eb.palette_names(),
    }


def project_summary(project_dir: Path, jobs: list[Job]) -> dict:
    config = load_config(project_dir)
    statuses = step_statuses(project_dir, config, jobs)
    # An optional step counts toward progress only once it has produced output.
    active = [s for s in statuses
              if s["status"] not in ("hidden", "skipped") and not (s["optional"] and s["output_time"] is None)]
    finished = [s for s in active if s["status"] in ("approved", "done")]
    res = config.get("video", {}).get("resolution", {})
    return {
        "id": project_dir.name,
        "title": config.get("title", project_dir.name),
        "style_bundle": project_style_bundle(config),
        # Vantage shorts (and any unknown style bundle) are run from the CLI, not this UI.
        "supported": project_style_bundle(config) in ("", *FULL_STYLE_BUNDLES),
        "resolution": f"{res.get('width', '?')}x{res.get('height', '?')}",
        "fps": config.get("video", {}).get("fps"),
        "target_seconds": config.get("video", {}).get("target_duration_seconds"),
        "tts_provider": config.get("tts", {}).get("provider"),
        "voice_id": config.get("tts", {}).get("voice_id", ""),
        "style": {k: config.get("style", {}).get(k, "") for k in
                  ("primary_color", "secondary_color", "background_color", "font_family")},
        "steps": statuses,
        "sound": sound_summary(config),
        "progress": f"{len(finished)}/{len(active)}",
        "has_video": resolve_path(project_dir, config, "@final_video").is_file(),
        "final_video": resolve_path(project_dir, config, "@final_video").relative_to(project_dir).as_posix(),
        "html_output": next((n for n in ("film.html", "figure.html") if (project_dir / n).is_file()), ""),  # papercut / isofigure
        "last_activity": max((j.started for j in jobs), default=None),
    }
