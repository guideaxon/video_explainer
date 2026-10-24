// Bundle projects/<project>/main.tsx (+ the isofigure kit and React) into ONE self-contained HTML file:
// projects/<project>/figure.html. No assets, no network. Usage: node scripts/isofigure_build_html.mjs <project>
import { build } from "../remotion/node_modules/esbuild/lib/main.js";
import { existsSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = process.argv[2];
if (!project) { console.error("usage: node scripts/isofigure_build_html.mjs <project>"); process.exit(2); }
if (!/^[A-Za-z0-9_-]{1,64}$/.test(project)) { console.error(`invalid project id: ${project}`); process.exit(2); }
const dir = resolve(root, "projects", project);
if (!existsSync(resolve(dir, "main.tsx"))) {
  console.error(`projects/${project}/main.tsx not found. Run: python scripts/isofigure_new_figure.py ${project}`);
  process.exit(1);
}
const r = await build({
  entryPoints: [resolve(dir, "main.tsx")], bundle: true, minify: true, write: false, format: "iife", jsx: "automatic",
  alias: { "@isofigure": resolve(root, "remotion/src/components/isofigure") },
  nodePaths: [resolve(root, "remotion/node_modules")],
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});
const js = r.outputFiles[0].text.replace(/<\/script/g, "<\/script");
const out = resolve(dir, "figure.html");
writeFileSync(out, `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Isometric figure</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script>${js}</script></body></html>`);
console.log(`wrote ${out} (${(js.length / 1024).toFixed(0)} KB)`);
