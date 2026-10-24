"""Claude Code PreToolUse guard. Three rules that hold even when the agent forgets them.

1. No paid API call outside the repo's own code: a script or inline snippet that reaches ElevenLabs or another
   paid generation host from outside ``src/`` or ``scripts/`` is denied (one-off runners skip budgets and review).
2. No finished video or audio is sent to the user (SendUserFile) unless ``projects/<p>/qc/qc.json`` exists, passed,
   is marked reviewed, and its sha1 matches the file (run ``scripts/continuity_qc.py --project <p>``, read the brief,
   re-run with ``--reviewed``). Names containing DRAFT or
   PREVIEW may be sent to ask a question; they are never deliverables.
3. Style bundles are not mixed: a project scene under ``projects/<p>/scenes/`` or ``short/`` may only import the
   kit of the style bundle set in that project's ``config.json``.

Configured in ``.claude/settings.json``. Reads the tool call as JSON on stdin; prints a deny decision or nothing.
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
PAID = re.compile(r"api\.elevenlabs\.io|elevenlabs\.io/v1|api\.kie\.ai|api\.apimart\.ai|api\.openai\.com/v1/(images|videos)")
INLINE = re.compile(r"(python3?|py)\s+-c\b|node\s+(-e|--eval)\b|(python3?|py|node)\s+-?\s*<<|\bcurl\b|\bwget\b|Invoke-(WebRequest|RestMethod)", re.I)
CODE = re.compile(r"\.(py|mjs|cjs|js|ts|ps1|sh)$", re.I)
MEDIA = re.compile(r"\.(mp4|mov|m4v|webm|mkv|mp3|wav|m4a|aac|flac)$", re.I)
KIT_IMPORT = re.compile(r"components/(vantage|markets|promo|launch|lyric|leaderbot|demo|storybook|papercut|isofigure|lowpoly)\b")


def deny(reason: str) -> dict:
    return {"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny",
                                   "permissionDecisionReason": f"Repo guard: {reason}"}}


def inside(path: Path, *dirs: str) -> bool:
    return any(path.is_relative_to(ROOT / d) for d in dirs)


def sha1(path: Path) -> str:
    return hashlib.sha1(path.read_bytes()).hexdigest()


def decide(call: dict) -> dict | None:
    tool, inp = call.get("tool_name", ""), call.get("tool_input") or {}
    if tool in ("Bash", "PowerShell"):
        cmd = str(inp.get("command", ""))
        if PAID.search(cmd) and INLINE.search(cmd):
            return deny("paid API call outside src/ or scripts/. Add the step to the pipeline code instead of a one-off command.")
        for m in re.finditer(r"(?:python3?|py|node|bash|sh|pwsh|powershell)(?:\s+-\S+)*\s+(\"[^\"]+\"|'[^']+'|\S+)", cmd, re.I):
            f = m.group(1).strip("\"'")
            if not CODE.search(f):
                continue
            p = (ROOT / f).resolve() if not Path(f).is_absolute() else Path(f)
            if p.exists() and not inside(p, "src", "scripts", ".claude") and PAID.search(p.read_text(errors="ignore")):
                return deny(f"{f} calls a paid API outside src/ or scripts/. One-off runner scripts are not allowed.")
    if tool in ("Write", "Edit", "MultiEdit", "NotebookEdit"):
        f = Path(str(inp.get("file_path") or inp.get("notebook_path") or ""))
        text = str(inp.get("content") or inp.get("new_string") or inp.get("new_source") or
                   "\n".join(e.get("new_string", "") for e in inp.get("edits", [])))
        if CODE.search(f.name) and f.is_absolute() and not inside(f, "src", "scripts", ".claude") and PAID.search(text):
            return deny(f"{f.name} would call a paid API outside src/ or scripts/.")
        rel = f.relative_to(ROOT) if f.is_absolute() and f.is_relative_to(ROOT) else None
        in_scenes = rel and len(rel.parts) > 3 and rel.parts[2] in ("scenes", "short")
        papercut_root = rel and len(rel.parts) == 3 and rel.name in ("scenes.tsx", "main.tsx", "figure.tsx")  # papercut and isofigure keep their sources at the project root
        if rel and rel.parts[0] == "projects" and (in_scenes or papercut_root) and f.suffix == ".tsx":
            cfg = ROOT / "projects" / rel.parts[1] / "config.json"
            bundle = json.loads(cfg.read_text(encoding="utf-8")).get("style_bundle") if cfg.exists() else None
            other = {b for b in KIT_IMPORT.findall(text) if bundle and b != bundle}
            if other:
                return deny(f"{rel.parts[1]} is a {bundle} project but this scene imports the {', '.join(sorted(other))} kit. Do not mix style bundles.")
    if tool == "SendUserFile":
        for f in inp.get("files", []):
            if not MEDIA.search(f) or re.search(r"draft|preview", Path(f).name, re.I):
                continue
            p = Path(f) if Path(f).is_absolute() else ROOT / f
            m = re.search(r"projects[\\/]([^\\/]+)[\\/]", str(p))
            receipt = ROOT / "projects" / m.group(1) / "qc" / "qc.json" if m else None
            if not receipt or not receipt.exists():
                return deny(f"{p.name} has no QC receipt. Run scripts/continuity_qc.py --project <p> first, or name it *PREVIEW* to ask a question.")
            if not p.is_file():
                return deny(f"{p} does not exist.")
            r = json.loads(receipt.read_text(encoding="utf-8"))
            if not r.get("passed") or r.get("sha") != sha1(p):
                return deny(f"{p.name} is not the file that passed QC (hash mismatch or failed). Re-run scripts/continuity_qc.py.")
            if not r.get("reviewed"):
                return deny(f"{p.name} passed the script checks but the contact sheet was not reviewed. Read qc/brief.md, then re-run with --reviewed.")
    return None


if __name__ == "__main__":
    try:
        call = json.load(sys.stdin)
    except Exception:
        sys.exit(0)
    d = decide(call)
    if d:
        sys.stdout.write(json.dumps(d))
