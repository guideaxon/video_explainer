"""Per style bundle visual styles for shorts.

Each video style bundle (for example "vantage") has its own style guide, shared Remotion kit and
reference scenes. A project opts in by setting ``"style_bundle": "<style bundle>"`` in its ``config.json``;
the custom scene generator then writes scenes in that style instead of the generic dark theme.

To add a style bundle: write ``docs/<name>_video_style_guide.md`` with an LLM brief section between the
``LLM-BRIEF`` markers, put reference scenes in ``templates/<name>_short/scenes/`` and register a
``StyleBundle`` in ``STYLE_BUNDLES``.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent.parent

BRIEF_START = "<!-- LLM-BRIEF-START -->"
BRIEF_END = "<!-- LLM-BRIEF-END -->"


@dataclass(frozen=True)
class StyleBundle:
    """A style bundle's visual style: guide document plus reference scenes."""

    name: str
    guide_path: Path
    reference_scenes_dir: Path
    example_files: tuple[str, ...]

    def brief(self) -> str:
        """The scene-generator brief extracted from the style guide."""
        text = self.guide_path.read_text(encoding="utf-8")
        if BRIEF_START in text and BRIEF_END in text:
            return text.split(BRIEF_START, 1)[1].split(BRIEF_END, 1)[0].strip()
        return text

    def system_prompt(self) -> str:
        return (
            f"You are an expert React/Remotion developer creating animated scene components for "
            f"the '{self.name}' video style bundle (vertical 1080x1920 shorts).\n\n"
            f"{self.brief()}\n"
        )

    def example_scenes(self) -> str:
        """Reference scene code, shown to the model as the pattern to follow."""
        parts = []
        for filename in self.example_files:
            path = self.reference_scenes_dir / filename
            if path.exists():
                parts.append(
                    f"### {filename} (reference, follow this structure and spacing):\n"
                    f"```typescript\n{path.read_text(encoding='utf-8')}\n```"
                )
        return "\n\n".join(parts) or "No reference scenes available."


STYLE_BUNDLES: dict[str, StyleBundle] = {
    "vantage": StyleBundle(
        name="vantage",
        guide_path=REPO_ROOT / "docs" / "vantage_video_style_guide.md",
        reference_scenes_dir=REPO_ROOT / "templates" / "vantage_short" / "scenes",
        example_files=("Beat3Scene.tsx", "Beat4Scene.tsx"),
    ),
}


def load_style(name: str | None) -> StyleBundle | None:
    """Return the registered style for ``name`` or None (generic style)."""
    if not name:
        return None
    style = STYLE_BUNDLES.get(name)
    if style is None:
        raise ValueError(f"Unknown style bundle style '{name}'. Known: {', '.join(STYLE_BUNDLES)}")
    return style


def style_for_scenes_dir(scenes_dir: Path) -> StyleBundle | None:
    """Find the style of the project owning ``projects/<p>/short/<variant>/scenes``."""
    config_path = scenes_dir.parent.parent.parent / "config.json"
    if not config_path.exists():
        return None
    try:
        name = json.loads(config_path.read_text(encoding="utf-8")).get("style_bundle")
    except (OSError, ValueError):
        return None
    return load_style(name) if isinstance(name, str) else None
