"""Sound moments for rigged characters, read from the shared rig props in scene files.

Characters built on the shared rig contract (``remotion/src/components/rig/index.ts``) are told when to
gesture and walk with plain props, so the sound timing can be read straight from the scene source:

- ``gestureAt={n}``: a "gesture" moment (a soft pop) at frame n, when the gesture starts to ease in.
- ``walk={{ from: a, to: b, cadence: c }}``: one "footstep" moment per footfall, at the frames
  ``walkSteps()`` returns (cadence is footsteps per second, default 2). Keys in any order, any whitespace.

Only numeric literals are read: a prop whose value is an expression (``gestureAt={beat + 4}``,
``walk={WALK}``, ``walk={{ from: start, to: 90 }}``) is skipped, never guessed. Frames are scene-local,
like every other moment. Keep ``walk_steps`` in step with ``walkSteps`` in the rig contract.

A gesture pop has confidence 0.8, so a stronger cue at the same moment (a literal kit start, a reveal) wins
the merge in the aggregator; footsteps keep their own track there (``aggregator.RHYTHM_TYPES``).
"""

from __future__ import annotations

import math
import re
from pathlib import Path
from typing import Optional

from .kit_analyzer import _strip_comments
from .models import SoundMoment

DEFAULT_CADENCE = 2.0  # footsteps per second, as in the rig contract
WALK_KEYS = ("from", "to", "cadence")

_NUMBER = r"-?\d+(?:\.\d+)?"
GESTURE_PROP = re.compile(r"\bgestureAt=\{\s*(\d+)\s*\}")
WALK_PROP = re.compile(r"\bwalk=\{\{([^{}]*)\}\}")
WALK_PAIR = re.compile(rf"^\s*(\w+)\s*:\s*({_NUMBER})\s*$")
OPEN_TAG = re.compile(r"<([A-Z][\w.]*)\b")


def _js_round(x: float) -> int:
    """JavaScript Math.round: halves round up (Python's round() rounds halves to even)."""
    return math.floor(x + 0.5)


def walk_steps(start: float, end: float, fps: float, cadence: float = DEFAULT_CADENCE) -> list[int]:
    """Scene-local frames where a foot lands. Mirrors ``walkSteps`` in remotion/src/components/rig/index.ts."""
    if cadence <= 0 or fps <= 0:
        return []
    every = fps / cadence
    out: list[int] = []
    i = 1
    while start + i * every < end:
        out.append(_js_round(start + i * every))
        i += 1
    return out


def _parse_walk(body: str) -> Optional[dict[str, float]]:
    """The keys of a literal walk object, or None if any entry is not `key: number` or from/to is missing."""
    parts = [p for p in body.split(",") if p.strip()]
    walk: dict[str, float] = {}
    for part in parts:
        m = WALK_PAIR.match(part)
        if not m or m.group(1) not in WALK_KEYS:
            return None
        walk[m.group(1)] = float(m.group(2))
    if "from" not in walk or "to" not in walk:
        return None
    return walk


def _component_at(source: str, pos: int) -> str:
    """The name of the JSX tag that opens before `pos` (the tag the prop belongs to)."""
    tags = list(OPEN_TAG.finditer(source, 0, pos))
    return tags[-1].group(1) if tags else "?"


def analyze_rig_scene(scene_file: Path, fps: int = 30) -> list[SoundMoment]:
    """Gesture and footstep moments for the rigged characters in a scene file, sorted by frame."""
    source = _strip_comments(Path(scene_file).read_text(encoding="utf-8"))
    moments: list[SoundMoment] = []

    for m in GESTURE_PROP.finditer(source):
        frame = int(m.group(1))
        tag, line = _component_at(source, m.start()), source.count("\n", 0, m.start()) + 1
        moments.append(SoundMoment(
            type="gesture", frame=frame, confidence=0.8, intensity=0.5,
            context=f"<{tag}> gestureAt={frame} (line {line}, rig)", source="rig",
        ))

    for m in WALK_PROP.finditer(source):
        walk = _parse_walk(m.group(1))
        if walk is None:
            continue
        cadence = walk.get("cadence", DEFAULT_CADENCE)
        tag, line = _component_at(source, m.start()), source.count("\n", 0, m.start()) + 1
        steps = walk_steps(walk["from"], walk["to"], fps, cadence)
        for n, frame in enumerate(steps, 1):
            moments.append(SoundMoment(
                type="footstep", frame=frame, confidence=0.95, intensity=0.4,
                context=f"<{tag}> walk footstep {n}/{len(steps)} at frame {frame} (line {line}, rig)",
                source="rig",
            ))

    return sorted(moments, key=lambda mo: mo.frame)
