// Generate the MiniMax H3 clip (picture plus dialogue audio) of each MovieBook shot in a running ComfyUI, by driving
// its real UI in headless Chrome. Same method as scripts/comic_orbit_comfy.mjs (shipped FastH3 Omni template
// video_fasth3_ominiref_r2v), with the shot's keyframe as the reference picture and the dialogue caption as the prompt.
//
// Usage:
//   node scripts/moviebook_clips_comfy.mjs <project> [--only dawn,arrival] [--force] [--server http://127.0.0.1:8188]
//        [--warn-seconds 480] [--chrome-channel chrome] [--projects-dir DIR]
//   node scripts/moviebook_clips_comfy.mjs <project> --inspect     # print the template's nodes, ids and widgets, then exit
//
// Reads projects/<project>/moviebook/jobs.json (python scripts/moviebook_clip_jobs.py) and plan.json. A job writes its
// clip only on success; an existing clip is skipped unless --force. The clip length: the template default unless
// plan.h3.frames_node is {"id": <node id>, "widget": "<widget name>"} (find both with --inspect); then the job's
// `frames` is set there. Plug the laptop in: on battery the GPU is power-capped and clips take 3x longer or more.
import { createRequire } from "module";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TEMPLATE = "video_fasth3_ominiref_r2v";
const LORA_FILE = "minimax_h3_orb360_step1500.safetensors";
// Template node ids (checked on template json 0.1.119, same as the Comic bundle): selector, load image, prompt, seed.
const N = { selector: 115, image: 137, prompt: 138, seed: 129, unet: 127 };
const TYPES = { selector: "ResolutionSelector", image: "LoadImage", prompt: "PrimitiveStringMultiline", seed: "RandomNoise", unet: "UNETLoader" };
const ID_RE = /^[A-Za-z0-9_-]{1,32}$/;

function within(dir, rel, what) {
  const full = path.resolve(dir, rel);
  const root = path.resolve(dir) + path.sep;
  if (typeof rel !== "string" || !full.startsWith(root)) throw new Error(`${what} must stay inside ${dir}: ${rel}`);
  return full;
}

function parseArgs(argv) {
  const a = { _: [], server: "http://127.0.0.1:8188", warn: 480, channel: "chrome", only: null, force: false, inspect: false,
              projectsDir: path.join(REPO_ROOT, "projects") };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--server") a.server = argv[++i];
    else if (k === "--warn-seconds") a.warn = Number(argv[++i]);
    else if (k === "--chrome-channel") a.channel = argv[++i];
    else if (k === "--only") a.only = argv[++i].split(",");
    else if (k === "--force") a.force = true;
    else if (k === "--inspect") a.inspect = true;
    else if (k === "--projects-dir") a.projectsDir = path.resolve(argv[++i]);
    else a._.push(k);
  }
  return a;
}

function loadPlaywright() {
  const roots = [REPO_ROOT + path.sep];
  try { roots.push(execSync("npm root -g", { encoding: "utf8" }).trim() + path.sep); } catch { /* no npm */ }
  for (const r of roots) {
    try { return createRequire(r)("@playwright/test"); } catch { /* try next */ }
  }
  throw new Error("Playwright not found. Run `npm install` in the repo root, then `npx playwright install chromium`.");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function upload(server, file, name) {
  const form = new FormData();
  form.append("image", new Blob([fs.readFileSync(file)], { type: "image/png" }), name);
  form.append("overwrite", "true");
  const r = await fetch(`${server}/upload/image`, { method: "POST", body: form });
  if (!r.ok) throw new Error(`upload failed: HTTP ${r.status}`);
  return (await r.json()).name;
}

async function openComfy(browser, server) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.goto(server + "/", { waitUntil: "load" });
  await page.waitForFunction(() => window.app && window.app.graph, null, { timeout: 120000 });
  return page;
}

async function inspect(browser, server) {
  const page = await openComfy(browser, server);
  try {
    const nodes = await page.evaluate(async (TEMPLATE) => {
      const r = await fetch(`/templates/${TEMPLATE}.json`);
      if (!r.ok) throw new Error(`template ${TEMPLATE} not found (HTTP ${r.status})`);
      await window.app.loadGraphData(await r.json());
      return window.app.graph._nodes.map((n) => ({ id: n.id, type: n.type, title: n.title,
        widgets: (n.widgets || []).map((w) => `${w.name}=${JSON.stringify(w.value).slice(0, 60)}`) }));
    }, TEMPLATE);
    for (const n of nodes) console.log(`${String(n.id).padStart(4)}  ${n.type}  "${n.title}"  ${n.widgets.join("  ")}`);
  } finally {
    await page.close();
  }
}

async function runJob(browser, server, job, dir, project, warn, framesNode) {
  const imageFile = within(dir, job.image, `job ${job.id} image`);
  const outPath = within(dir, job.out, `job ${job.id} out`);
  if (!fs.existsSync(imageFile)) throw new Error(`keyframe ${job.image} is missing (run scripts/moviebook_keyframes_comfy.py)`);
  const imageName = await upload(server, imageFile, `moviebook_${project}_${job.id}.png`);
  const page = await openComfy(browser, server);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  try {
    const cfg = await page.evaluate(async ({ TEMPLATE, N, TYPES, LORA_FILE, job, imageName, framesNode }) => {
      const r = await fetch(`/templates/${TEMPLATE}.json`);
      if (!r.ok) throw new Error(`template ${TEMPLATE} not found (HTTP ${r.status})`);
      await window.app.loadGraphData(await r.json());
      const g = window.app.graph;
      for (const [key, id] of Object.entries(N)) {
        const node = g.getNodeById(id);
        if (!node || node.type !== TYPES[key]) {
          throw new Error(`template changed: node ${id} should be ${TYPES[key]} but is ${node ? node.type : "missing"}; update N (use --inspect)`);
        }
      }
      const sel = g.getNodeById(N.selector);
      sel.widgets.find((w) => w.name === "aspect_ratio").value = job.aspect;
      sel.widgets.find((w) => w.name === "megapixels").value = job.megapixels;
      g.getNodeById(N.image).widgets[0].value = imageName;
      g.getNodeById(N.prompt).widgets[0].value = job.caption;
      g.getNodeById(N.seed).widgets[0].value = job.seed;
      let frames = "template default";
      if (framesNode) {
        const node = g.getNodeById(framesNode.id);
        const w = node && node.widgets.find((x) => x.name === framesNode.widget);
        if (!w) throw new Error(`plan.h3.frames_node ${JSON.stringify(framesNode)} does not match a widget (use --inspect)`);
        w.value = job.frames;
        frames = job.frames;
      }
      let lora = "none";
      if (job.lora) {
        const unet = g.getNodeById(N.unet);
        const targets = (unet.outputs[0].links || []).map((id) => ({ id: g.links[id].target_id, slot: g.links[id].target_slot }));
        const node = window.LiteGraph.createNode("LoraLoaderModelOnly");
        node.pos = [unet.pos[0] + 40, unet.pos[1] + 300];
        g.add(node);
        const nameW = node.widgets.find((w) => w.name === "lora_name");
        const file = job.lora === true ? LORA_FILE : job.lora;
        if (!(nameW.options?.values || []).includes(file)) throw new Error(`LoRA ${file} not in ComfyUI models/loras`);
        nameW.value = file;
        node.widgets.find((w) => w.name === "strength_model").value = 1.0;
        unet.connect(0, node, 0);
        for (const t of targets) node.connect(0, g.getNodeById(t.id), t.slot);
        lora = `${file} -> ${targets.length} node(s)`;
      }
      return { lora, frames };
    }, { TEMPLATE, N, TYPES, LORA_FILE, job, imageName, framesNode });

    const posted = page.waitForResponse(
      (r) => r.request().method() === "POST" && /\/(api\/)?prompt$/.test(new URL(r.url()).pathname),
      { timeout: 60000 },
    );
    const t0 = Date.now();
    await page.evaluate(() => window.app.queuePrompt(0));
    const reply = await (await posted).json();
    if (!reply.prompt_id) throw new Error("ComfyUI refused the graph: " + JSON.stringify(reply).slice(0, 600));
    let entry = null;
    while (!entry) {
      await sleep(5000);
      const hist = await (await fetch(`${server}/history/${reply.prompt_id}`)).json();
      const st = hist[reply.prompt_id] && hist[reply.prompt_id].status;
      if (st && (st.completed || st.status_str === "error")) entry = hist[reply.prompt_id];
      if (Date.now() - t0 > 3 * 3600e3) throw new Error("timeout after 3 hours");
    }
    const seconds = (Date.now() - t0) / 1000;
    const err = entry.status.messages.find((m) => m[0] === "execution_error");
    if (err) throw new Error("ComfyUI execution error: " + JSON.stringify(err[1]).slice(0, 600));
    const vid = Object.values(entry.outputs).flatMap((o) => o.images || []).find((i) => /\.(mp4|webm)$/.test(i.filename));
    if (!vid) throw new Error("no video in the outputs");
    const q = new URLSearchParams({ filename: vid.filename, subfolder: vid.subfolder || "", type: vid.type || "output" });
    const res = await fetch(`${server}/view?${q}`);
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
    const m = vid.metadata || {};
    return { id: job.id, seconds: Math.round(seconds), size: `${m.width}x${m.height}`, frames: m.frame_count,
             slow: seconds > warn, cached: seconds < 20, out: job.out, lora: cfg.lora, pageErrors };
  } finally {
    await page.close();
  }
}

const args = parseArgs(process.argv.slice(2));
if (args._.length !== 1) {
  console.error("Usage: node scripts/moviebook_clips_comfy.mjs <project> [--only a,b] [--force] [--inspect] [--server URL] [--warn-seconds N]");
  process.exit(2);
}
const project = args._[0];
if (!ID_RE.test(project)) {
  console.error(`Invalid project id ${project}: use 1 to 32 letters, digits, '_' or '-'`);
  process.exit(2);
}
const dir = path.join(args.projectsDir, project, "moviebook");
const { chromium } = loadPlaywright();
try {
  await fetch(args.server + "/system_stats");
} catch {
  console.error(`ComfyUI is not reachable at ${args.server}. Start it first (localhost only, no --listen).`);
  process.exit(1);
}
let browser;
try {
  browser = await chromium.launch({ channel: args.channel, headless: true });
} catch (e) {
  console.error(`Could not start the browser (channel "${args.channel}"): ${String(e.message).split("\n")[0]}`);
  console.error("Install Chrome, or pass --chrome-channel msedge.");
  process.exit(1);
}
if (args.inspect) {
  await inspect(browser, args.server);
  await browser.close();
  process.exit(0);
}
for (const f of ["jobs.json", "plan.json"]) {
  if (!fs.existsSync(path.join(dir, f))) {
    console.error(`${path.join(dir, f)} not found. Run scripts/moviebook_new_video.py and scripts/moviebook_clip_jobs.py first.`);
    process.exit(2);
  }
}
const jobs = JSON.parse(fs.readFileSync(path.join(dir, "jobs.json"), "utf8"));
const plan = JSON.parse(fs.readFileSync(path.join(dir, "plan.json"), "utf8"));
const framesNode = (plan.h3 && plan.h3.frames_node) || null;
for (const job of jobs) {
  if (typeof job.id !== "string" || !ID_RE.test(job.id)) { console.error(`Invalid job id ${JSON.stringify(job.id)} in jobs.json`); process.exit(2); }
  try { within(dir, job.image, `job ${job.id} image`); within(dir, job.out, `job ${job.id} out`); }
  catch (e) { console.error(e.message); process.exit(2); }
}
function onBattery() {
  if (process.platform !== "win32") return false;
  try {
    const out = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance -Namespace root\\wmi -ClassName BatteryStatus -ErrorAction Stop).PowerOnline"',
      { encoding: "utf8", timeout: 15000 },
    ).trim();
    return out === "False";
  } catch { return false; }
}
if (onBattery()) console.error("WARNING: the laptop is running on battery. Clips can take 3x longer or more. Plug in the charger first (Ctrl+C to stop).");
let failed = 0;
for (const job of jobs) {
  if (args.only && !args.only.includes(job.id)) continue;
  if (fs.existsSync(within(dir, job.out, "out")) && !args.force) { console.log(`${job.id}: clip exists, skipped`); continue; }
  try {
    const r = await runJob(browser, args.server, job, dir, project, args.warn, framesNode);
    console.log(`${r.id}: ${r.seconds} s  ${r.size}  ${r.frames} frames  -> ${r.out}` +
                (r.slow ? "  SLOW: check the laptop is on AC power, then restart ComfyUI before the next job" : "") +
                (r.cached ? "  CACHED: under 20 s means ComfyUI returned an earlier result; change the seed to render again" : "") +
                (r.pageErrors.length ? `  page errors: ${r.pageErrors.join("; ")}` : ""));
  } catch (e) {
    failed++;
    console.error(`${job.id}: FAILED: ${e.message}`);
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
