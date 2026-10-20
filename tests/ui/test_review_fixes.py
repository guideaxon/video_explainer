"""Regression tests for bugs found in code review of the pipeline UI backend."""

import subprocess
import time

import pytest
from fastapi.testclient import TestClient

from ui.server.app import REPO_ROOT, create_app
from ui.server.jobs import JobManager
from ui.server.projects import load_config, step_statuses

from .test_server import _by_id, _touch, _wait


@pytest.fixture
def client(tmp_path):
    app = create_app(REPO_ROOT, tmp_path / "projects", extra_hosts=("testserver",))
    return TestClient(app), tmp_path / "projects"


def test_standard_project_voiceover_is_not_blocked_by_the_skipped_review(client):
    c, projects = client
    assert c.post("/api/projects", json={"title": "x", "id": "vid"}).status_code == 201
    d = projects / "vid"
    _touch(d / "script" / "script.json")
    _touch(d / "narration" / "narrations.json")
    _touch(d / "remotion" / "scenes" / "a.tsx")
    steps = _by_id(step_statuses(d, load_config(d), []))
    assert steps["review"]["status"] == "skipped"
    assert steps["voiceover"]["status"] == "ready"


def test_other_sites_cannot_post_or_rebind(client):
    c, _ = client
    assert c.post("/api/projects", json={"title": "x", "id": "vid"}).status_code == 201
    evil = {"Origin": "https://evil.example"}
    assert c.post("/api/projects/vid/steps/render/run", headers=evil).status_code == 403
    assert c.post("/api/projects", json={"title": "y"}, headers=evil).status_code == 403
    assert c.get("/api/projects", headers={"Host": "evil.example"}).status_code == 403
    same_origin = {"Origin": "http://127.0.0.1:8765"}
    assert c.put("/api/projects/vid/source", json={"text": "hi"}, headers=same_origin).status_code == 200


def test_settings_reject_bad_colors_and_fonts(client):
    c, _ = client
    assert c.post("/api/projects", json={"title": "x", "id": "vid"}).status_code == 201
    assert c.put("/api/projects/vid/settings", json={"primary_color": "red; x"}).status_code == 422
    assert c.put("/api/projects/vid/settings", json={"font_family": "a{b}"}).status_code == 422
    ok = c.put("/api/projects/vid/settings", json={"primary_color": "#2e6ff0", "font_family": "Plus Jakarta Sans"})
    assert ok.status_code == 200


def test_failed_start_does_not_leave_project_busy(tmp_path, monkeypatch):
    (tmp_path / "projects" / "vid").mkdir(parents=True)
    jm = JobManager(tmp_path, tmp_path / "projects")

    def boom(*args, **kwargs):
        raise FileNotFoundError("no such executable")

    monkeypatch.setattr(subprocess, "Popen", boom)
    with pytest.raises(FileNotFoundError):
        jm.start("vid", "render", ["-c", "print(1)"])
    assert jm.active("vid") is None
    monkeypatch.undo()
    job = jm.start("vid", "render", ["-c", "print(1)"])
    _wait(job)
    assert job.status == "succeeded"


def test_back_to_back_jobs_get_distinct_ids_and_logs(tmp_path):
    (tmp_path / "projects" / "vid").mkdir(parents=True)
    jm = JobManager(tmp_path, tmp_path / "projects")
    first = jm.start("vid", "script", ["-c", "print('one')"])
    _wait(first)
    time.sleep(0.002)
    second = jm.start("vid", "script", ["-c", "print('two')"])
    _wait(second)
    assert first.id != second.id
    assert first.log_path.read_text(encoding="utf-8").strip() == "one"
    assert [j.lines for j in jm.history("vid")] == [["two"], ["one"]]
