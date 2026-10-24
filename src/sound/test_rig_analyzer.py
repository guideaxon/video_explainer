"""Tests for rig-driven sound cues (gesture pops and walk footsteps)."""

import json
import tempfile
from pathlib import Path

import numpy as np
import pytest

from .rig_analyzer import analyze_rig_scene, walk_steps
from .aggregator import aggregate_moments
from .cue_generator import CueGenerator
from .earshot_backend import DEFAULT_PALETTE
from .library import GENERATORS, SOUND_MANIFEST, generate_footstep
from .models import MOMENT_TO_SOUND, VOLUME_BY_TYPE, SoundMoment, calculate_volume
from .semantic_mapper import SemanticSoundMapper
from .sfx_orchestrator import SFXOrchestrator


def write_scene(tmpdir: str, source: str, name: str = "walk.tsx") -> Path:
    path = Path(tmpdir) / name
    path.write_text(source, encoding="utf-8")
    return path


def frames(moments: list[SoundMoment], moment_type: str) -> list[int]:
    return [m.frame for m in moments if m.type == moment_type]


class TestWalkSteps:
    """walk_steps must equal walkSteps() in remotion/src/components/rig/index.ts."""

    def test_30fps_cadence_2(self):
        assert walk_steps(10, 100, 30, 2) == [25, 40, 55, 70, 85]

    def test_24fps_default_cadence(self):
        assert walk_steps(0, 48, 24) == [12, 24, 36]

    def test_12fps_cadence_4(self):
        assert walk_steps(0, 24, 12, 4) == [3, 6, 9, 12, 15, 18, 21]

    def test_half_frames_round_up_like_javascript(self):
        # 30 fps / cadence 4 = 7.5 frames per step; Math.round(22.5) is 23 (Python's round gives 22).
        assert walk_steps(0, 30, 30, 4) == [8, 15, 23]

    def test_empty_or_invalid_walks(self):
        assert walk_steps(50, 50, 30) == []
        assert walk_steps(60, 10, 30) == []
        assert walk_steps(0, 100, 30, 0) == []
        assert walk_steps(0, 100, 30, -2) == []


class TestAnalyzeRigScene:
    """Parsing literal rig props from scene TSX."""

    def test_walk_props_at_each_fps(self):
        source = (
            "<Fox walk={{ from: 10, to: 100, cadence: 2 }} />\n"
            "<Owl walk={{from:0,to:48}} />\n"
            "<Cat walk={{ cadence: 4, to: 24, from: 0, }} />\n"
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            scene = write_scene(tmpdir, source)
            at30 = analyze_rig_scene(scene, 30)
            at24 = analyze_rig_scene(scene, 24)
            at12 = analyze_rig_scene(scene, 12)

        fox30 = [m.frame for m in at30 if "<Fox>" in m.context]
        assert fox30 == [25, 40, 55, 70, 85]
        owl24 = [m.frame for m in at24 if "<Owl>" in m.context]
        assert owl24 == [12, 24, 36]
        cat12 = [m.frame for m in at12 if "<Cat>" in m.context]
        assert cat12 == [3, 6, 9, 12, 15, 18, 21]

    def test_multiline_walk_and_moment_fields(self):
        source = """export const Scene = () => (
  <AbsoluteFill>
    <Presenter
      mouth={LIPSYNC.intro}
      walk={{
        from: 0,
        to: 40,
      }}
    />
  </AbsoluteFill>
);
"""
        with tempfile.TemporaryDirectory() as tmpdir:
            moments = analyze_rig_scene(write_scene(tmpdir, source), 30)
        assert frames(moments, "footstep") == [15, 30]
        step = moments[0]
        assert step.source == "rig"
        assert step.confidence > 0.9
        assert step.intensity < 0.5
        assert "<Presenter>" in step.context and "line 5" in step.context

    def test_gesture_at(self):
        source = '<Bot gesture="wave" gestureAt={45} />\n<Bot gesture="point" gestureAt={ 90 } seed={2} />'
        with tempfile.TemporaryDirectory() as tmpdir:
            moments = analyze_rig_scene(write_scene(tmpdir, source), 30)
        assert frames(moments, "gesture") == [45, 90]
        assert all(m.source == "rig" for m in moments)
        assert "<Bot>" in moments[0].context and "line 1" in moments[0].context
        assert "line 2" in moments[1].context

    def test_non_literal_props_skipped(self):
        source = (
            "<Fox gestureAt={beat + 4} />\n"
            "<Fox gestureAt={START} />\n"
            "<Fox walk={WALK} />\n"
            "<Fox walk={{ from: start, to: 90 }} />\n"
            "<Fox walk={{ from: 0, to: END, cadence: 2 }} />\n"
            "<Fox walk={{ from: 0 }} />\n"
            "<Fox walk={{ from: 0, to: 60, speed: 3 }} />\n"
            "<Fox walk={{ ...base, to: 60 }} />\n"
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            assert analyze_rig_scene(write_scene(tmpdir, source), 30) == []

    def test_comments_stripped(self):
        source = (
            "// <Fox walk={{ from: 0, to: 60 }} />\n"
            "/* <Fox gestureAt={12} />\n"
            "   <Fox walk={{ from: 0, to: 90 }} /> */\n"
            "<Fox gestureAt={30} /> // gestureAt={99}\n"
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            moments = analyze_rig_scene(write_scene(tmpdir, source), 30)
        assert [(m.type, m.frame) for m in moments] == [("gesture", 30)]

    def test_no_rig_props(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            scene = write_scene(tmpdir, '<Title delay={4}>Hello</Title>\n<Sequence from={10} />')
            assert analyze_rig_scene(scene, 30) == []


class TestRigSounds:
    """Moment types, sounds, volumes and the library/palette entries."""

    def test_mapping_and_volume(self):
        assert MOMENT_TO_SOUND["footstep"] == "footstep"
        assert MOMENT_TO_SOUND["gesture"] == "ui_pop"
        assert VOLUME_BY_TYPE["footstep"] < VOLUME_BY_TYPE["text_reveal"]
        step = SoundMoment(type="footstep", frame=10, confidence=0.95, context="", intensity=0.4)
        assert calculate_volume(step) < 0.05

    def test_semantic_mapper_keeps_rig_sounds(self):
        mapper = SemanticSoundMapper()
        # Context words ("typing", "reveal") and a late frame would remap other moment types.
        step = SoundMoment(type="footstep", frame=290, confidence=0.95, context="<TypingBot> reveal walk")
        pop = SoundMoment(type="gesture", frame=290, confidence=0.8, context="<DataBot> gestureAt", intensity=0.9)
        assert mapper.select_sound(step, 300).sound == "footstep"
        assert mapper.select_sound(pop, 300).sound == "ui_pop"

    def test_footstep_in_library_and_palette(self):
        assert SOUND_MANIFEST["footstep"]["generator"] == "generate_footstep"
        assert GENERATORS["generate_footstep"] is generate_footstep
        assert DEFAULT_PALETTE["footstep"] == "pro_tap/soft"

    def test_footstep_generator_is_short_soft_and_deterministic(self):
        a, b = generate_footstep(), generate_footstep()
        assert np.array_equal(a, b)
        assert len(a) < 44100 * 0.2
        assert 0.3 < np.max(np.abs(a)) <= 1.0
        assert abs(a[0]) < 0.05 and abs(a[-1]) < 0.05  # no click at either end


class TestAggregation:
    """Footsteps keep their rhythm through aggregation."""

    def steps(self, frame_list: list[int]) -> list[SoundMoment]:
        return [SoundMoment(type="footstep", frame=f, confidence=0.95, context="step", intensity=0.4, source="rig")
                for f in frame_list]

    def test_fast_cadence_survives_min_gap_and_density(self):
        fast = walk_steps(0, 60, 30, 4)  # 7.5 frames apart, under the 10-frame gap
        result = aggregate_moments(self.steps(fast), [], [], max_per_second=3.0, min_gap_frames=10)
        assert [m.frame for m in result] == fast

    def test_footsteps_and_other_cues_coexist(self):
        others = [
            SoundMoment(type="reveal", frame=40, confidence=0.9, context="title"),
            SoundMoment(type="element_appear", frame=44, confidence=0.6, context="chip"),
            SoundMoment(type="gesture", frame=70, confidence=0.8, context="wave", source="rig"),
        ]
        steps = walk_steps(10, 100, 30)
        result = aggregate_moments(others + self.steps(steps), [], [])
        assert frames(result, "footstep") == steps
        assert frames(result, "reveal") == [40]
        assert frames(result, "element_appear") == []  # merged into the reveal, as before
        assert frames(result, "gesture") == [70]

    def test_duplicate_footfalls_collapse(self):
        result = aggregate_moments(self.steps([15, 15, 16, 30]), [], [])
        assert [m.frame for m in result] == [15, 30]

    def test_footsteps_past_scene_end_dropped(self):
        result = aggregate_moments(self.steps([15, 30, 45]), [], [], scene_duration_frames=40)
        assert [m.frame for m in result] == [15, 30]


class TestOrchestrator:
    """Rig cues through the full `sound generate` pipeline."""

    def make_project(self, tmpdir: str, scene_source: str, fps=None) -> Path:
        project_dir = Path(tmpdir) / "rig-project"
        (project_dir / "storyboard").mkdir(parents=True)
        (project_dir / "scenes").mkdir()
        storyboard = {
            "project": "rig-project",
            "scenes": [{"id": "walk_in", "type": "rig-project/walk_in", "audio_duration_seconds": 5.0}],
        }
        (project_dir / "storyboard" / "storyboard.json").write_text(json.dumps(storyboard), encoding="utf-8")
        (project_dir / "scenes" / "walk_in.tsx").write_text(scene_source, encoding="utf-8")
        if fps is not None:
            (project_dir / "config.json").write_text(json.dumps({"video": {"fps": fps}}), encoding="utf-8")
        return project_dir

    SCENE = """import { AbsoluteFill } from "remotion";
import { Fox } from "@remotion-components/storybook/fox";

export default function WalkIn() {
  return (
    <AbsoluteFill>
      <Fox walk={{ from: 10, to: 100, cadence: 2 }} gesture="wave" gestureAt={110} />
    </AbsoluteFill>
  );
}
"""

    def test_footsteps_land_in_storyboard_cues(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = self.make_project(tmpdir, self.SCENE)
            result = SFXOrchestrator(project_dir).generate_sfx_cues()
            assert not result.errors
            board = json.loads((project_dir / "storyboard" / "storyboard.json").read_text(encoding="utf-8"))
        cues = board["scenes"][0]["sfx_cues"]
        steps = [c for c in cues if c["sound"] == "footstep"]
        assert [c["frame"] for c in steps] == [25, 40, 55, 70, 85]
        assert all(c["volume"] < 0.05 for c in steps)
        assert any(c["sound"] == "ui_pop" and c["frame"] == 110 for c in cues)

    def test_rig_cues_added_alongside_other_analyzers(self):
        scene = self.SCENE.replace(
            "<AbsoluteFill>\n", "<AbsoluteFill style={{ opacity: interpolate(frame, [0, 20], [0, 1]) }}>\n"
        )
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = self.make_project(tmpdir, scene)
            analyses = SFXOrchestrator(project_dir).analyze_scenes()
        moments = analyses["walk_in"].moments
        assert frames(moments, "footstep") == [25, 40, 55, 70, 85]
        assert any("Rig cues" in note for note in analyses["walk_in"].analysis_notes)

    def test_project_fps_from_config(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            project_dir = self.make_project(tmpdir, "<Fox walk={{ from: 0, to: 24, cadence: 4 }} />", fps=12)
            orchestrator = SFXOrchestrator(project_dir)
            assert orchestrator.fps == 12
            moments = orchestrator.analyze_scenes()["walk_in"].moments
            assert SFXOrchestrator(project_dir, fps=30).fps == 30  # an explicit fps still wins
        assert frames(moments, "footstep") == [3, 6, 9, 12, 15, 18, 21]

    def test_cue_generator_uses_footstep_sound(self):
        step = SoundMoment(type="footstep", frame=25, confidence=0.95, context="", intensity=0.4, source="rig")
        cues = CueGenerator(use_library=True).generate_cues([step], "walk_in")
        assert cues[0].sound == "footstep" and cues[0].frame == 25
