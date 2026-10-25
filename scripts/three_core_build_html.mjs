// Build a three-core project's live page into ONE self-contained HTML file (docs/scene3d_design.md section 5):
//   node scripts/three_core_build_html.mjs <project> [--entry live/main.ts] [--out scene.html] [--title "Bubble toy"]
// three.js (official r180, MIT) and postprocessing (Zlib) are bundled in, not loaded from a CDN, so the file works
// offline. Their licence headers are kept (esbuild legalComments "inline") and checked: the build fails if either
// notice is missing from the output.
import { build } from "../remotion/node_modules/esbuild/lib/main.js";
import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [project, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d; };
if (!project || !/^[A-Za-z0-9_-]{1,64}$/.test(project)) { console.error("usage: node scripts/three_core_build_html.mjs <project> [--entry live/main.ts] [--out scene.html] [--title t]"); process.exit(2); }
const dir = resolve(root, "projects", project);
const entry = resolve(dir, opt("entry", "live/main.ts"));
if (!existsSync(entry)) { console.error(`${entry} not found. Scaffold with: python scripts/scene3d_new_video.py ${project}`); process.exit(1); }
const three = JSON.parse(readFileSync(resolve(root, "remotion", "node_modules", "three", "package.json"), "utf-8"));
if (three.version !== "0.180.0") { console.error(`three ${three.version} installed; the design pins the official 0.180.0`); process.exit(1); }

const r = await build({
  entryPoints: [entry], bundle: true, minify: true, write: false, format: "iife", target: "es2020", legalComments: "inline",
  alias: { "@remotion-components": resolve(root, "remotion", "src", "components") },
  nodePaths: [resolve(root, "remotion", "node_modules")],
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});
const js = r.outputFiles[0].text;
const NOTICES = [
  ["three.js", ["Copyright 2010-2025 Three.js Authors", "SPDX-License-Identifier: MIT"]],
  ["postprocessing", ["Copyright 2015-2025 Raoul van R", "@license Zlib"]],
];
const missing = NOTICES.filter(([, needles]) => !needles.every((n) => js.includes(n))).map(([name]) => name);
if (missing.length) { console.error(`LICENCE CHECK FAILED: notice missing for ${missing.join(", ")}; the build was not written.`); process.exit(1); }

const title = opt("title", "Scene");
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(title)}</title>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<!-- Third-party code bundled below keeps its own licence notices: three.js (MIT), postprocessing (Zlib). -->
</head><body><div id="root"></div><script>${js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
const out = resolve(dir, opt("out", "scene.html"));
writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB); licence notices kept: ${NOTICES.map(([n]) => n).join(", ")}`);
