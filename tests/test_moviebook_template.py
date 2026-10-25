"""MovieBook: plan to scenes, keyframe and H3 prompts, voice check maths, finalize wiring."""

import importlib.util
import json
import math
import re
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))


def _load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@pytest.fixture(scope="module")
def plan():
    return json.loads((ROOT / "templates" / "moviebook_video" / "plan.json").read_text(encoding="utf-8"))


def test_sample_plan_is_valid_and_has_two_voices(plan):
    build = _load("moviebook_build_scenes")
    assert build.validate(plan) == []
    assert {c["gender"] for c in plan["cast"].values()} == {"female", "male"}
    assert {s["speaker"] for s in plan["shots"]} == set(plan["cast"])


def test_validate_catches_bad_plans(plan):
    build = _load("moviebook_build_scenes")
    bad = json.loads(json.dumps(plan))
    bad["shots"][1]["title"] = bad["shots"][0]["title"]
    bad["shots"][2]["speaker"] = "nobody"
    errors = " ".join(build.validate(bad))
    assert "duplicate" in errors and "nobody" in errors


def test_build_writes_registry_that_matches_titles(plan, tmp_path):
    build = _load("moviebook_build_scenes")
    project = tmp_path / "p"
    (project / "moviebook").mkdir(parents=True)
    (project / "moviebook" / "plan.json").write_text(json.dumps(plan), encoding="utf-8")
    assert build.build(project) == 0
    index = (project / "scenes" / "index.ts").read_text(encoding="utf-8")
    block = re.search(r"SCENE_REGISTRY[^{]*\{([^}]+)\}", index, re.S).group(1)
    entries = re.findall(r"^\s*(\w+):\s*(\w+),?", block, re.M)
    assert [k for k, _ in entries] == [build.shot_id(s) for s in plan["shots"]]
    assert all(c.endswith("Scene") for _, c in entries)
    for key, _ in entries:
        assert (project / "scenes" / f"{key}.tsx").exists()
    narration = json.loads((project / "narration" / "narrations.json").read_text(encoding="utf-8"))
    assert [s["narration"] for s in narration["scenes"]] == [s["line"] for s in plan["shots"]]


def test_planned_frames_are_retimed_to_the_30fps_composition(plan):
    build = _load("moviebook_build_scenes")
    assert build.planned_frames(plan, plan["shots"][0]) == 112  # 90 frames at 24 fps = 3.75 s = 112.5 composition frames


def test_build_uses_measured_frames_and_removes_stale_scenes(plan, tmp_path):
    build = _load("moviebook_build_scenes")
    project = tmp_path / "p"
    (project / "moviebook").mkdir(parents=True)
    (project / "moviebook" / "plan.json").write_text(json.dumps(plan), encoding="utf-8")
    build.build(project)
    (project / "moviebook" / "clips.json").write_text(json.dumps({"dawn": {"frames": 101}}), encoding="utf-8")
    plan["shots"][5]["title"] = "Farewell"
    (project / "moviebook" / "plan.json").write_text(json.dumps(plan), encoding="utf-8")
    build.build(project)
    assert "clipFrames={101}" in (project / "scenes" / "dawn.tsx").read_text(encoding="utf-8")
    assert not (project / "scenes" / "leaving.tsx").exists() and (project / "scenes" / "farewell.tsx").exists()


def test_keyframe_prompt_copies_identity_verbatim_for_each_cast_member(plan):
    comfy = _load("moviebook_keyframes_comfy")
    shot = plan["shots"][1]
    prompt = comfy.build_prompt(plan, shot)
    for key in shot["cast"]:
        assert plan["cast"][key]["identity"] in prompt
    assert plan["style_line"] in prompt
    only_tomas = comfy.build_prompt(plan, plan["shots"][5])
    assert plan["cast"]["mara"]["identity"] not in only_tomas
    g = comfy.graph(plan, "x", 7, "p")
    assert g["8"]["inputs"]["seed"] == 7 and g["2"]["inputs"]["type"] == "qwen_image"


def test_custom_workflow_placeholders_keep_types():
    comfy = _load("moviebook_keyframes_comfy")
    out = comfy.fill_workflow({"a": {"seed": "{{seed}}", "text": "{{prompt}} !", "w": ["x", 0]}}, {"seed": 5, "prompt": "hi"})
    assert out == {"a": {"seed": 5, "text": "hi !", "w": ["x", 0]}}


def test_h3_caption_carries_line_and_voice_description(plan, tmp_path):
    jobs = _load("moviebook_clip_jobs")
    made = jobs.make_jobs(plan, tmp_path)
    assert [j["id"] for j in made][:2] == ["dawn", "arrival"]
    mara_caption = made[0]["caption"]
    assert plan["shots"][0]["line"] in mara_caption and plan["cast"]["mara"]["voice"]["description"] in mara_caption
    assert plan["cast"]["tomas"]["identity"] not in mara_caption
    assert "non_diegetic_music:\nN/A" in mara_caption
    assert made[0]["image"] == "keyframes/dawn.png" and made[0]["out"] == "clips/dawn.mp4"
    assert all(j["frames"] == plan["frames"] for j in made)


def _tone(hz, seconds=1.0, rate=16000):
    # a harmonic-rich voiced-like signal: pure sines are fine for autocorrelation but harmonics are closer to speech
    return [0.4 * math.sin(2 * math.pi * hz * i / rate) + 0.2 * math.sin(2 * math.pi * 2 * hz * i / rate) for i in range(int(seconds * rate))]


@pytest.mark.parametrize("hz", [110.0, 123.1, 220.0])
def test_median_f0_recovers_pitch(hz):
    voice = _load("moviebook_voice_check")
    f0 = voice.median_f0(_tone(hz))
    assert f0 is not None and abs(f0 - hz) / hz < 0.03


def test_median_f0_none_for_silence_and_noise_floor():
    voice = _load("moviebook_voice_check")
    assert voice.median_f0([0.0] * 16000) is None
    assert voice.median_f0([0.0] * 100) is None


def test_pitch_issue_flags_the_drift_the_user_measured():
    voice = _load("moviebook_voice_check")
    dev, issues = voice.pitch_issue(142.9, 123.1, 0.12, "male")
    assert dev == pytest.approx(0.161, abs=0.001) and any("anchor" in i for i in issues)
    dev, issues = voice.pitch_issue(146.8, 123.1, 0.12, "male")
    assert dev == pytest.approx(0.193, abs=0.001) and issues
    assert voice.pitch_issue(125.0, 123.1, 0.12, "male") == (pytest.approx(0.0154, abs=0.001), [])
    assert voice.pitch_issue(120.0, None, 0.12, "female")[1]  # a "female" voice at 120 Hz is suspicious
    assert voice.pitch_issue(None, 123.1, 0.12, "male")[1]


def test_cer_ignores_case_spacing_and_punctuation_and_handles_chinese():
    voice = _load("moviebook_voice_check")
    assert voice.cer("He is late again, the bread.", "he is LATE again the bread") == 0.0
    assert voice.cer("今天天气很好。", "今天天气很好") == 0.0
    assert voice.cer("今天天气很好", "今天天汽很好") == pytest.approx(1 / 6)
    assert voice.cer("", "") == 0.0 and voice.cer("", "x") == 1.0


def test_finalize_never_trims_and_requires_the_voice_check():
    src = (ROOT / "scripts" / "moviebook_finalize_storyboard.py").read_text(encoding="utf-8")
    assert "trim=False" in src and "qc_voice.json" in src and "from _storyboard_pacing import finalize" in src


def test_review_and_guard_know_moviebook():
    review = (ROOT / "scripts" / "review_video.py").read_text(encoding="utf-8")
    assert '"moviebook":' in review and "moviebook/clips/" in review
    assert "moviebook" in (ROOT / ".claude" / "hooks" / "guard.py").read_text(encoding="utf-8")
