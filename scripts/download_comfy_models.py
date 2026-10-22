"""Download the ComfyUI model files for docs/TryComfyUIOptions.md (option 1 and the ORB360 LoRA).

Official Hugging Face only (huggingface.co). Every file is written under COMFY_ROOT, which must be on
the D: drive, resumed from a .part file if interrupted, and checked against the repo's LFS sha256
(or the file size for small non-LFS files). Standard library only.

Usage: python scripts/download_comfy_models.py [--root D:\\ComfyUIEasyInstall\\ComfyUI] [--dry-run]
       [--revision BRANCH_OR_TAG]

Without --revision the files follow each repo's ``main`` branch, so a rerun can fetch newer content (the hash
is read from the same listing, so it detects a damaged download, not an upstream change). The same revision is
used for every repo, so only a branch or tag name that exists in all of them works for the whole list.
"""
import argparse
import hashlib
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

DEFAULT_ROOT = r"D:\ComfyUIEasyInstall\ComfyUI"
HF = "https://huggingface.co"
CHUNK = 8 * 1024 * 1024

# (repo, path in repo, destination folder under the ComfyUI root)
FILES = [
    ("FastVideo/FastH3-Omni-Comfy", "diffusion_models/fasth3_omniref_8step_pruned_int8_convrot.safetensors", "models/diffusion_models"),
    ("Comfy-Org/MiniMax-H3", "text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors", "models/text_encoders"),
    ("Comfy-Org/MiniMax-H3", "vae/minimax_h3_video_vae_int8_convrot.safetensors", "models/vae"),
    ("Comfy-Org/MiniMax-H3", "vae/minimax_h3_audio_vae_fp32.safetensors", "models/vae"),
    ("MATLOWAI/MiniMax-H3-ORB360-CardSpin", "minimax_h3_orb360_step1500.safetensors", "models/loras"),
    ("MATLOWAI/MiniMax-H3-ORB360-CardSpin", "examples/whitecat.png", "input"),
    ("MATLOWAI/MiniMax-H3-ORB360-CardSpin", "prompts/orbit_realscene_caption.txt", "input/orb360_prompts"),
    ("MATLOWAI/MiniMax-H3-ORB360-CardSpin", "prompts/orbit_3ref_caption.txt", "input/orb360_prompts"),
    ("MATLOWAI/MiniMax-H3-ORB360-CardSpin", "prompts/cardspin_caption.txt", "input/orb360_prompts"),
]


def fetch_json(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return json.load(r)


def remote_info(repo, path, revision="main"):
    """Return (size, sha256 or None) for a file from the official tree listing."""
    folder, _, name = path.rpartition("/")
    rev = urllib.parse.quote(revision, safe="")
    url = f"{HF}/api/models/{repo}/tree/{rev}/{urllib.parse.quote(folder)}" if folder else f"{HF}/api/models/{repo}/tree/{rev}"
    try:
        listing = fetch_json(url)
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"Hugging Face answered HTTP {exc.code} for {repo} at revision {revision!r}")
    for entry in listing:
        if entry.get("path") == path:
            lfs = entry.get("lfs") or {}
            return entry.get("size", 0), lfs.get("oid")
    raise SystemExit(f"not found on Hugging Face: {repo}/{path}")


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(CHUNK), b""):
            digest.update(block)
    return digest.hexdigest()


def download(url, part, total):
    have = part.stat().st_size if part.exists() else 0
    if have > total:
        part.unlink()
        have = 0
    if have == total:
        return
    request = urllib.request.Request(url, headers={"Range": f"bytes={have}-"} if have else {})
    started, last = time.time(), 0.0
    with urllib.request.urlopen(request, timeout=120) as response:
        if have and response.status != 206:
            have = 0  # server ignored the range, start over
        with open(part, "ab" if have else "wb") as out:
            done = have
            while True:
                block = response.read(CHUNK)
                if not block:
                    break
                out.write(block)
                done += len(block)
                if time.time() - last > 10:
                    rate = (done - have) / max(time.time() - started, 1e-6) / 1e6
                    print(f"    {done / 1e9:6.2f} / {total / 1e9:.2f} GB  {rate:6.1f} MB/s", flush=True)
                    last = time.time()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", default=DEFAULT_ROOT)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--revision", default="main", help="branch or tag to download (default main)")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    if root.drive.upper() != "D:":
        raise SystemExit(f"refusing to download: {root} is not on the D: drive")

    plan = []
    for repo, path, folder in FILES:
        size, oid = remote_info(repo, path, args.revision)
        target = (root / folder / Path(path).name).resolve()
        if target.drive.upper() != "D:" or root not in target.parents:
            raise SystemExit(f"refusing path outside the ComfyUI root on D:: {target}")
        plan.append((repo, path, target, size, oid))

    need = sum(size for *_, target, size, _ in plan if not target.exists())
    print(f"ComfyUI root: {root}\nRevision: {args.revision}\nTo download: {need / 1e9:.2f} GB across {len(plan)} files")
    for repo, path, target, size, _ in plan:
        state = "present" if target.exists() else "missing"
        print(f"  [{state}] {repo}/{path}  {size / 1e9:.2f} GB  ->  {target}")
    if args.dry_run:
        return

    failures = []
    for repo, path, target, size, oid in plan:
        target.parent.mkdir(parents=True, exist_ok=True)
        if target.exists() and target.stat().st_size == size and (oid is None or sha256_of(target) == oid):
            print(f"OK (already verified): {target.name}")
            continue
        print(f"Downloading {repo}/{path}", flush=True)
        part = target.with_name(target.name + ".part")
        url = f"{HF}/{repo}/resolve/{urllib.parse.quote(args.revision, safe='')}/{urllib.parse.quote(path)}"
        try:
            download(url, part, size)
        except Exception as exc:  # network errors: keep the .part file so a rerun resumes
            print(f"  FAILED: {exc!r}", flush=True)
            failures.append(target.name)
            continue
        if part.stat().st_size != size:
            print(f"  size mismatch ({part.stat().st_size} != {size}); rerun to resume")
            failures.append(target.name)
            continue
        if oid is not None:
            print("  verifying sha256 ...", flush=True)
            if sha256_of(part) != oid:
                print("  SHA256 MISMATCH, deleting the partial file")
                part.unlink()
                failures.append(target.name)
                continue
        part.replace(target)
        print(f"  OK: {target}", flush=True)

    print("DONE" if not failures else f"INCOMPLETE, rerun to resume: {failures}")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
