#!/usr/bin/env node
// Play a timed schedule against an Isofigure figure.html in headless Chromium and record it to webm.
// Usage: node scripts/isofigure_capture_video.mjs <figure.html> <schedule.json> <out.webm> <timing.json>
// schedule.json: { "duration": seconds, "actions": [ { "at": seconds, "key": "s" } | { "at": seconds, "click": "power" } ] }
// `click` names a control id: the part wrapped in <Press id> is clicked at its centre. The recording starts when the page
// has loaded; timing.json gets { lead } (seconds of recording before the schedule's time zero) so the caller can trim it.
// Needs Playwright (`npm i -g @playwright/test`).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [html, schedulePath, outWebm, timingPath] = process.argv.slice(2);
if (!html || !schedulePath || !outWebm || !timingPath) {
  console.error("usage: isofigure_capture_video.mjs <figure.html> <schedule.json> <out.webm> <timing.json>");
  process.exit(2);
}

function loadPlaywright() {
  const roots = [REPO_ROOT + path.sep];
  try { roots.push(execSync("npm root -g", { encoding: "utf8" }).trim() + path.sep); } catch { /* no npm */ }
  for (const r of roots) {
    try { return createRequire(r)("@playwright/test"); } catch { /* try next */ }
  }
  throw new Error("Playwright not found. Install it with: npm i -g @playwright/test");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const { chromium } = loadPlaywright();
const schedule = JSON.parse(fs.readFileSync(schedulePath, "utf8"));
const tmp = path.join(path.dirname(outWebm), ".capture");
fs.rmSync(tmp, { recursive: true, force: true });
fs.mkdirSync(tmp, { recursive: true });

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: { dir: tmp, size: { width: 1280, height: 720 } },
  colorScheme: "light",
  reducedMotion: "no-preference",
});
const t0 = Date.now(); // the recording starts when the page is created
const page = await ctx.newPage();
await page.goto(pathToFileURL(path.resolve(html)).href);
// Frame the card for video: hide the buttons and the caption paragraph under it, centre it on the page.
await page.addStyleTag({ content: ".bar,p{display:none!important} *:focus,*:focus-visible{outline:none!important} body{padding:6px 16px;min-height:100vh;display:grid;align-items:center}" });
await page.waitForSelector("[data-press]");
// Shrink the card to fit the frame with a margin (CSS zoom keeps the layout crisp).
await page.evaluate(() => {
  const h = document.querySelector("figure").getBoundingClientRect().height;
  document.body.style.zoom = String(Math.min(1, 684 / h));
});
await sleep(400);
const start = Date.now();
fs.writeFileSync(timingPath, JSON.stringify({ lead: (start - t0) / 1000 }));

for (const a of [...schedule.actions].sort((x, y) => x.at - y.at)) {
  const wait = a.at * 1000 - (Date.now() - start);
  if (wait > 0) await sleep(wait);
  if (a.key) await page.keyboard.press(a.key);
  else if (a.click) {
    // Dispatch the events on the part itself: a geometric click can land on a part drawn in front of it.
    await page.locator(`[data-press="${a.click}"]`).first().evaluate(async (el) => {
      const init = { bubbles: true, pointerType: "mouse", button: 0 };
      el.dispatchEvent(new PointerEvent("pointerdown", init));
      await new Promise((r) => setTimeout(r, 120));
      window.dispatchEvent(new PointerEvent("pointerup", init));
      el.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
    });
  }
}
const rest = schedule.duration * 1000 - (Date.now() - start);
if (rest > 0) await sleep(rest);

const video = page.video();
await ctx.close();
await browser.close();
fs.copyFileSync(await video.path(), outWebm);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Recorded ${outWebm}`);
