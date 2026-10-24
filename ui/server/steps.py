"""Pipeline step table: the one place that knows each step's command, output and project-type variant.

The wizard always shows the same ten steps. A step is run, manual (edit files by hand), skipped or
hidden depending on whether the project is a standard project or a style bundle project (``"style_bundle"`` in
``config.json``). Adding a style bundle or an optional step is a change to this table only.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Callable

# Full-video style bundles the UI can drive. Vantage shorts use the `short` CLI commands; not in v1.
FULL_STYLE_BUNDLES = ("markets", "promo", "launch", "lyric", "leaderbot", "demo", "storybook", "papercut")

RUN, MANUAL, SKIPPED, HIDDEN = "run", "manual", "skipped", "hidden"


@dataclass(frozen=True)
class Ctx:
    project: str
    style_bundle: str  # "" for a standard project
    project_dir: Path


@dataclass(frozen=True)
class Variant:
    mode: str = RUN
    # argv after the Python executable, relative to the repo root; None means nothing to run (manual)
    build: Callable[[Ctx], list[str] | None] | None = None
    note: str = ""
    # "@key" is a path from config.json "paths"; anything else is relative to the project folder
    outputs: tuple[str, ...] = ()
    # steps with no output file (review, verify) count as done when their last job exited 0
    job_output: bool = False
    force_flag: str | None = None


@dataclass(frozen=True)
class StepDef:
    id: str
    title: str
    gated: bool  # needs a human approval click before it counts as approved
    standard: Variant
    style_bundle: Variant
    # An optional step never blocks the steps after it and does not count toward progress until it has run.
    optional: bool = False

    def variant(self, ctx: Ctx) -> Variant:
        if ctx.style_bundle == "papercut" and self.id in PAPERCUT_VARIANTS:
            return PAPERCUT_VARIANTS[self.id]
        return self.style_bundle if ctx.style_bundle else self.standard


def _cli(command: str, *extra: str) -> Callable[[Ctx], list[str]]:
    return lambda c: ["-m", "src.cli", command, c.project, *extra]


def _script(name: str) -> Callable[[Ctx], list[str]]:
    return lambda c: [f"scripts/{name.format(style_bundle=c.style_bundle)}.py", c.project]


def _style_bundle_scenes(c: Ctx) -> list[str] | None:
    """Scaffold a style bundle project once; after that, scenes are edited by hand (or rebuilt for Demo)."""
    if c.style_bundle == "demo":
        if (c.project_dir / "manifest.json").exists():
            return ["scripts/demo_build_scenes.py", c.project]
        return None  # needs screenshots and a manifest first
    if (c.project_dir / "scenes" / "index.ts").exists():
        return None
    return [f"scripts/{c.style_bundle}_new_video.py", c.project]


STEPS: tuple[StepDef, ...] = (
    StepDef("treatment", "Treatment", False, Variant(HIDDEN), Variant(HIDDEN)),
    StepDef(
        "script", "Script", True,
        Variant(RUN, _cli("script"), outputs=("@script",)),
        Variant(SKIPPED, note="Style bundle projects gather content while editing scenes"),
    ),
    StepDef(
        "narration", "Narration", True,
        Variant(RUN, _cli("narration"), outputs=("@narration",), force_flag="--force"),
        Variant(MANUAL, note="Edit narration/narrations.json", outputs=("@narration",)),
    ),
    StepDef(
        "scenes", "Scenes", True,
        Variant(RUN, _cli("scenes"), outputs=("remotion/scenes", "scenes"), force_flag="--force"),
        Variant(RUN, _style_bundle_scenes, note="Scaffold once, then edit the scenes", outputs=("scenes",)),
    ),
    StepDef(
        "review", "Review", False,
        Variant(SKIPPED, note="The pre-render review script covers style bundle projects only"),
        Variant(RUN, lambda c: ["scripts/review_video.py", c.project, "--brief"], job_output=True),
    ),
    StepDef(
        "voiceover", "Voiceover", True,
        Variant(RUN, _cli("voiceover"), outputs=("@voiceover_manifest",)),
        Variant(RUN, _cli("voiceover"), outputs=("@voiceover_manifest",)),
    ),
    StepDef(
        "storyboard", "Storyboard", False,
        Variant(RUN, _cli("storyboard"), outputs=("@storyboard",), force_flag="--force"),
        Variant(RUN, _script("{style_bundle}_finalize_storyboard"), outputs=("@storyboard",)),
    ),
    StepDef(
        "sound", "Sound", False,
        Variant(RUN, _cli("sound", "build"), note="Optional: sound effects and cues. Render works without it.",
                outputs=("sfx/manifest.json",)),
        Variant(RUN, _cli("sound", "build"), note="Optional: sound effects and cues. Render works without it.",
                outputs=("sfx/manifest.json",)),
        optional=True,
    ),
    StepDef(
        "render", "Render", True,
        Variant(RUN, _cli("render"), outputs=("@final_video",)),
        Variant(RUN, _cli("render"), outputs=("@final_video",)),
    ),
    StepDef(
        "verify", "Verify and export", True,
        Variant(RUN, lambda c: ["-m", "ui.server.verify", c.project], job_output=True),
        Variant(RUN, lambda c: ["-m", "ui.server.verify", c.project], job_output=True),
    ),
)

# Papercut is an HTML film with a generated score: no script, narration, voiceover or MP4 render. Its project is
# scaffolded once from the template, edited by hand, then built into one self-contained film.html (music included).
_PC_NO_NARRATION = "Papercut films have music, not narration"
PAPERCUT_VARIANTS: dict[str, Variant] = {
    "script": Variant(SKIPPED, note="Papercut projects start from the template scenes"),
    "narration": Variant(SKIPPED, note=_PC_NO_NARRATION),
    "scenes": Variant(
        RUN, lambda c: None if (c.project_dir / "main.tsx").exists() else ["scripts/papercut_new_video.py", c.project],
        note="Scaffold once (the fox film), then edit scenes.tsx and score.ts", outputs=("scenes.tsx",),
    ),
    "review": Variant(SKIPPED, note="No pre-render review for papercut films"),
    "voiceover": Variant(SKIPPED, note=_PC_NO_NARRATION),
    "storyboard": Variant(SKIPPED, note="Scenes are timed by the score, not a storyboard"),
    "sound": Variant(SKIPPED, note="The score is generated in code (score.ts)"),
    "render": Variant(RUN, _script("papercut_build_html"), note="Builds one HTML file with the music included",
                      outputs=("film.html",)),
    "verify": Variant(SKIPPED, note="Open film.html in a browser to check it"),
}

STEP_IDS = tuple(s.id for s in STEPS)

# Where a config "paths" key falls back to when config.json lacks it.
DEFAULT_PATHS = {
    "script": "script/script.json",
    "narration": "narration/narrations.json",
    "voiceover_manifest": "voiceover/manifest.json",
    "storyboard": "storyboard/storyboard.json",
    "final_video": "output/final.mp4",
}


def step_by_id(step_id: str) -> StepDef | None:
    return next((s for s in STEPS if s.id == step_id), None)
