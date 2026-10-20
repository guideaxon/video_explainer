"""Run pipeline commands as background jobs, one at a time per project, with a log you can stream.

A job is a subprocess of the same Python that runs the server (the project's venv). Its output is
appended to ``projects/<p>/.ui/jobs/<id>.log`` and its record to ``<id>.json``. The record is history
only; project status comes from the project's files.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path


class BusyError(Exception):
    def __init__(self, job_id: str) -> None:
        super().__init__(f"A job is already running for this project: {job_id}")
        self.job_id = job_id


@dataclass
class Job:
    id: str
    project: str
    step: str
    argv: list[str]
    meta_path: Path
    log_path: Path
    status: str = "running"  # running | succeeded | failed | cancelled | interrupted
    started: float = field(default_factory=time.time)
    finished: float | None = None
    exit_code: int | None = None
    lines: list[str] = field(default_factory=list)
    proc: subprocess.Popen | None = field(default=None, repr=False)

    def summary(self) -> dict:
        return {
            "id": self.id, "project": self.project, "step": self.step, "argv": self.argv,
            "status": self.status, "started": self.started, "finished": self.finished,
            "exit_code": self.exit_code,
        }

    def save(self) -> None:
        self.meta_path.write_text(json.dumps(self.summary(), indent=2), encoding="utf-8")


def _job_from_meta(meta_path: Path) -> Job | None:
    try:
        data = json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    job = Job(
        id=data["id"], project=data["project"], step=data["step"], argv=data["argv"],
        meta_path=meta_path, log_path=meta_path.with_suffix(".log"), status=data["status"],
        started=data["started"], finished=data.get("finished"), exit_code=data.get("exit_code"),
    )
    if job.status == "running":  # the server died mid-job
        job.status, job.finished = "interrupted", job.finished or time.time()
        job.save()
    if job.log_path.exists():
        job.lines = job.log_path.read_text(encoding="utf-8", errors="replace").splitlines()
    return job


class JobManager:
    def __init__(self, repo_root: Path, projects_dir: Path) -> None:
        self.repo_root = repo_root
        self.projects_dir = projects_dir
        self._live: dict[str, Job] = {}
        self._lock = threading.Lock()

    def _jobs_dir(self, project: str) -> Path:
        d = self.projects_dir / project / ".ui" / "jobs"
        d.mkdir(parents=True, exist_ok=True)
        return d

    def active(self, project: str) -> Job | None:
        with self._lock:
            return next((j for j in self._live.values() if j.project == project and j.status == "running"), None)

    def start(self, project: str, step: str, argv: list[str]) -> Job:
        """argv is everything after the Python executable. Raises BusyError if the project has a job."""
        with self._lock:
            busy = next((j for j in self._live.values() if j.project == project and j.status == "running"), None)
            if busy:
                raise BusyError(busy.id)
            now = time.time()
            stamp = time.strftime("%Y%m%d-%H%M%S", time.localtime(now))
            job_id = f"{stamp}{int(now * 1000) % 1000:03d}-{step}"
            d = self._jobs_dir(project)
            job = Job(job_id, project, step, [sys.executable, *argv], d / f"{job_id}.json", d / f"{job_id}.log")
            self._live[job_id] = job
            env = {**os.environ, "PYTHONUTF8": "1", "PYTHONIOENCODING": "utf-8"}
            try:
                job.proc = subprocess.Popen(
                    job.argv, cwd=self.repo_root, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, encoding="utf-8", errors="replace", bufsize=1,
                )
            except OSError:
                del self._live[job_id]  # never started: do not leave the project marked busy
                raise
            job.save()
        threading.Thread(target=self._pump, args=(job,), daemon=True).start()
        return job

    def _pump(self, job: Job) -> None:
        assert job.proc and job.proc.stdout
        with job.log_path.open("w", encoding="utf-8") as log:
            for raw in job.proc.stdout:
                line = raw.rstrip("\r\n")
                job.lines.append(line)
                log.write(line + "\n")
                log.flush()
        code = job.proc.wait()
        job.exit_code, job.finished = code, time.time()
        if job.status == "running":
            job.status = "succeeded" if code == 0 else "failed"
        job.save()

    def get(self, project: str, job_id: str) -> Job | None:
        live = self._live.get(job_id)
        if live and live.project == project:
            return live
        meta = self.projects_dir / project / ".ui" / "jobs" / f"{job_id}.json"
        return _job_from_meta(meta) if meta.exists() else None

    def history(self, project: str, limit: int = 50) -> list[Job]:
        """Newest first."""
        d = self.projects_dir / project / ".ui" / "jobs"
        if not d.exists():
            return []
        jobs = []
        for meta in sorted(d.glob("*.json"), reverse=True)[:limit]:
            live = self._live.get(meta.stem)
            job = live if live and live.project == project else _job_from_meta(meta)
            if job:
                jobs.append(job)
        return jobs

    def cancel(self, job: Job) -> bool:
        if job.status != "running" or not job.proc:
            return False
        job.status = "cancelled"
        if sys.platform == "win32":  # kill the whole tree: node and ffmpeg are grandchildren
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(job.proc.pid)], capture_output=True)
        else:
            job.proc.terminate()
        return True
