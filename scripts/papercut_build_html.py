"""Build a Papercut style bundle project into one self-contained HTML film (with music, and optionally a voice).

Usage:
    python scripts/papercut_build_html.py <project>

Thin wrapper (so the UI can run it like every other step) around ``node scripts/papercut_build_html.mjs``.
Output: ``projects/<project>/film.html``; open it in any browser.

Voice (optional): with ``"voice": true`` in ``config.json``, each ``voiceover/<scene_id>.mp3`` (made by
``python -m src.cli voiceover <project>`` from ``narration/narrations.json``) is embedded as a base64 MP3 data URI with
its lip sync (``_lipsync`` loudness curve, plus Rhubarb shapes when on PATH, at the project fps). Narration entry i belongs to papercut scene i (or to scene
``"scene": n``, 1-based, when given); an entry with empty narration or no clip is a silent scene. Clip i plays from the
start of scene i and is cut at the scene end (``sceneSeconds`` in main.tsx, default 6), so longer clips are warned about.
"""

from __future__ import annotations

import base64
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

import _lipsync  # noqa: E402


def voice_enabled(project_dir: Path) -> bool:
    cfg = project_dir / "config.json"
    return cfg.exists() and bool(json.loads(cfg.read_text(encoding="utf-8")).get("voice"))


def scene_seconds(project_dir: Path) -> float:
    """``sceneSeconds`` passed to mountPlayer in main.tsx (default 6)."""
    main = project_dir / "main.tsx"
    m = re.search(r"sceneSeconds\s*:\s*([\d.]+)", main.read_text(encoding="utf-8")) if main.exists() else None
    return float(m.group(1)) if m else 6.0


def clip_seconds(mp3: Path) -> float | None:
    if not shutil.which("ffprobe"):
        return None
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(mp3)],
                         capture_output=True, text=True)
    try:
        return float(out.stdout.strip())
    except ValueError:
        return None


def voice_payload(project_dir: Path) -> dict:
    """``{fps, clips}`` for the player: clips[i] is scene i's clip (data URI, duration, lip sync, text) or None."""
    narr_path = project_dir / "narration" / "narrations.json"
    if not narr_path.exists():
        raise SystemExit(f'"voice": true but {narr_path} is missing: write one entry per scene (scene_id, title, '
                         "duration_seconds, narration), then run: python -m src.cli voiceover <project>")
    entries = json.loads(narr_path.read_text(encoding="utf-8")).get("scenes", [])
    fps = _lipsync.project_fps(project_dir)
    limit = scene_seconds(project_dir)
    rhubarb = _lipsync.find_rhubarb()
    if not rhubarb:
        print("Warning: rhubarb not on PATH (or RHUBARB_BIN); loudness lip sync only (no mouth shapes)", file=sys.stderr)
    clips: list[dict | None] = []
    for pos, e in enumerate(entries):
        idx = int(e["scene"]) - 1 if e.get("scene") else pos
        sid, text = e["scene_id"], (e.get("narration") or "").strip()
        mp3 = project_dir / "voiceover" / f"{sid}.mp3"
        if not text:
            continue
        if not mp3.exists() or mp3.stat().st_size == 0:
            print(f"Warning: no voiceover/{sid}.mp3; scene {idx + 1} is silent", file=sys.stderr)
            continue
        mouth = _lipsync.mouth_curve(mp3, fps)  # per clip, not _lipsync.bake: silent scenes may leave 0-byte mp3s
        dur = clip_seconds(mp3) or len(mouth) / fps
        if dur > limit + 0.05:
            print(f"Warning: voiceover/{sid}.mp3 is {dur:.1f} s, longer than its {limit:g} s scene {idx + 1}; "
                  "it is cut at the scene end (shorten the line or raise sceneSeconds)", file=sys.stderr)
        clip = {"id": sid, "text": text, "dur": round(dur, 3), "mouth": mouth,
                "src": "data:audio/mpeg;base64," + base64.b64encode(mp3.read_bytes()).decode("ascii")}
        if rhubarb:
            try:
                clip["visemes"] = _lipsync.cues_to_frames(_lipsync.rhubarb_cues(mp3, text, rhubarb), fps, len(mouth))
            except (subprocess.CalledProcessError, json.JSONDecodeError) as err:
                print(f"Warning: rhubarb failed on {mp3.name} ({err}); loudness only for this scene", file=sys.stderr)
        clips.extend([None] * (idx + 1 - len(clips)))
        clips[idx] = clip
    if not any(clips):
        raise SystemExit('"voice": true but no voiceover clips were found: run python -m src.cli voiceover <project>')
    return {"fps": fps, "clips": clips}


def main(argv: list[str] | None = None) -> int:
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print(__doc__, file=sys.stderr)
        return 2
    node = shutil.which("node")
    if not node:
        print("node not found. Install Node 22.", file=sys.stderr)
        return 1
    cmd = [node, str(REPO_ROOT / "scripts" / "papercut_build_html.mjs"), args[0]]
    project_dir = REPO_ROOT / "projects" / args[0]
    if not voice_enabled(project_dir):
        return subprocess.run(cmd, cwd=REPO_ROOT).returncode
    if not shutil.which("ffmpeg"):
        print("ffmpeg not found (needed for the voice lip sync)", file=sys.stderr)
        return 1
    payload = voice_payload(project_dir)
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / "voice.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"), encoding="utf-8")
        n = sum(1 for c in payload["clips"] if c)
        print(f"Voice: {n} clip(s), {path.stat().st_size / 1e6:.1f} MB embedded", flush=True)
        return subprocess.run(cmd + ["--voice", str(path)], cwd=REPO_ROOT).returncode


if __name__ == "__main__":
    sys.exit(main())
