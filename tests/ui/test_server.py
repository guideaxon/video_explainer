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
def test_standard_project_shows_ten_steps_with_treatment_hidden_and_review_skipped(client):
    c, projects = client
    p = _create(c)
    steps = _by_id(p["steps"])
    assert list(steps) == ["treatment", "script", "narration", "scenes", "review", "voiceover",
                           "storyboard", "sound", "render", "verify"]
    assert steps["treatment"]["status"] == "hidden"
    assert steps["review"]["status"] == "skipped"  # the review script covers style bundle projects only
    assert steps["script"]["status"] == "ready"
    assert steps["narration"]["status"] == "not started"


def test_style_bundle_project_skips_script_and_makes_narration_manual(client):
    c, _ = client
    steps = _by_id(_create(c, style_bundle="promo")["steps"])
    assert steps["script"]["status"] == "skipped"
    assert steps["narration"]["mode"] == "manual" and not steps["narration"]["can_run"]
    assert steps["scenes"]["can_run"]  # scaffold available until scenes/index.ts exists
    assert steps["review"]["can_run"]


def test_scenes_scaffold_not_offered_once_scenes_exist(client):
    c, projects = client
    _create(c, style_bundle="promo", id="vid")
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


def test_optional_sound_step_never_blocks_render_or_counts_until_it_has_run(client):
    c, projects = client
    _create(c, id="vid")
    d = projects / "vid"
    for rel, age in (("script/script.json", 90), ("narration/narrations.json", 80), ("scenes/index.ts", 70),
                     ("voiceover/manifest.json", 60), ("storyboard/storyboard.json", 50)):
        _touch(d / rel, "{}", age=age)
    steps = _by_id(step_statuses(d, load_config(d), []))
    assert steps["sound"]["optional"] and steps["sound"]["status"] == "ready"
    assert steps["render"]["status"] == "ready"  # not "not started": sound was skipped, not required
    before = c.get("/api/projects/vid").json()["progress"].split("/")[1]

    _touch(d / "sfx" / "manifest.json", "{}", age=10)
    assert _by_id(step_statuses(d, load_config(d), []))["sound"]["status"] == "done"
    assert int(c.get("/api/projects/vid").json()["progress"].split("/")[1]) == int(before) + 1  # now counted

    _touch(d / "storyboard" / "storyboard.json", "{}", age=0)  # storyboard regenerated after the sound step
    assert _by_id(step_statuses(d, load_config(d), []))["sound"]["status"] == "stale"


def test_sound_engine_option_is_validated_and_earshot_needs_to_be_installed(client, monkeypatch):
    from src.sound import earshot_backend as eb

    c, _ = client
    _create(c, id="vid")
    assert c.post("/api/projects/vid/steps/narration/run", json={"sound_engine": "builtin"}).status_code == 400
    assert c.post("/api/projects/vid/steps/sound/run", json={"sound_engine": "nope"}).status_code == 400
    monkeypatch.setattr(eb, "status", lambda refresh=False: eb.Status(False, detail="not installed", fix="pip install"))
    r = c.post("/api/projects/vid/steps/sound/run", json={"sound_engine": "earshot"})
    assert r.status_code == 400 and "not installed" in r.json()["detail"]


def test_a_server_on_another_projects_folder_refuses_to_run_steps(client):
    # Steps shell out to the CLI, which reads the repo's projects/ folder; running them for a project in
    # any other folder would silently modify a different project of the same name.
    c, projects = client
    _create(c, id="vid")
    r = c.post("/api/projects/vid/steps/script/run")
    assert r.status_code == 409 and "projects/" in r.json()["detail"]
    assert not (projects / "vid" / ".ui" / "jobs").exists()  # nothing was started


def test_health_reports_earshot_as_an_optional_chip(client, monkeypatch):
    from src.sound import earshot_backend as eb

    c, _ = client
    monkeypatch.setattr(eb, "status", lambda refresh=False: eb.Status(False, detail="not installed", fix="Optional: pip install"))
    chip = c.get("/api/health").json()["earshot"]
    assert chip["optional"] is True and chip["ok"] is False and "pip install" in chip["fix"]
    monkeypatch.setattr(eb, "status", lambda refresh=False: eb.Status(True, "x/earshot", "201 sounds in the bank"))
    chip = c.get("/api/health").json()["earshot"]
    assert chip["ok"] is True and chip["fix"] == ""


def test_sound_palette_setting_roundtrip_and_validation(client):
    c, _ = client
    _create(c, id="vid", style_bundle="markets")
    assert c.get("/api/projects/vid").json()["sound"] == {
        "palette": "markets", "override": "", "palettes": ["default", "vantage", "markets", "promo", "launch", "lyric", "leaderbot", "demo"],
    }
    assert c.put("/api/projects/vid/settings", json={"sound_palette": "lyric"}).json()["sound"]["palette"] == "lyric"
    assert c.put("/api/projects/vid/settings", json={"sound_palette": "nope"}).status_code == 400
    cleared = c.put("/api/projects/vid/settings", json={"sound_palette": ""}).json()["sound"]
    assert cleared["palette"] == "markets" and cleared["override"] == ""  # back to following the style bundle


def test_sound_endpoint_returns_manifest_and_audit(client):
    c, projects = client
    _create(c, id="vid")
    assert c.get("/api/projects/vid/sound").json()["manifest"] is None
    _touch(projects / "vid" / "sfx" / "manifest.json", json.dumps(
        {"engine": "builtin", "palette": "default", "generated": 1, "earshot": "", "sounds": {}}))
    body = c.get("/api/projects/vid/sound").json()
    # A manifest with no cues means the Sound step ran but nothing will play: a warning, not just info.
    assert body["manifest"]["engine"] == "builtin" and body["audit"][0][0] == "WARN"


# ----- API ---------------------------------------------------------------------------------------
def test_create_writes_source_from_prompt_and_typed_text_wins(client):
    c, projects = client
    _create(c, id="a", prompt="A teacher explaining Physics to kids")
    assert "teacher" in (projects / "a" / "input" / "source.md").read_text(encoding="utf-8")
    _create(c, id="b", prompt="ignored", source_text="# Typed\nbody")
    assert (projects / "b" / "input" / "source.md").read_text(encoding="utf-8").startswith("# Typed")


def test_create_rejects_vantage_bad_ids_and_duplicates(client):
    c, _ = client
    assert c.post("/api/projects", json={"title": "x", "style_bundle": "vantage"}).status_code == 400
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


def test_summary_exposes_voice_and_style_for_the_settings_screen(client):
    c, _ = client
    _create(c, id="vid")
    c.put("/api/projects/vid/settings", json={"voice_id": "abc", "primary_color": "#112233"})
    p = c.get("/api/projects/vid").json()
    assert p["voice_id"] == "abc" and p["style"]["primary_color"] == "#112233"
    assert set(p["style"]) == {"primary_color", "secondary_color", "background_color", "font_family"}


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
    _create(c, id="vid", style_bundle="promo")
    assert c.post("/api/projects/vid/steps/bogus/run").status_code == 404
    assert c.post("/api/projects/vid/steps/narration/run").status_code == 400  # manual for style bundles
    assert c.post("/api/projects/vid/steps/script/run").status_code == 400  # skipped for style bundles
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
    _create(c, id="vid", style_bundle="promo")
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
    _create(c, id="vid", style_bundle="promo")
    d = projects / "vid"
    _touch(d / "narration" / "narrations.json", age=100)
    _touch(d / "voiceover" / "manifest.json", age=50)
    review = Job("j", "vid", "review", [], d / "a.json", d / "a.log", status="succeeded", finished=time.time())
    steps = _by_id(step_statuses(d, load_config(d), [review]))
    assert steps["review"]["status"] == "done"
    assert steps["voiceover"]["status"] == "needs review"  # not stale


def test_unsupported_style_bundle_is_flagged_and_cannot_run(client):
    c, projects = client
    _create(c, id="vid")
    cfg = json.loads((projects / "vid" / "config.json").read_text(encoding="utf-8"))
    cfg["style_bundle"] = "vantage"
    (projects / "vid" / "config.json").write_text(json.dumps(cfg), encoding="utf-8")
    assert c.get("/api/projects/vid").json()["supported"] is False
    assert c.post("/api/projects/vid/steps/voiceover/run").status_code == 400


def test_files_written_together_by_one_command_are_not_stale(client):
    c, projects = client
    _create(c, id="vid", style_bundle="promo")
    d = projects / "vid"
    _touch(d / "scenes" / "index.ts", age=0.05)  # scaffold writes scenes, then narration, ms apart
    _touch(d / "narration" / "narrations.json", age=0.0)
    steps = _by_id(step_statuses(d, load_config(d), []))
    assert steps["scenes"]["status"] == "needs review"


def test_steps_expose_copyable_cli_commands(client):
    c, _ = client
    steps = _by_id(_create(c, id="vid")["steps"])
    assert steps["script"]["commands"] == [{"label": "Copy command", "text": "python -m src.cli script vid"}]
    assert [x["text"] for x in steps["render"]["commands"]] == ["cd remotion && npm run dev", "python -m src.cli render vid"]
    assert _by_id(_create(c, id="vid2", style_bundle="promo")["steps"])["script"]["commands"] == []


# ----- papercut ------------------------------------------------------------------------------------
def test_papercut_project_reports_film_and_serves_it_sandboxed(client):
    c, projects = client
    p = _create(c, style_bundle="papercut")
    assert p["style_bundle"] == "papercut" and p["supported"] and p["has_film"] is False
    steps = _by_id(p["steps"])
    assert steps["narration"]["status"] == "skipped" and steps["render"]["status"] != "skipped"
    _touch(projects / p["id"] / "film.html", "<html></html>")
    assert c.get(f"/api/projects/{p['id']}").json()["has_film"] is True
    r = c.get(f"/api/projects/{p['id']}/files/film.html")
    assert r.status_code == 200 and "sandbox" in r.headers["content-security-policy"]
