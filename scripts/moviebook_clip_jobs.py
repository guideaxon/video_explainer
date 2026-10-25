"""Write the H3 job list (``moviebook/jobs.json``) of a MovieBook video: one image-to-video job per shot.

Usage:
    python scripts/moviebook_clip_jobs.py <project> [--projects-dir DIR]

For each shot it builds the MiniMax H3 caption from the plan: the subject definitions (keyframe = ``<Picture 1>``, each
cast member's identity), the visual action, the spoken line with the speaker's voice description (the voice anchor in
words: the same description text is repeated in every shot of that character), and ``N/A`` music. The section layout
follows the ORB360 caption shipped with the Comic bundle; the ``dialogue`` section and the lip-sync sentence are
**unverified against a dialogue run of the template** until the first clip proves them (see the style guide, section 9).
``plan.h3.caption_template`` (a file under ``moviebook/``) replaces the built-in caption: it may use ``{visual}``,
``{speaker}``, ``{voice}``, ``{line}``, ``{subjects}``, ``{fps}`` and ``{seconds}``.
The jobs are run by ``node scripts/moviebook_clips_comfy.mjs <project>``.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from moviebook_build_scenes import shot_id, validate  # noqa: E402


def caption(plan: dict, shot: dict, template: str | None = None) -> str:
    fps = plan.get("fps", 24)
    frames = shot.get("frames", plan.get("frames", 90))
    cast_keys = shot.get("cast", [])
    subjects = [plan["cast"][k] for k in cast_keys]
    subject_lines = [f"<Subject {i}> is {c['name']}, {c['identity']}, exactly as shown in <Picture 1>." for i, c in enumerate(subjects, 1)]
    speaker = plan["cast"][shot["speaker"]] if shot.get("speaker") else None
    voice = speaker["voice"]["description"] if speaker else ""
    if template:
        return template.format(visual=shot["visual"], speaker=speaker["name"] if speaker else "", voice=voice, line=shot.get("line", ""),
                               subjects="\n".join(subject_lines), fps=fps, seconds=round(frames / fps, 2))
    lines = ["subject_definitions:", *subject_lines, "<Picture 1> is the first-frame viewpoint of [Shot 1].", "",
             "summary:", f"[reference generation] {shot['visual']}", "", "retention_analysis:"]
    for i, c in enumerate(subjects, 1):
        lines.append(f"<Subject {i}> (appears in [Shot 1]): fully_preserved - face, hair, build, clothing and accessories match <Picture 1> and do not change during the shot.")
    lines += ["<Picture 1> ([Shot 1] first frame): fully_preserved - the shot starts from this exact framing, location and light.", "",
              "detailed_description:",
              f"[Shot 1] The shot begins from <Picture 1> with its exact environment and light. {shot['visual']} "
              f"The camera is steady with at most a slow push-in. The shot is one continuous take of {round(frames / fps, 2)} seconds at {fps} fps. "
              "No cuts, no scene changes, no extra people."]
    if speaker:
        lines.append(f"{speaker['name']} speaks the line below in a {voice}, with natural lip movement that matches the words. Nobody else speaks.")
    lines += ["", "dialogue:"]
    lines.append(f'[Shot 1] {speaker["name"]} ({voice}): "{shot["line"]}"' if speaker else "N/A")
    lines += ["", "overall_soundscape:", "quiet natural room tone only", "", "non_diegetic_music:", "N/A"]
    return "\n".join(lines)


def make_jobs(plan: dict, project_dir: Path) -> list[dict]:
    h3 = plan.get("h3", {})
    template = None
    if h3.get("caption_template"):
        template = (project_dir / "moviebook" / h3["caption_template"]).read_text(encoding="utf-8")
    jobs = []
    for shot in plan["shots"]:
        sid = shot_id(shot)
        jobs.append({
            "id": sid,
            "image": f"keyframes/{sid}.png",
            "caption": caption(plan, shot, template),
            "aspect": h3.get("aspect", "16:9 (Widescreen)"),
            "megapixels": h3.get("megapixels", 0.64),
            "seed": shot.get("clip_seed", shot.get("seed", 1000)),
            "frames": shot.get("frames", plan.get("frames", 90)),
            "lora": h3.get("lora"),
            "out": f"clips/{sid}.mp4",
        })
    return jobs


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("project")
    ap.add_argument("--projects-dir", default=str(REPO_ROOT / "projects"))
    args = ap.parse_args(argv)
    project_dir = Path(args.projects_dir) / args.project
    plan_path = project_dir / "moviebook" / "plan.json"
    if not plan_path.exists():
        print(f"{plan_path} not found", file=sys.stderr)
        return 1
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    errors = validate(plan)
    if errors:
        print("Plan errors:\n  " + "\n  ".join(errors), file=sys.stderr)
        return 1
    jobs = make_jobs(plan, project_dir)
    (project_dir / "moviebook" / "jobs.json").write_text(json.dumps(jobs, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {len(jobs)} jobs to moviebook/jobs.json")
    print(f"Next: node scripts/moviebook_clips_comfy.mjs {args.project}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
