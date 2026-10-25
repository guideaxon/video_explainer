#!/usr/bin/env node
// Render the face thumbnails the web UI's style picker shows (ui/web/public/faces/<bundle>.png, 256x256).
// Each face is the real character from the bundle's kit, so a card shows the animation style it makes:
//   launch, lyric, leaderbot, lowpoly, papercut, storybook, moviebook, neon, popart, rubberhose, glossy, clay -> Remotion stills of remotion/src/faces/index.tsx
//   isofigure                                    -> Playwright screenshot of the robot template's built figure.html
// Usage: node scripts/ui_render_faces.mjs [bundle ...]   (default: all). Needs ffmpeg on PATH; the isofigure face needs
// Playwright (npm install in the repo root, then npx playwright install chromium). Re-run after a kit's look changes.
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "ui", "web", "public", "faces");
mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "faces-"));
const want = process.argv.slice(2);
const on = (id) => !want.length || want.includes(id);
// Windows needs a shell to run npx.cmd, and a shell does not quote arguments: quote any with a space (a temp or user folder may have one).
const win = process.platform === "win32";
const q = (a) => (win && /\s/.test(a) ? `"${a}"` : a);
const run = (cmd, args, cwd = root) => execFileSync(q(cmd), args.map(q), { cwd, stdio: ["ignore", "ignore", "inherit"], shell: win });
const toFace = (src, id, crop = "") => run("ffmpeg", ["-v", "error", "-y", "-i", src, "-vf", `${crop}scale=256:256:flags=lanczos`, join(out, `${id}.png`)]);

// Remotion faces (frame 40: popped in, eyes open). lowpoly renders 1280x720 and is cropped to the head.
const remotion = [["launch", ""], ["lyric", ""], ["leaderbot", ""], ["papercut", ""], ["storybook", ""], ["moviebook", ""], ["lowpoly", "crop=480:480:400:70,"],
  ["neon", ""], ["popart", ""], ["rubberhose", "crop=900:900:90:240,"], ["glossy", "crop=560:560:260:300,"], ["clay", "crop=540:540:270:330,"]].filter(([id]) => on(id));
if (remotion.length) {
  const bundle = join(tmp, "bundle");
  run("npx", ["remotion", "bundle", "src/faces/index.tsx", "--out-dir", bundle, "--log=error"], join(root, "remotion"));
  for (const [id, crop] of remotion) {
    const png = join(tmp, `${id}.png`);
    run("npx", ["remotion", "still", bundle, id, png, "--frame=40", "--gl=angle", "--log=error"], join(root, "remotion"));
    toFace(png, id, crop);
    console.log(`faces/${id}.png`);
  }
}

// Isofigure: the robot template, built to figure.html and captured at rest, head only.
if (on("isofigure")) {
  const require = createRequire(root + "/");
  const { chromium } = require("@playwright/test");
  const project = "_faces_robot";
  const pdir = join(root, "projects", project);
  const py = existsSync(join(root, ".venv", "Scripts", "python.exe")) ? join(root, ".venv", "Scripts", "python.exe") : "python";
  try {
    run(py, ["scripts/isofigure_new_figure.py", project, "--template", "robot", "--force"]);
    run(py, ["scripts/isofigure_build_html.py", project]);
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 900, height: 700 }, reducedMotion: "reduce" });
    await page.goto("file:///" + join(pdir, "figure.html").replace(/\\/g, "/"));
    await page.waitForSelector(".stage svg");
    await page.locator(".stage").focus();
    await page.keyboard.press("l"); // labels off: the face is the character, not its callouts
    await page.waitForTimeout(700);
    await page.locator(".stage svg").screenshot({ path: join(tmp, "robot.png") });
    await browser.close();
    toFace(join(tmp, "robot.png"), "isofigure", "crop=330:330:215:5,");
    console.log("faces/isofigure.png");
  } finally {
    rmSync(pdir, { recursive: true, force: true });
  }
}
rmSync(tmp, { recursive: true, force: true });
