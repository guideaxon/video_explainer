// Render PNG stills of a full-video project (its storyboard through the ScenePlayer composition), several runs each,
// for the three-core determinism check. Same bundle aliases as remotion/scripts/render.mjs; PNG, not JPEG, so the
// comparison measures the renderer and not the encoder.
//   node scripts/three_core_render_stills.mjs <project> <outDir> [--frames 0,45,90] [--runs 3] [--gl angle] [--scale 1]
// Called by scripts/three_core_check_determinism.py, which does the comparison.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(join(root, "remotion", "package.json"));
const { bundle } = req("@remotion/bundler");
const { renderStill, selectComposition, openBrowser } = req("@remotion/renderer");

const [project, outDir, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d; };
if (!project || !outDir) { console.error("usage: node scripts/three_core_render_stills.mjs <project> <outDir> [--frames a,b] [--runs n] [--gl angle]"); process.exit(2); }
if (!/^[A-Za-z0-9_-]{1,64}$/.test(project)) { console.error(`invalid project id: ${project}`); process.exit(2); }
const projectDir = resolve(root, "projects", project);
const storyboardPath = resolve(projectDir, "storyboard", "storyboard.json");
if (!existsSync(storyboardPath)) { console.error(`no storyboard: ${storyboardPath} (run the finalize step first)`); process.exit(1); }
const storyboard = JSON.parse(readFileSync(storyboardPath, "utf-8"));
const config = JSON.parse(readFileSync(resolve(projectDir, "config.json"), "utf-8"));
const res = config.video?.resolution ?? { width: 1920, height: 1080 };
const scale = Number(opt("scale", "1"));
const runs = Number(opt("runs", "3"));
const gl = opt("gl", "angle");
const frames = opt("frames", "0").split(",").map(Number);

mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({
  entryPoint: resolve(root, "remotion", "src", "index.ts"),
  publicDir: projectDir,
  webpackOverride: (c) => ({
    ...c,
    resolve: {
      ...c.resolve,
      alias: { ...c.resolve?.alias, "@project-scenes": resolve(projectDir, "scenes"), "@project-short-scenes": resolve(root, "remotion", "src", "shorts"), "@remotion-components": resolve(root, "remotion", "src", "components") },
      modules: [...(c.resolve?.modules || []), resolve(root, "remotion", "node_modules"), "node_modules"],
    },
  }),
});
const inputProps = { storyboard, voiceoverBasePath: "voiceover" };
const chromiumOptions = gl === "auto" ? {} : { gl }; // "auto": Remotion's default backend, what a render without --gl uses
const base = await selectComposition({ serveUrl, id: "ScenePlayer", inputProps, chromiumOptions });
const size = opt("size", null)?.split("x").map(Number); // WxH wins over --scale (used to match an existing render)
const composition = { ...base, width: size ? size[0] : Math.round(res.width * scale), height: size ? size[1] : Math.round(res.height * scale) };
for (const f of frames) if (!(f >= 0 && f < composition.durationInFrames)) { console.error(`frame ${f} outside 0..${composition.durationInFrames - 1}`); process.exit(1); }

// A fresh browser per run, so a cached shader program from the previous run cannot hide a difference.
for (let r = 0; r < runs; r++) {
  const browser = await openBrowser("chrome", { chromiumOptions });
  for (const frame of frames) {
    const output = join(outDir, `run${r}_f${String(frame).padStart(5, "0")}.png`);
    await renderStill({ composition, serveUrl, output, inputProps, frame, imageFormat: "png", chromiumOptions, puppeteerInstance: browser, overwrite: true });
    console.log(output);
  }
  await browser.close({ silent: true });
}
