"""Optional Earshot backend for the SFX library.

Earshot (https://github.com/Leonxlnx/earshot, MIT) renders sound effects from a bank of code-defined
recipes. This module only decides WHICH bank sound stands in for each library sound name (per style
bundle palette), renders it to ``sfx/<name>.wav`` and records what it did in ``sfx/manifest.json``.
Where cues go is still decided by the scene analyzer and cue generator.

Earshot is run as a subprocess, so this module never imports torch and the base pipeline stays light.
If Earshot is missing, or a render fails, the caller falls back to the built-in numpy sounds.
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import wave
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

EARSHOT_URL = "https://github.com/Leonxlnx/earshot"
INSTALL_HINT = 'pip install -e ".[earshot]" (about 1.2 GB: PyTorch CPU and two models)'
SAMPLE_RATE = 48000  # Remotion mixes at 48 kHz, so no resampling at render time
PEAK_DB = -3.0  # the built-in sounds peak near -3 dB; the cue volumes (0.05 to 0.15) were tuned to that
MANIFEST_NAME = "manifest.json"
RENDER_TIMEOUT_SECONDS = 60

# Bank id for every library sound name. Palettes override a subset of this; the rest is inherited.
# Chosen by sound kind and length (all under 2 s); not auditioned by the author.
DEFAULT_PALETTE: dict[str, str] = {
    "ui_pop": "pro_pop/thup",
    "text_tick": "pro_hover_tick/soft",
    "lock_click": "pro_click/snap",
    "data_flow": "pro_zip/down_warm",
    "counter_sweep": "pro_riser/air_gate",
    "reveal_hit": "pro_impact/short",
    "warning_tone": "pro_sub_drop/low",
    "success_tone": "pro_notify/ding_1930",
    "transition_whoosh": "pro_whoosh_big/swell",
    "cache_click": "pro_tap/finger",
    "keyboard_type": "pro_typing_key/glass",
    "keyboard_rapid": "pro_typing_run/soft",
    "bar_grow": "pro_riser/roll",
    "progress_tick": "pro_hover_tick/ping",
    "digital_stream": "pro_glitch/data",
    "impact_soft": "pro_impact/air",
    "impact_hard": "pro_impact/deep",
    "footstep": "pro_tap/soft",
}

# One palette per style bundle (docs/*_video_style_guide.md): styles must not share a sound set.
STYLE_PALETTES: dict[str, dict[str, str]] = {
    # Calm editorial line art: soft, warm, low-energy.
    "vantage": {
        "lock_click": "pro_tap/soft", "success_tone": "pro_notify/ding_1822",
        "transition_whoosh": "pro_whoosh_big/windy", "reveal_hit": "pro_impact/air",
        "impact_hard": "pro_impact/air",
    },
    # Data journalism: crisp and precise; charts tick up in steps.
    "markets": {
        "text_tick": "pro_hover_tick/detent", "lock_click": "pro_click/mouse",
        "keyboard_type": "pro_typing_key/tick", "bar_grow": "pro_riser/nblips",
        "counter_sweep": "pro_riser/nblips_hi", "transition_whoosh": "pro_whoosh_big/tonal",
    },
    # SaaS product launch: glossy, polished.
    "promo": {
        "ui_pop": "pro_pop_in/round", "transition_whoosh": "pro_whoosh_big/tonal",
        "success_tone": "pro_notify/ding_2167", "reveal_hit": "pro_logo_sting/swell_sting",
        "data_flow": "pro_zip/down", "bar_grow": "pro_riser/air_gate",
    },
    # Playful consumer app: bouncy and bright.
    "launch": {
        "ui_pop": "pro_pop/boop", "text_tick": "pro_hover_tick/ping", "success_tone": "pro_notify/ding_2296",
        "reveal_hit": "pro_logo_sting/zap_bloom", "transition_whoosh": "pro_whoosh_big/long",
        "lock_click": "pro_click/tink",
    },
    # Kawaii pixel pop: chirpy blips.
    "lyric": {
        "ui_pop": "pro_pop/chirp", "text_tick": "pro_typing_key/blip", "keyboard_type": "pro_typing_key/blip",
        "success_tone": "pro_notify/ding_2296", "lock_click": "pro_click/glass",
        "digital_stream": "pro_glitch/sparse", "reveal_hit": "pro_pop_in/double",
    },
    # Pixel-mosaic satire: glitchy and crunchy.
    "leaderbot": {
        "ui_pop": "pro_pop/double", "digital_stream": "pro_glitch/crunchy", "data_flow": "pro_glitch/fastroll",
        "reveal_hit": "pro_glitch/standard", "warning_tone": "pro_sub_drop/quick",
        "text_tick": "pro_typing_key/crackle", "keyboard_type": "pro_typing_key/crackle",
    },
    # Product demo from real screenshots: natural device taps and clicks.
    "demo": {
        "lock_click": "pro_tap/glass", "cache_click": "pro_tap/knock", "ui_pop": "pro_pop_in/airy",
        "text_tick": "pro_typing_key/glass", "success_tone": "pro_notify/ding_2045",
        "transition_whoosh": "pro_whoosh_big/windy",
    },
}

# Level relative to the peak, 6 dB per doubling (earshot sfx render --weight). Only for sounds that are
# meant to sit under the others.
WEIGHTS: dict[str, float] = {"impact_soft": 0.6, "footstep": 0.6}


def palette_names() -> list[str]:
    return ["default", *STYLE_PALETTES]


def palette(name: str) -> dict[str, str]:
    """The full sound-name -> bank id map for a palette name. Raises KeyError for an unknown name."""
    if name == "default":
        return dict(DEFAULT_PALETTE)
    return {**DEFAULT_PALETTE, **STYLE_PALETTES[name]}


def overrides_for_project(config: dict) -> dict[str, str]:
    """config.json sound.overrides: {library sound name: bank id}. A palette is only a starting point, so a
    project can swap any single sound. Entries naming an unknown library sound are ignored."""
    raw = (config.get("sound") or {}).get("overrides") or {}
    return {k: v for k, v in raw.items() if k in DEFAULT_PALETTE and isinstance(v, str) and v}


def palette_for_project(config: dict) -> str:
    """config.json sound.palette if set, else the style bundle's palette, else the default."""
    chosen = (config.get("sound") or {}).get("palette")
    if chosen in palette_names():
        return chosen
    bundle = config.get("style_bundle") or ""
    return bundle if bundle in STYLE_PALETTES else "default"


# ----- finding and describing the installation ----------------------------------------------------


def _env() -> dict[str, str]:
    return {**os.environ, "PYTHONUTF8": "1"}


def find_earshot() -> Path | None:
    """EARSHOT_BIN, then the executable beside this Python (a pip install in the same venv), then PATH."""
    exe = "earshot.exe" if os.name == "nt" else "earshot"
    candidates = [os.environ.get("EARSHOT_BIN"), str(Path(sys.executable).parent / exe), shutil.which("earshot")]
    for c in candidates:
        if c and Path(c).is_file():
            return Path(c)
    return None


@dataclass(frozen=True)
class Status:
    available: bool
    path: str = ""
    detail: str = ""
    fix: str = ""
    bank: tuple[str, ...] = ()


_status_cache: tuple[float, Status] | None = None
STATUS_TTL_SECONDS = 30.0


def status(refresh: bool = False) -> Status:
    """Whether Earshot can render here. Runs `earshot sfx list` once and caches it briefly."""
    global _status_cache
    if not refresh and _status_cache and time.time() - _status_cache[0] < STATUS_TTL_SECONDS:
        return _status_cache[1]
    result = _probe()
    _status_cache = (time.time(), result)
    return result


def _probe() -> Status:
    exe = find_earshot()
    if exe is None:
        return Status(False, detail="not installed", fix=f"Optional: {INSTALL_HINT}. See {EARSHOT_URL}")
    try:
        proc = subprocess.run([str(exe), "sfx", "list"], capture_output=True, text=True, timeout=120, env=_env())
    except (OSError, subprocess.TimeoutExpired) as e:
        return Status(False, str(exe), f"could not run: {e}", f"Reinstall: {INSTALL_HINT}")
    if proc.returncode != 0:
        return Status(False, str(exe), (proc.stderr or proc.stdout).strip()[-200:], f"Reinstall: {INSTALL_HINT}")
    lines = proc.stdout.splitlines()
    bank = tuple(ln.split()[0] for ln in lines if ln.strip() and "/" in ln.split()[0])
    header = next((ln for ln in lines if "sounds in the bank" in ln), f"{len(bank)} sounds")
    return Status(True, str(exe), header.strip(), "", bank)


# ----- rendering ---------------------------------------------------------------------------------


def _wav_seconds(path: Path) -> float:
    with wave.open(str(path), "rb") as w:
        return w.getnframes() / w.getframerate()


def _render_one(exe: Path, name: str, bank_id: str, out: Path) -> dict:
    """Render one bank sound to a 16-bit 48 kHz WAV at `out`. Returns the manifest entry (or an error)."""
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "raw.wav"
        cmd = [str(exe), "--threads", "1", "sfx", "render", bank_id, "-o", str(raw),
               "--sr", str(SAMPLE_RATE), "--peak", str(PEAK_DB)]
        if name in WEIGHTS:
            cmd += ["--weight", str(WEIGHTS[name])]
        # A render takes about 4 s (mostly importing torch). One stalled for minutes once, so give each
        # attempt a short limit and retry once; a failure becomes a fallback to the built-in sound.
        proc = None
        for attempt in (1, 2):
            try:
                proc = subprocess.run(cmd, capture_output=True, text=True, timeout=RENDER_TIMEOUT_SECONDS, env=_env())
                break
            except subprocess.TimeoutExpired:
                if attempt == 2:
                    return {"bank": bank_id, "error": f"timed out after {RENDER_TIMEOUT_SECONDS}s (twice)"}
            except OSError as e:
                return {"bank": bank_id, "error": f"could not run earshot: {e}"}
        if proc.returncode != 0 or not raw.is_file():
            return {"bank": bank_id, "error": (proc.stderr or proc.stdout).strip()[-300:] or "render failed"}
        # Earshot writes 24-bit WAV. Convert to 16-bit so every Remotion/ffmpeg path reads it the same way.
        conv = subprocess.run(
            ["ffmpeg", "-y", "-v", "error", "-i", str(raw), "-c:a", "pcm_s16le", "-ar", str(SAMPLE_RATE), str(out)],
            capture_output=True, text=True, timeout=60,
        )
        if conv.returncode != 0:
            return {"bank": bank_id, "error": f"ffmpeg: {conv.stderr.strip()[-200:]}"}
    checks = proc.stdout.split("checks:", 1)[-1].strip().splitlines()[0] if "checks:" in proc.stdout else ""
    return {
        "engine": "earshot", "bank": bank_id, "seconds": round(_wav_seconds(out), 3),
        "warnings": [] if checks.startswith("clean") or not checks else [checks],
    }


def render_palette(
    sfx_dir: Path, palette_name: str, names: list[str], overrides: dict[str, str] | None = None,
) -> dict[str, dict]:
    """Render `names` with Earshot into `sfx_dir`. Each entry is a manifest entry or {"error": ...}.

    `overrides` replaces single sounds of the palette (the palette is a starting point, not the final style).
    """
    st = status()
    if not st.available:
        raise RuntimeError(f"Earshot is not available: {st.detail}. {st.fix}")
    mapping = {**palette(palette_name), **(overrides or {})}
    exe = Path(st.path)
    sfx_dir.mkdir(parents=True, exist_ok=True)

    def work(name: str) -> tuple[str, dict]:
        bank_id = mapping.get(name)
        if bank_id is None:
            return name, {"error": "no palette entry"}
        if st.bank and bank_id not in st.bank:
            return name, {"bank": bank_id, "error": f"{bank_id} is not in this Earshot's bank"}
        return name, _render_one(exe, name, bank_id, sfx_dir / f"{name}.wav")

    with ThreadPoolExecutor(max_workers=4) as pool:
        return dict(pool.map(work, names))


# ----- manifest and audit ------------------------------------------------------------------------


def write_manifest(sfx_dir: Path, engine: str, palette_name: str, sounds: dict[str, dict]) -> Path:
    sfx_dir.mkdir(parents=True, exist_ok=True)
    path = sfx_dir / MANIFEST_NAME
    payload = {
        "engine": engine, "palette": palette_name, "generated": time.time(),
        "earshot": status().detail if engine == "earshot" else "", "sounds": sounds,
    }
    path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return path


def read_manifest(sfx_dir: Path) -> dict | None:
    try:
        return json.loads((sfx_dir / MANIFEST_NAME).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def _storyboard_cues(project_dir: Path) -> list[dict]:
    try:
        scenes = json.loads((project_dir / "storyboard" / "storyboard.json").read_text(encoding="utf-8")).get("scenes", [])
    except (OSError, json.JSONDecodeError):
        return []
    return [cue for scene in scenes for cue in (scene.get("sfx_cues") or [])]


def count_cues(project_dir: Path) -> int:
    """How many SFX cues the project's storyboard holds."""
    return len(_storyboard_cues(project_dir))


def audit_project(project_dir: Path, fps: int = 30) -> list[tuple[str, str]]:
    """Model-free checks of the SFX a project will play. Returns (level, message), level ERROR/WARN/INFO.

    ERROR: a cue names a sound with no file (Remotion cannot load it). WARN: Earshot flagged a sound,
    or a sound is longer than the 60 frames a cue gets when it sets no duration_frames.
    """
    sfx_dir = project_dir / "sfx"
    out: list[tuple[str, str]] = []
    manifest = read_manifest(sfx_dir)
    sounds = (manifest or {}).get("sounds", {})

    cues = _storyboard_cues(project_dir)
    if not cues:
        if manifest:  # the Sound step ran, so this is a real problem, not just an unused optional step
            out.append(("WARN", "no SFX cues in the storyboard: nothing will play in the render"))
        else:
            out.append(("INFO", "no SFX cues in the storyboard (the Sound step has not run)"))
        return out
    used = sorted({c["sound"] for c in cues if c.get("sound")})
    out.append(("INFO", f"{len(cues)} SFX cues using {len(used)} sounds"
                        + (f" ({manifest['engine']}, palette {manifest['palette']})" if manifest else "")))
    for name in used:
        if not (sfx_dir / f"{name}.wav").is_file():
            out.append(("ERROR", f"cue sound {name!r} has no file: sfx/{name}.wav (run: sound <project> build)"))
    for name, entry in sounds.items():
        if name not in used:
            continue
        for w in entry.get("warnings", []):
            out.append(("WARN", f"sound {name} ({entry.get('bank', entry.get('engine'))}): {w}"))
    limit = 60 / fps  # the player's default clip length for a cue
    for c in cues:
        entry = sounds.get(c.get("sound", ""), {})
        if entry.get("seconds", 0) > limit and not c.get("duration_frames"):
            out.append(("WARN", f"sound {c['sound']} is {entry['seconds']}s and will be cut at 60 frames "
                                f"(cue at frame {c.get('frame')} sets no duration_frames)"))
            break
    return out
