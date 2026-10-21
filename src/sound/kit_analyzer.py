"""Sound moments for style bundle scenes, read from the shared Remotion kit's component timing.

Style bundle scenes (Markets, Promo, Launch, Lyric, Leaderbot) compose kit components such as
``<Title delay={4}>`` or ``<LineChart from={8}>`` and hold no ``interpolate``/``spring`` calls of their
own, so the AST and regex analyzers find nothing in them. Each kit component takes its start frame as a
``from`` or ``delay`` prop whose default is declared in the kit, so the start frame can be read from the
source: the literal prop if the scene sets one, else the kit default.

Deliberately conservative: only components recognised below produce a moment, and a component whose
start frame cannot be read is skipped. The moment marks when the element STARTS; it does not follow the
element's own easing.
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import Optional

from .models import SoundMoment

# Ordered: first matching rule wins. (component-name pattern, moment type, intensity)
RULES: list[tuple[str, str, float]] = [
    (r"^(LineChart|CandleChart|HBars|Heatmap|AreaChart|PollBars|PixelBars|Meter|Donut|Gauge)$", "chart_grow", 0.7),
    (r"^(BigNumber|Stat|StatCard|StatCards|Counter|Stopwatch)$", "counter", 0.7),
    (r"^(Slam|Stamp|Logo|Wordmark|Mascot|BullHead|Pixie|PixelBot|BotGrid)$", "reveal", 0.9),
    (r"^(Title|Kicker|Headline|Eyebrow|Sub|BubbleTitle|Typed|Cursive)$", "text_reveal", 0.6),
    (r"^(Network|Hub)$", "data_flow", 0.6),
    (r"^(Annotation|Chip|Toast|Sticker|Receipt|Speech|Tile|PhoneMock|PhoneFrame|ScreenMock|Browser|Glass|"
     r"WidgetCard|RetroWindow|Terminal|Newspaper|StorePill|LivePill|Button|Feature|Credits|ChatList|PromptBox)$",
     "element_appear", 0.7),
]
START_PROPS = ("from", "delay", "at")
KIT_IMPORT = re.compile(r'import\s*\{([^}]*)\}\s*from\s*"@remotion-components/(\w+)/kit"', re.S)


def _strip_comments(source: str) -> str:
    no_block = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
    return re.sub(r"(?<![:\w])//[^\n]*", "", no_block)


def _kit_default_start(kit_source: str, component: str) -> Optional[int]:
    """The `from`/`delay` default in a kit component's destructured props, e.g. `({ y, from = 8 }) =>`."""
    m = re.search(rf"^export const {component}\b", kit_source, re.M)
    if not m:
        return None
    # The props destructuring ends at the `}) =>` that opens the component body; no arrow, no default.
    parts = re.split(r"\}\)\s*=>", kit_source[m.start(): m.start() + 1500], maxsplit=1)
    if len(parts) < 2:
        return None
    found = re.search(r"\b(?:" + "|".join(START_PROPS) + r")\s*=\s*(\d+)\b", parts[0])
    return int(found.group(1)) if found else None


def _tag_start(tag_attrs: str) -> tuple[Optional[int], bool]:
    """(literal start frame or None, whether a start prop was present but not a plain number)."""
    for prop in START_PROPS:
        m = re.search(rf"\b{prop}=\{{\s*(\d+)\s*\}}", tag_attrs)
        if m:
            return int(m.group(1)), False
        if re.search(rf"\b{prop}=\{{", tag_attrs):
            return None, True
    return None, False


def analyze_kit_scene(scene_file: Path, kit_dir: Optional[Path] = None) -> list[SoundMoment]:
    """Sound moments for the kit components a style bundle scene file uses."""
    source = _strip_comments(scene_file.read_text(encoding="utf-8"))
    imports = KIT_IMPORT.search(source)
    if not imports:
        return []
    names = {n.strip() for n in imports.group(1).split(",") if n.strip()}
    bundle = imports.group(2)

    if kit_dir is None:
        kit_dir = Path(__file__).resolve().parents[2] / "remotion" / "src" / "components"
    kit_file = kit_dir / bundle / "kit.tsx"
    kit_source = kit_file.read_text(encoding="utf-8") if kit_file.is_file() else ""

    moments: list[SoundMoment] = []
    for tag in re.finditer(r"<([A-Z]\w*)\b((?:[^<>{}]|\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*?)/?>", source):
        component, attrs = tag.group(1), tag.group(2)
        if component not in names:
            continue
        rule = next((r for r in RULES if re.match(r[0], component)), None)
        if rule is None:
            continue
        literal, dynamic = _tag_start(attrs)
        if literal is not None:
            frame, confidence = literal, 0.85
        else:
            default = _kit_default_start(kit_source, component)
            if default is None:
                continue
            frame, confidence = default, 0.5 if dynamic else 0.7
        line = source.count("\n", 0, tag.start()) + 1
        moments.append(SoundMoment(
            type=rule[1], frame=frame, confidence=confidence, intensity=rule[2],
            context=f"<{component}> starts at frame {frame} (line {line}, {bundle} kit)", source="kit",
        ))
    return sorted(moments, key=lambda m: m.frame)
