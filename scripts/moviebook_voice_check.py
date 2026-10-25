"""Voice anchoring and dialogue check for a MovieBook video: pitch of each speaker against its anchor, Whisper against the script.

Usage:
    python scripts/moviebook_voice_check.py anchor <project> <character> <audio-file>
    python scripts/moviebook_voice_check.py check  <project> [--only dawn,arrival] [--model small] [--skip-asr]
        [--max-cer 0.08] [--allow-no-anchor]

``anchor`` measures the median fundamental frequency (F0) of a reference recording of the character's voice, stores it
as ``cast.<character>.voice.anchor_hz`` in ``moviebook/plan.json`` and keeps a 16 kHz copy in ``moviebook/anchors/``.
Make the reference from the first clip you accept for that character (or any recording of the voice you want).

``check`` reads every clip in ``moviebook/clips/``, extracts its audio, and for each shot with a speaker:
  - pitch: median F0 against the speaker's anchor. Deviation above ``voice.tolerance`` (default 0.12) fails the shot.
    A female voice with F0 under 150 Hz or a male voice over 190 Hz is flagged as a likely wrong-voice clip.
  - dialogue: Whisper (faster-whisper or openai-whisper, language from ``plan.language``) against the scripted line,
    character error rate after dropping case, spaces and punctuation. Above ``--max-cer`` fails the shot.
Writes ``moviebook/qc_voice.json`` (the finalize script refuses to run without a passing one) and prints the shots to
re-roll (``moviebook_clips_comfy.mjs --only <id> --force``, with a new ``clip_seed`` in the plan). Pitch is a proxy for
voice identity, not a speaker-ID model: it catches the male/female swap and big timbre jumps, not a subtle change of
speaker. Deviations like 16 to 19 percent are real findings and are reported as failures, not hidden.
"""

from __future__ import annotations

import argparse
import array
import json
import os
import re
import shutil
import statistics
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from moviebook_build_scenes import shot_id  # noqa: E402

RATE = 16000
FEMALE_MAX_LOW = 150.0  # a "female" voice measured below this is suspicious
MALE_MIN_HIGH = 190.0   # a "male" voice measured above this is suspicious


def extract_wav(src: Path, dst: Path) -> None:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-ac", "1", "-ar", str(RATE), str(dst)], check=True)


def read_samples(wav: Path) -> list[float]:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(wav), "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"],
                         capture_output=True, check=True).stdout
    a = array.array("h")
    a.frombytes(raw[: len(raw) // 2 * 2])
    return [s / 32768.0 for s in a]


def median_f0(samples: list[float], rate: int = RATE, fmin: float = 60.0, fmax: float = 400.0) -> float | None:
    """Median F0 over voiced frames (autocorrelation, 40 ms windows every 10 ms). None when nothing is voiced."""
    import numpy as np

    x = np.asarray(samples, dtype=np.float64)
    win, hop = int(0.04 * rate), int(0.01 * rate)
    if len(x) < win:
        return None
    lo, hi = int(rate / fmax), int(rate / fmin)
    energy = [float(np.sqrt(np.mean(x[i:i + win] ** 2))) for i in range(0, len(x) - win + 1, hop)]
    gate = max(0.02 * max(energy), 0.01) if energy else 1.0
    f0s = []
    for n, i in enumerate(range(0, len(x) - win + 1, hop)):
        if energy[n] < gate:
            continue
        frame = x[i:i + win] - np.mean(x[i:i + win])
        ac = np.correlate(frame, frame, mode="full")[win - 1:]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        seg = ac[lo:min(hi, len(ac) - 1)]
        if len(seg) == 0:
            continue
        k = int(np.argmax(seg))
        if seg[k] < 0.4:  # weakly periodic: unvoiced or noise
            continue
        f0s.append(rate / (lo + k))
    if len(f0s) < 5:
        return None
    return float(statistics.median(f0s))


def normalize_text(text: str) -> str:
    return re.sub(r"[\W_]+", "", text.casefold())


def edit_distance(a: str, b: str) -> int:
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def cer(reference: str, heard: str) -> float:
    ref, hyp = normalize_text(reference), normalize_text(heard)
    if not ref:
        return 0.0 if not hyp else 1.0
    return edit_distance(ref, hyp) / len(ref)


def pitch_issue(f0: float | None, anchor: float | None, tolerance: float, gender: str | None) -> tuple[float | None, list[str]]:
    """Return (relative deviation from the anchor, issues)."""
    issues: list[str] = []
    if f0 is None:
        return None, ["no voiced speech found in the clip"]
    if gender == "female" and f0 < FEMALE_MAX_LOW:
        issues.append(f"F0 {f0:.1f} Hz is low for a female voice (under {FEMALE_MAX_LOW:.0f})")
    if gender == "male" and f0 > MALE_MIN_HIGH:
        issues.append(f"F0 {f0:.1f} Hz is high for a male voice (over {MALE_MIN_HIGH:.0f})")
    if anchor is None:
        return None, issues
    dev = abs(f0 - anchor) / anchor
    if dev > tolerance:
        issues.append(f"F0 {f0:.1f} Hz is {dev * 100:.0f}% from the anchor {anchor:.1f} Hz (tolerance {tolerance * 100:.0f}%)")
    return dev, issues


def transcribe(wav: Path, model_name: str, language: str) -> str:
    try:
        from faster_whisper import WhisperModel

        model = WhisperModel(model_name, device="auto")
        segments, _ = model.transcribe(str(wav), language=language)
        return "".join(s.text for s in segments).strip()
    except ImportError:
        pass
    try:
        import whisper
    except ImportError:
        raise SystemExit("No Whisper backend installed: pip install faster-whisper (or openai-whisper), or pass --skip-asr")
    return whisper.load_model(model_name).transcribe(str(wav), language=language)["text"].strip()


def cmd_anchor(args) -> int:
    plan_path = Path(args.projects_dir) / args.project / "moviebook" / "plan.json"
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    if args.character not in plan["cast"]:
        print(f"{args.character!r} is not in cast: {sorted(plan['cast'])}", file=sys.stderr)
        return 1
    if shutil.which("ffmpeg") is None:
        print("ffmpeg is not on PATH", file=sys.stderr)
        return 1
    anchors = plan_path.parent / "anchors"
    anchors.mkdir(exist_ok=True)
    wav = anchors / f"{args.character}.wav"
    extract_wav(Path(args.audio), wav)
    f0 = median_f0(read_samples(wav))
    if f0 is None:
        print("No voiced speech found in the reference; use a clearer recording", file=sys.stderr)
        return 1
    plan["cast"][args.character]["voice"]["anchor_hz"] = round(f0, 1)
    plan["cast"][args.character]["voice"]["anchor_wav"] = f"anchors/{args.character}.wav"
    before = plan_path.stat()
    plan_path.write_text(json.dumps(plan, indent=2, ensure_ascii=False), encoding="utf-8")
    # An anchor is a measurement, not a story edit: keep the plan's modification time so the web UI does not mark the
    # keyframes and clips stale (they do not depend on it).
    os.utime(plan_path, ns=(before.st_atime_ns, before.st_mtime_ns))
    print(f"{args.character}: anchor {f0:.1f} Hz saved to plan.json (copy in moviebook/anchors/{args.character}.wav)")
    return 0


def cmd_check(args) -> int:
    mb = Path(args.projects_dir) / args.project / "moviebook"
    plan = json.loads((mb / "plan.json").read_text(encoding="utf-8"))
    if shutil.which("ffmpeg") is None:
        print("ffmpeg is not on PATH", file=sys.stderr)
        return 1
    only = set(args.only.split(",")) if args.only else None
    language = plan.get("language", "en")
    language = language.split("-")[0]
    results: dict[str, dict] = {}
    per_speaker: dict[str, list[float]] = {}
    with tempfile.TemporaryDirectory() as tmp:
        for shot in plan["shots"]:
            sid = shot_id(shot)
            if only and sid not in only:
                continue
            clip = mb / "clips" / f"{sid}.mp4"
            entry: dict = {"speaker": shot.get("speaker"), "issues": []}
            results[sid] = entry
            if not clip.exists():
                entry["issues"].append("clip is missing")
                continue
            wav = Path(tmp) / f"{sid}.wav"
            try:
                extract_wav(clip, wav)
            except subprocess.CalledProcessError:
                entry["issues"].append("the clip has no audio stream")
                continue
            if not shot.get("speaker"):
                continue
            cast = plan["cast"][shot["speaker"]]
            voice = cast["voice"]
            f0 = median_f0(read_samples(wav))
            anchor = voice.get("anchor_hz")
            if anchor is None and not args.allow_no_anchor:
                entry["issues"].append(f"{shot['speaker']} has no voice anchor (run: moviebook_voice_check.py anchor)")
            dev, issues = pitch_issue(f0, anchor, voice.get("tolerance", 0.12), cast.get("gender"))
            entry.update({"f0_hz": None if f0 is None else round(f0, 1), "anchor_hz": anchor, "deviation": None if dev is None else round(dev, 3)})
            entry["issues"] += issues
            if f0 is not None:
                per_speaker.setdefault(shot["speaker"], []).append(f0)
            if not args.skip_asr:
                heard = transcribe(wav, args.model, language)
                c = cer(shot["line"], heard)
                entry.update({"heard": heard, "cer": round(c, 3)})
                if c > args.max_cer:
                    entry["issues"].append(f"Whisper heard {heard!r}, script says {shot['line']!r} (CER {c:.2f}, max {args.max_cer})")
    failed = {sid: e for sid, e in results.items() if e["issues"]}
    out = {"passed": not failed and bool(results), "asr_checked": not args.skip_asr, "shots": results,
           "speaker_f0_hz": {k: {"median": round(statistics.median(v), 1), "min": round(min(v), 1), "max": round(max(v), 1)} for k, v in per_speaker.items()}}
    (mb / "qc_voice.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    for sid, e in results.items():
        status = "FAIL" if e["issues"] else "ok"
        extra = f"  F0 {e.get('f0_hz')} Hz" + (f" ({e['deviation'] * 100:.0f}% off anchor)" if e.get("deviation") is not None else "") + (f"  CER {e['cer']}" if "cer" in e else "")
        print(f"{sid}: {status}{extra if e.get('speaker') else ''}")
        for issue in e["issues"]:
            print(f"    - {issue}")
    if failed:
        print(f"\n{len(failed)} shot(s) to re-roll: " + ", ".join(failed) + "\n(new clip_seed in plan.json, then moviebook_clip_jobs.py and moviebook_clips_comfy.mjs --only <id> --force)")
        return 1
    print("\nVoice check passed" + (" (dialogue NOT checked: --skip-asr)" if args.skip_asr else ""))
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("anchor")
    a.add_argument("project")
    a.add_argument("character")
    a.add_argument("audio")
    c = sub.add_parser("check")
    c.add_argument("project")
    c.add_argument("--only")
    c.add_argument("--model", default="small")
    c.add_argument("--skip-asr", action="store_true")
    c.add_argument("--max-cer", type=float, default=0.08)
    c.add_argument("--allow-no-anchor", action="store_true")
    args = ap.parse_args(argv)
    return cmd_anchor(args) if args.cmd == "anchor" else cmd_check(args)


if __name__ == "__main__":
    sys.exit(main())
