"""Local API for the pipeline UI. Binds to localhost only; see docs/UI_SPEC.md.

The server runs a fixed set of commands from the step table (``steps.py``) against folders under
``projects/``. There is no endpoint that runs an arbitrary command, and project names must be plain
ids of existing projects.
"""

from __future__ import annotations

import asyncio
import json
import shutil
import sys
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel, Field

from .jobs import BusyError, JobManager
from .projects import (
    NAME_RE, approve, keep_user_settings, load_config, project_channel, project_path, project_summary, resolve_path,
    save_config, slugify, source_path, step_statuses,
)
from .steps import FULL_CHANNELS, STEP_IDS, Ctx, step_by_id

REPO_ROOT = Path(__file__).resolve().parents[2]
TTS_PROVIDERS = ("edge", "elevenlabs", "mock")
HEX_COLOR = r"^#[0-9a-fA-F]{6}$"
DOC_KINDS = {"script": "@script", "narration": "@narration"}


class CreateProject(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    id: str | None = None
    channel: str = ""  # "" = standard project
    prompt: str = ""  # a one-line idea; seeds input/source.md
    source_text: str = ""  # typed or pasted Markdown; wins over prompt
    target_seconds: int = Field(default=90, ge=10, le=1800)
    tts_provider: str = "edge"


class SourceBody(BaseModel):
    text: str


class DocBody(BaseModel):
    content: dict | list


class RunOptions(BaseModel):
    force: bool = False
    provider: str | None = None  # voiceover only
    preview: bool = False  # render only


class SettingsBody(BaseModel):
    title: str | None = None
    target_seconds: int | None = Field(default=None, ge=10, le=1800)
    tts_provider: str | None = None
    voice_id: str | None = None
    primary_color: str | None = Field(default=None, pattern=HEX_COLOR)
    secondary_color: str | None = Field(default=None, pattern=HEX_COLOR)
    background_color: str | None = Field(default=None, pattern=HEX_COLOR)
    font_family: str | None = Field(default=None, max_length=80, pattern=r"^[A-Za-z0-9 _-]+$")


LOCAL_HOSTS = {"127.0.0.1", "localhost"}
LOCAL_ORIGINS = {f"http://{h}:{port}" for h in LOCAL_HOSTS for port in (8765, 5173)}


def create_app(
    repo_root: Path = REPO_ROOT, projects_dir: Path | None = None, extra_hosts: tuple[str, ...] = (),
) -> FastAPI:
    projects_dir = projects_dir or repo_root / "projects"
    jobs = JobManager(repo_root, projects_dir)
    app = FastAPI(title="video_explainer UI", docs_url="/api/docs", openapi_url="/api/openapi.json")
    hosts = LOCAL_HOSTS | set(extra_hosts)

    @app.middleware("http")
    async def local_only(request: Request, call_next):
        """Stop other web pages from driving this server. A POST with no body needs no CORS preflight,
        so a page the user visits could otherwise start a render. Checks the Host header (DNS
        rebinding) and, for anything that changes state, the Origin header."""
        host = (request.headers.get("host") or "").rsplit(":", 1)[0]
        if host not in hosts:
            return JSONResponse({"detail": "Host not allowed"}, status_code=403)
        origin = request.headers.get("origin")
        if request.method not in ("GET", "HEAD", "OPTIONS") and origin and origin not in LOCAL_ORIGINS:
            return JSONResponse({"detail": "Origin not allowed"}, status_code=403)
        return await call_next(request)
    app.add_middleware(
        CORSMiddleware, allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_methods=["*"], allow_headers=["*"],
    )

    def need_project(name: str) -> Path:
        path = project_path(projects_dir, name)
        if path is None:
            raise HTTPException(404, f"No such project: {name}")
        return path

    # ----- environment ---------------------------------------------------------------------------
    @app.get("/api/health")
    def health() -> dict:
        def chip(ok: bool, detail: str, fix: str) -> dict:
            return {"ok": ok, "detail": detail, "fix": "" if ok else fix}

        try:
            import edge_tts  # noqa: F401
            edge = True
        except ImportError:
            edge = False
        return {
            "python": chip(True, sys.version.split()[0], ""),
            "node": chip(bool(shutil.which("node")), shutil.which("node") or "not found", "Install Node 22"),
            "ffmpeg": chip(bool(shutil.which("ffmpeg")), shutil.which("ffmpeg") or "not found",
                           "winget install Gyan.FFmpeg"),
            "claude": chip(bool(shutil.which("claude")), shutil.which("claude") or "not found",
                           "Install Claude Code; LLM steps shell out to it"),
            "tts_edge": chip(edge, "edge-tts" if edge else "missing", "pip install edge-tts"),
            "remotion": chip((repo_root / "remotion" / "node_modules").is_dir(), "remotion/node_modules",
                             "cd remotion && npm install"),
            "channels": list(FULL_CHANNELS),
        }

    # ----- projects ------------------------------------------------------------------------------
    @app.get("/api/projects")
    def list_projects() -> list[dict]:
        out = []
        for cfg in sorted(projects_dir.glob("*/config.json")):
            d = cfg.parent
            if not NAME_RE.match(d.name):
                continue
            try:
                out.append(project_summary(d, jobs.history(d.name)))
            except (OSError, json.JSONDecodeError):
                continue
        return sorted(out, key=lambda p: p["last_activity"] or 0, reverse=True)

    @app.post("/api/projects", status_code=201)
    def create_project(body: CreateProject) -> dict:
        from src.project.loader import create_project as make

        if body.channel and body.channel not in FULL_CHANNELS:
            raise HTTPException(400, f"Unsupported channel {body.channel!r}. Use one of {list(FULL_CHANNELS)} "
                                     "or leave it empty. Vantage shorts are run from the CLI.")
        if body.tts_provider not in TTS_PROVIDERS:
            raise HTTPException(400, f"tts_provider must be one of {list(TTS_PROVIDERS)}")
        name = body.id or slugify(body.title)
        if not NAME_RE.match(name):
            raise HTTPException(400, "Project id: lowercase letters, digits, - and _ only (max 64)")
        try:
            project = make(project_id=name, title=body.title, projects_dir=projects_dir)
        except ValueError as e:
            raise HTTPException(409, str(e)) from e
        d = Path(project.root_dir)
        config = load_config(d)
        config["video"]["target_duration_seconds"] = body.target_seconds
        config["tts"]["provider"] = body.tts_provider
        if body.channel:
            config["channel"] = body.channel
        save_config(d, config)
        text = body.source_text.strip() or body.prompt.strip()
        if text:
            src = source_path(d, config)
            src.parent.mkdir(parents=True, exist_ok=True)
            src.write_text(text + "\n", encoding="utf-8")
        return project_summary(d, [])

    @app.get("/api/projects/{name}")
    def get_project(name: str) -> dict:
        d = need_project(name)
        summary = project_summary(d, jobs.history(name))
        active = jobs.active(name)
        summary["active_job"] = active.summary() if active else None
        return summary

    @app.put("/api/projects/{name}/settings")
    def put_settings(name: str, body: SettingsBody) -> dict:
        d = need_project(name)
        config = load_config(d)
        if body.tts_provider and body.tts_provider not in TTS_PROVIDERS:
            raise HTTPException(400, f"tts_provider must be one of {list(TTS_PROVIDERS)}")
        if body.title is not None:
            config["title"] = body.title
        if body.target_seconds is not None:
            config["video"]["target_duration_seconds"] = body.target_seconds
        if body.tts_provider is not None:
            config["tts"]["provider"] = body.tts_provider
        if body.voice_id is not None:
            config["tts"]["voice_id"] = body.voice_id
        for field in ("primary_color", "secondary_color", "background_color", "font_family"):
            value = getattr(body, field)
            if value is not None:
                config.setdefault("style", {})[field] = value
        save_config(d, config)
        return project_summary(d, jobs.history(name))

    # ----- source document and step documents ----------------------------------------------------
    @app.get("/api/projects/{name}/source")
    def get_source(name: str) -> dict:
        d = need_project(name)
        path = source_path(d, load_config(d))
        return {"path": str(path.relative_to(d)), "text": path.read_text(encoding="utf-8") if path.exists() else ""}

    @app.put("/api/projects/{name}/source")
    def put_source(name: str, body: SourceBody) -> dict:
        d = need_project(name)
        path = source_path(d, load_config(d))
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body.text, encoding="utf-8")
        return {"path": str(path.relative_to(d)), "bytes": len(body.text.encode("utf-8"))}

    @app.get("/api/projects/{name}/doc/{kind}")
    def get_doc(name: str, kind: str) -> JSONResponse:
        d = need_project(name)
        if kind not in DOC_KINDS:
            raise HTTPException(404, f"Unknown document {kind!r}; use {list(DOC_KINDS)}")
        path = resolve_path(d, load_config(d), DOC_KINDS[kind])
        if not path.exists():
            raise HTTPException(404, f"{kind} has not been created yet")
        return JSONResponse(json.loads(path.read_text(encoding="utf-8")))

    @app.put("/api/projects/{name}/doc/{kind}")
    def put_doc(name: str, kind: str, body: DocBody) -> dict:
        d = need_project(name)
        if kind not in DOC_KINDS:
            raise HTTPException(404, f"Unknown document {kind!r}; use {list(DOC_KINDS)}")
        path = resolve_path(d, load_config(d), DOC_KINDS[kind])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(body.content, indent=2, ensure_ascii=False), encoding="utf-8")
        return {"path": str(path.relative_to(d))}

    # ----- steps and jobs ------------------------------------------------------------------------
    @app.post("/api/projects/{name}/steps/{step_id}/run", status_code=202)
    def run_step(name: str, step_id: str, body: RunOptions | None = None) -> dict:
        d = need_project(name)
        body = body or RunOptions()
        step = step_by_id(step_id)
        if step is None:
            raise HTTPException(404, f"Unknown step {step_id!r}; use one of {list(STEP_IDS)}")
        config = load_config(d)
        if project_channel(config) not in ("", *FULL_CHANNELS):
            raise HTTPException(400, f"Channel {project_channel(config)!r} is run from the CLI, not this UI")
        ctx = Ctx(name, project_channel(config), d)
        variant = step.variant(ctx)
        argv = variant.build(ctx) if variant.build else None
        if variant.mode != "run" or argv is None:
            raise HTTPException(400, variant.note or f"Step {step_id!r} has nothing to run for this project")
        if body.force:
            if not variant.force_flag:
                raise HTTPException(400, f"Step {step_id!r} does not support force")
            argv = [*argv, variant.force_flag]
        if body.provider:
            if step_id != "voiceover" or body.provider not in TTS_PROVIDERS:
                raise HTTPException(400, "provider applies to voiceover only: edge, elevenlabs or mock")
            argv = [*argv, "--provider", body.provider]
        if body.preview:
            if step_id != "render":
                raise HTTPException(400, "preview applies to render only")
            argv = [*argv, "--preview"]
        is_scaffold = argv[0].startswith("scripts/") and argv[0].endswith("_new_video.py")
        try:
            job = jobs.start(name, step_id, argv, on_success=keep_user_settings(d) if is_scaffold else None)
        except BusyError as e:
            return JSONResponse({"detail": str(e), "job_id": e.job_id}, status_code=409)
        return job.summary()

    @app.post("/api/projects/{name}/steps/{step_id}/approve")
    def approve_step(name: str, step_id: str) -> dict:
        d = need_project(name)
        step = step_by_id(step_id)
        if step is None or not step.gated:
            raise HTTPException(400, f"Step {step_id!r} has no approval gate")
        statuses = {s["id"]: s for s in step_statuses(d, load_config(d), jobs.history(name))}
        if statuses[step_id]["output_time"] is None:
            raise HTTPException(409, f"Step {step_id!r} has no output to approve yet")
        approve(d, step_id)
        return {"approved": step_id}

    @app.get("/api/projects/{name}/jobs")
    def list_jobs(name: str) -> list[dict]:
        need_project(name)
        return [j.summary() for j in jobs.history(name)]

    @app.get("/api/projects/{name}/jobs/{job_id}")
    def get_job(name: str, job_id: str, tail: int = 200) -> dict:
        need_project(name)
        job = jobs.get(name, job_id)
        if job is None:
            raise HTTPException(404, "No such job")
        return {**job.summary(), "log": job.lines[-tail:]}

    @app.get("/api/projects/{name}/jobs/{job_id}/events")
    async def job_events(name: str, job_id: str) -> StreamingResponse:
        need_project(name)
        job = jobs.get(name, job_id)
        if job is None:
            raise HTTPException(404, "No such job")

        async def stream():
            sent = 0
            while True:
                while sent < len(job.lines):
                    yield f"data: {json.dumps({'line': job.lines[sent]})}\n\n"
                    sent += 1
                if job.status != "running" and sent >= len(job.lines):
                    break
                await asyncio.sleep(0.25)
            yield f"event: done\ndata: {json.dumps(job.summary())}\n\n"

        return StreamingResponse(stream(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    @app.post("/api/projects/{name}/jobs/{job_id}/cancel")
    def cancel_job(name: str, job_id: str) -> dict:
        need_project(name)
        job = jobs.get(name, job_id)
        if job is None:
            raise HTTPException(404, "No such job")
        if not jobs.cancel(job):
            raise HTTPException(409, f"Job is not running (status: {job.status})")
        return {"cancelled": job_id}

    # ----- files (video, audio, images) ----------------------------------------------------------
    @app.get("/api/projects/{name}/files/{path:path}")
    def get_file(name: str, path: str) -> FileResponse:
        d = need_project(name).resolve()
        target = (d / path).resolve()
        if d != target and d not in target.parents:
            raise HTTPException(400, "Path escapes the project folder")
        if not target.is_file():
            raise HTTPException(404, "No such file")
        return FileResponse(target)

    # Production: serve the built frontend (ui/web/dist) from the same port. In dev, Vite serves it.
    dist = Path(__file__).resolve().parents[1] / "web" / "dist"
    if dist.is_dir():
        from fastapi.staticfiles import StaticFiles

        app.mount("/", StaticFiles(directory=dist, html=True), name="web")

    return app


app = create_app()
