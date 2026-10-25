"""MovieBook in the pipeline UI: the step table, the panel's read model and its edits."""

import json
import os
import shutil
import sys
import time

import pytest
from fastapi.testclient import TestClient

from ui.server.app import REPO_ROOT, create_app
from ui.server.projects import approve, load_config

TEMPLATE_PLAN = REPO_ROOT / "templates" / "moviebook_video" / "plan.json"


@pytest.fixture
def client(tmp_path):
    app = create_app(REPO_ROOT, tmp_path / "projects", extra_hosts=("testserver",))
    return TestClient(app), tmp_path / "projects"


def _project(client, with_plan=False):
    c, projects = client
    r = c.post("/api/projects", json={"title": "Movie", "style_bundle": "moviebook"})
    assert r.status_code == 201, r.text
    d = projects / r.json()["id"]
    if with_plan:
        (d / "moviebook").mkdir(exist_ok=True)
        shutil.copy2(TEMPLATE_PLAN, d / "moviebook" / "plan.json")
    return c, d, r.json()["id"]


def _by_id(statuses):
    return {s["id"]: s for s in statuses}


def test_moviebook_is_a_supported_bundle_with_its_own_step_titles(client):
    c, d, pid = _project(client)
    p = c.get(f"/api/projects/{pid}").json()
    assert p["supported"]
    steps = _by_id(p["steps"])
    assert {k: steps[k]["title"] for k in ("narration", "scenes", "review", "voiceover", "storyboard")} == {
        "narration": "Story plan", "scenes": "Scenes", "review": "Keyframes", "voiceover": "Clips", "storyboard": "Voice check and storyboard"}
    assert steps["script"]["status"] == "skipped"
    assert steps["narration"]["can_run"]  # scaffolds the sample plan while there is no plan
    assert steps["sound"]["optional"]


def test_moviebook_steps_run_the_moviebook_scripts_not_tts(client):
    c, d, pid = _project(client, with_plan=True)
    steps = _by_id(c.get(f"/api/projects/{pid}").json()["steps"])
    assert not steps["narration"]["can_run"] and steps["narration"]["mode"] == "manual"  # plan exists: edit it in the panel
    cmds = {k: steps[k]["commands"][0]["text"] for k in ("scenes", "review", "voiceover", "storyboard")}
    assert "moviebook_build_scenes.py" in cmds["scenes"]
    assert "moviebook_keyframes_comfy.py" in cmds["review"]
    assert "moviebook_run_clips.py" in cmds["voiceover"] and "src.cli" not in cmds["voiceover"]
    assert "moviebook_run_finalize.py" in cmds["storyboard"]


def test_keyframes_clips_and_voice_check_need_a_human_approval(client):
    c, d, pid = _project(client, with_plan=True)
    cfg = load_config(d)
    keyframes = d / "moviebook" / "keyframes"
    keyframes.mkdir()
    (keyframes / "dawn.png").write_bytes(b"png")
    steps = _by_id(c.get(f"/api/projects/{pid}").json()["steps"])
    assert steps["review"]["gated"] and steps["voiceover"]["gated"] and not steps["scenes"]["gated"]
    assert steps["review"]["status"] == "needs review"
    assert c.post(f"/api/projects/{pid}/steps/review/approve").status_code == 200
    assert _by_id(c.get(f"/api/projects/{pid}").json()["steps"])["review"]["status"] == "approved"
    assert c.post(f"/api/projects/{pid}/steps/scenes/approve").status_code == 400  # not gated in this bundle
    assert cfg["style_bundle"] == "moviebook"


def test_run_options_only_and_skip_asr_are_limited_to_their_moviebook_steps(client):
    c, d, pid = _project(client, with_plan=True)
    assert c.post(f"/api/projects/{pid}/steps/review/run", json={"only": "dawn; rm -rf"}).status_code == 400
    assert c.post(f"/api/projects/{pid}/steps/scenes/run", json={"only": "dawn"}).status_code == 400
    assert c.post(f"/api/projects/{pid}/steps/review/run", json={"skip_asr": True}).status_code == 400
    standard = c.post("/api/projects", json={"title": "Plain"}).json()["id"]
    assert c.post(f"/api/projects/{standard}/steps/review/run", json={"only": "dawn"}).status_code == 400


def test_overview_reports_shots_files_and_voice_check(client):
    c, d, pid = _project(client, with_plan=True)
    mb = d / "moviebook"
    (mb / "keyframes").mkdir()
    (mb / "keyframes" / "dawn.png").write_bytes(b"png")
    (mb / "clips").mkdir()
    (mb / "clips" / "dawn.mp4").write_bytes(b"mp4")
    qc = {"passed": False, "asr_checked": True, "shots": {"dawn": {"issues": ["F0 142.9 Hz is 16% from the anchor"], "f0_hz": 142.9}}, "speaker_f0_hz": {}}
    (mb / "qc_voice.json").write_text(json.dumps(qc), encoding="utf-8")
    t = time.time() + 5
    os.utime(mb / "qc_voice.json", (t, t))
    o = c.get(f"/api/projects/{pid}/moviebook").json()
    assert o["problems"] == [] and [s["id"] for s in o["shots"]][:2] == ["dawn", "arrival"]
    dawn = o["shots"][0]
    assert dawn["keyframe"] == "moviebook/keyframes/dawn.png" and dawn["clip"] == "moviebook/clips/dawn.mp4"
    assert dawn["qc"]["issues"] and o["shots"][1]["keyframe"] is None
    assert o["qc"]["passed"] is False and o["qc"]["stale"] is False
    assert {x["key"] for x in o["cast"]} == {"mara", "tomas"} and o["cast"][0]["anchor_hz"] is None


def test_overview_flags_a_voice_check_older_than_a_clip(client):
    c, d, pid = _project(client, with_plan=True)
    mb = d / "moviebook"
    (mb / "clips").mkdir()
    (mb / "qc_voice.json").write_text(json.dumps({"passed": True, "shots": {}}), encoding="utf-8")
    os.utime(mb / "qc_voice.json", (time.time() - 100, time.time() - 100))
    (mb / "clips" / "dawn.mp4").write_bytes(b"mp4")
    assert c.get(f"/api/projects/{pid}/moviebook").json()["qc"]["stale"] is True


def test_save_plan_validates_and_refuses_a_bad_plan(client):
    c, d, pid = _project(client, with_plan=True)
    plan = json.loads(TEMPLATE_PLAN.read_text(encoding="utf-8"))
    plan["shots"][0]["line"] = "A new first line."
    assert c.put(f"/api/projects/{pid}/moviebook/plan", json={"plan": plan}).status_code == 200
    assert json.loads((d / "moviebook" / "plan.json").read_text(encoding="utf-8"))["shots"][0]["line"] == "A new first line."
    plan["shots"][1]["speaker"] = "nobody"
    r = c.put(f"/api/projects/{pid}/moviebook/plan", json={"plan": plan})
    assert r.status_code == 422 and "nobody" in r.json()["detail"]
    assert json.loads((d / "moviebook" / "plan.json").read_text(encoding="utf-8"))["shots"][1]["speaker"] == "tomas"  # unchanged


def test_reroll_moves_only_the_seed_asked_for(client):
    c, d, pid = _project(client, with_plan=True)
    first = json.loads(TEMPLATE_PLAN.read_text(encoding="utf-8"))["shots"][0]["seed"]
    r = c.post(f"/api/projects/{pid}/moviebook/reroll", json={"shot": "dawn", "kind": "keyframe"}).json()
    assert r == {"seed": first + 101, "clip_seed": first}  # the clip keeps its seed
    r = c.post(f"/api/projects/{pid}/moviebook/reroll", json={"shot": "dawn", "kind": "clip"}).json()
    assert r == {"seed": first + 101, "clip_seed": first + 101}
    assert c.post(f"/api/projects/{pid}/moviebook/reroll", json={"shot": "nope", "kind": "clip"}).status_code == 400
    assert c.post(f"/api/projects/{pid}/moviebook/reroll", json={"shot": "dawn", "kind": "audio"}).status_code == 400


def test_moviebook_endpoints_refuse_other_bundles(client):
    c, projects = client
    pid = c.post("/api/projects", json={"title": "Plain"}).json()["id"]
    assert c.get(f"/api/projects/{pid}/moviebook").status_code == 400


@pytest.mark.skipif(shutil.which("ffmpeg") is None, reason="ffmpeg needed to make a test clip")
def test_set_anchor_measures_a_clip_and_keeps_the_plan_mtime(client):
    import subprocess

    c, d, pid = _project(client, with_plan=True)
    clips = d / "moviebook" / "clips"
    clips.mkdir()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "sine=frequency=124:duration=1.5", "-ac", "1", str(clips / "arrival.wav")], check=True)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(clips / "arrival.wav"), "-f", "lavfi", "-i", "color=c=black:s=64x64:d=1.5", "-shortest", "-c:v", "libx264", "-c:a", "aac", str(clips / "arrival.mp4")], check=True)
    plan = d / "moviebook" / "plan.json"
    old = time.time() - 500
    os.utime(plan, (old, old))
    r = c.post(f"/api/projects/{pid}/moviebook/anchor", json={"character": "tomas", "shot": "arrival"})
    assert r.status_code == 200, r.text
    anchor = json.loads(plan.read_text(encoding="utf-8"))["cast"]["tomas"]["voice"]["anchor_hz"]
    assert abs(anchor - 124) < 4
    assert abs(plan.stat().st_mtime - old) < 1  # an anchor must not make keyframes and clips look stale
    assert c.post(f"/api/projects/{pid}/moviebook/anchor", json={"character": "ghost", "shot": "arrival"}).status_code == 400
