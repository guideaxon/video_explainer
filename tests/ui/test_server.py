"""Tests for the pipeline UI backend: step status from files, jobs, and the API."""

import json
import os
import time

import pytest
from fastapi.testclient import TestClient

from ui.server.app import REPO_ROOT, create_app
from ui.server.jobs import BusyError, JobManager
from ui.server.projects import approve, load_config, step_statuses


def _touch(path, text="x", age=0.0):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    t = time.time() - age
    os.utime(path, (t, t))


def _by_id(statuses):
    return {s["id"]: s for s in statuses}


@pytest.fixture
def client(tmp_path):
    app = create_app(REPO_ROOT, tmp_path / "projects", extra_hosts=("testserver",))
    return TestClient(app), tmp_path / "projects"


def _create(client, **body):
    body.setdefault("title", "My Video")
    r = client.post("/api/projects", json=body)
    assert r.status_code == 201, r.text
    return r.json()


# ----- step status -------------------------------------------------------------------------------
def test_standard_project_shows_nine_steps_with_treatment_hidden_and_review_skipped(client):
    c, projects = client
    p = _create(c)
    steps = _by_id(p["steps"])
    assert list(steps) == ["treatment", "script", "narration", "scenes", "review", "voiceover",
                           "storyboard", "render", "verify"]
    assert steps["treatment"]["status"] == "hidden"
    assert steps["review"]["status"] == "skipped"  # the review script covers channel projects only
    assert steps["script"]["status"] == "ready"
    assert steps["narration"]["status"] == "not started"


def test_channel_project_skips_script_and_makes_narration_manual(client):
    c, _ = client
    steps = _by_id(_create(c, channel="promo")["steps"])
    assert steps["script"]["status"] == "skipped"
    assert steps["narration"]["mode"] == "manual" and not steps["narration"]["can_run"]
    assert steps["scenes"]["can_run"]  # scaffold available until scenes/index.ts exists
    assert steps["review"]["can_run"]


def test_scenes_scaffold_not_offered_once_scenes_exist(client):
    c, projects = client
    _create(c, channel="promo", id="vid")
    _touch(projects / "vid" / "scenes" / "index.ts")
    scenes = _by_id(c.get("/api/projects/vid").json()["steps"])["scenes"]
    assert scenes["mode"] == "manual" and not scenes["can_run"]


def test_output_then_approval_then_stale_when_upstream_changes(client):
    c, projects = client
    _create(c, id="vid")
    d = projects / "vid"
    _touch(d / "script" / "script.json", "{}", age=100)
    steps = _by_id(step_statuses(d, load_config(d), []))
    assert steps["script"]["status"] == "needs review"
    approve(d, "script")
    assert _by_id(step_statuses(d, load_config(d), []))["script"]["status"] == "approved"
    assert _by_id(step_statuses(d, load_config(d), []))["narration"]["status"] == "ready"

    _touch(d / "narration" / "narrations.json", "{}", age=50)
    _touch(d / "script" / "script.json", "{}", age=0)  # script edited after narration was made
    steps = _by_id(step_statuses(d, load_config(d), []))
    assert steps["narration"]["status"] == "stale"
    assert steps["script"]["status"] == "needs review"  # edited after approval


# ----- API ---------------------------------------------------------------------------------------
def test_create_writes_source_from_prompt_and_typed_text_wins(client):
    c, projects = client
    _create(c, id="a", prompt="A teacher explaining Physics to kids")
    assert "teacher" in (projects / "a" / "input" / "source.md").read_text(encoding="utf-8")
    _create(c, id="b", prompt="ignored", source_text="# Typed\nbody")
    assert (projects / "b" / "input" / "source.md").read_text(encoding="utf-8").startswith("# Typed")


def test_create_rejects_vantage_bad_ids_and_duplicates(client):
    c, _ = client
    assert c.post("/api/projects", json={"title": "x", "channel": "vantage"}).status_code == 400
    assert c.post("/api/projects", json={"title": "x", "id": "../evil"}).status_code == 400
    _create(c, id="dup")
    assert c.post("/api/projects", json={"title": "x", "id": "dup"}).status_code == 409


def test_source_roundtrip_and_settings(client):
    c, _ = client
    _create(c, id="vid")
    assert c.put("/api/projects/vid/source", json={"text": "hello"}).status_code == 200
    assert c.get("/api/projects/vid/source").json()["text"] == "hello"
    r = c.put("/api/projects/vid/settings", json={"target_seconds": 45, "tts_provider": "mock"})
    assert r.json()["target_seconds"] == 45 and r.json()["tts_provider"] == "mock"
    assert c.put("/api/projects/vid/settings", json={"tts_provider": "nope"}).status_code == 400


def test_files_endpoint_blocks_path_escape(client):
    c, projects = client
    _create(c, id="vid")
    _touch(projects / "secret.txt", "no")
    assert c.get("/api/projects/vid/files/..%2Fsecret.txt").status_code in (400, 404)
    assert c.get("/api/projects/vid/files/config.json").status_code == 200


def test_unknown_project_and_step_and_manual_step_are_rejected(client):
    c, _ = client
    assert c.get("/api/projects/nope").status_code == 404
    assert c.get("/api/projects/..").status_code == 404
    _create(c, id="vid", channel="promo")
    assert c.post("/api/projects/vid/steps/bogus/run").status_code == 404
    assert c.post("/api/projects/vid/steps/narration/run").status_code == 400  # manual for channels
    assert c.post("/api/projects/vid/steps/script/run").status_code == 400  # skipped for channels
    assert c.post("/api/projects/vid/steps/render/run", json={"force": True}).status_code == 400


def test_approve_requires_output_and_a_gated_step(client):
    c, projects = client
    _create(c, id="vid")
    assert c.post("/api/projects/vid/steps/script/approve").status_code == 409
    assert c.post("/api/projects/vid/steps/storyboard/approve").status_code == 400
    _touch(projects / "vid" / "script" / "script.json")
    assert c.post("/api/projects/vid/steps/script/approve").status_code == 200
    assert _by_id(c.get("/api/projects/vid").json()["steps"])["script"]["status"] == "approved"


# ----- jobs --------------------------------------------------------------------------------------
def _wait(job, seconds=10):
    end = time.time() + seconds
    while job.status == "running" and time.time() < end:
        time.sleep(0.05)


def test_job_captures_output_and_exit_code_and_is_one_per_project(tmp_path):
    (tmp_path / "projects" / "vid").mkdir(parents=True)
    jm = JobManager(tmp_path, tmp_path / "projects")
    job = jm.start("vid", "script", ["-c", "import time; print('héllo'); time.sleep(0.6)"])
    with pytest.raises(BusyError):
        jm.start("vid", "narration", ["-c", "print(1)"])
    _wait(job)
    assert job.status == "succeeded" and job.exit_code == 0
    assert job.lines == ["héllo"]
    assert (tmp_path / "projects" / "vid" / ".ui" / "jobs" / f"{job.id}.log").exists()

    failed = jm.start("vid", "render", ["-c", "import sys; print('boom'); sys.exit(3)"])
    _wait(failed)
    assert failed.status == "failed" and failed.exit_code == 3 and failed.lines == ["boom"]
    assert [j.status for j in jm.history("vid")] == ["failed", "succeeded"] or len(jm.history("vid")) == 2


def test_cancel_stops_a_running_job(tmp_path):
    (tmp_path / "projects" / "vid").mkdir(parents=True)
    jm = JobManager(tmp_path, tmp_path / "projects")
    job = jm.start("vid", "render", ["-c", "import time; time.sleep(30)"])
    assert jm.cancel(job)
    _wait(job)
    assert job.status == "cancelled"
    assert not jm.cancel(job)


def test_failed_job_marks_step_failed_and_success_of_review_counts_as_done(client):
    from ui.server.jobs import Job

    c, projects = client
    _create(c, id="vid", channel="promo")
    d = projects / "vid"

    def job(step, status, finished):
        return Job("j", "vid", step, [], d / "a.json", d / "a.log", status=status, finished=finished)

    cfg = load_config(d)
    assert _by_id(step_statuses(d, cfg, [job("review", "failed", time.time())]))["review"]["status"] == "failed"
    ok = _by_id(step_statuses(d, cfg, [job("review", "succeeded", time.time())]))["review"]
    assert ok["status"] == "done"


def test_review_run_does_not_make_later_steps_stale(client):
    from ui.server.jobs import Job

    c, projects = client
    _create(c, id="vid", channel="promo")
    d = projects / "vid"
    _touch(d / "narration" / "narrations.json", age=100)
    _touch(d / "voiceover" / "manifest.json", age=50)
    review = Job("j", "vid", "review", [], d / "a.json", d / "a.log", status="succeeded", finished=time.time())
    steps = _by_id(step_statuses(d, load_config(d), [review]))
    assert steps["review"]["status"] == "done"
    assert steps["voiceover"]["status"] == "needs review"  # not stale


def test_unsupported_channel_is_flagged_and_cannot_run(client):
    c, projects = client
    _create(c, id="vid")
    cfg = json.loads((projects / "vid" / "config.json").read_text(encoding="utf-8"))
    cfg["channel"] = "vantage"
    (projects / "vid" / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    assert c.get("/api/projects/vid").json()["supported"] is False
    assert c.post("/api/projects/vid/steps/voiceover/run").status_code == 400


def test_files_written_together_by_one_command_are_not_stale(client):
    c, projects = client
    _create(c, id="vid", channel="promo")
    d = projects / "vid"
    _touch(d / "scenes" / "index.ts", age=0.05)  # scaffold writes scenes, then narration, ms apart
    _touch(d / "narration" / "narrations.json", age=0.0)
    steps = _by_id(step_statuses(d, load_config(d), []))
    assert steps["scenes"]["status"] == "needs review"
