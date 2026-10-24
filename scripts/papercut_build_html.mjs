// Bundle projects/<project>/main.tsx (+ the papercut kit, React and the score) into ONE self-contained HTML file:
// projects/<project>/film.html. No assets, no network. Usage: node scripts/papercut_build_html.mjs <project> [--voice <json>]
// --voice: the voice payload ({ fps, clips }) written by papercut_build_html.py when config.json has "voice": true; it is
// inlined as <script type="application/json" id="pc-voice">, which the player reads (see the kit's voice.ts).
import { build } from "../remotion/node_modules/esbuild/lib/main.js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const project = process.argv[2];
if (!project) { console.error("usage: node scripts/papercut_build_html.mjs <project>"); process.exit(2); }
if (!/^[A-Za-z0-9_-]{1,64}$/.test(project)) { console.error(`invalid project id: ${project}`); process.exit(2); }
const dir = resolve(root, "projects", project);
if (!existsSync(resolve(dir, "main.tsx"))) {
  console.error(`projects/${project}/main.tsx not found. Run: python scripts/papercut_new_video.py ${project}`);
  process.exit(1);
}
const r = await build({
  entryPoints: [resolve(dir, "main.tsx")], bundle: true, minify: true, write: false, format: "iife", jsx: "automatic",
  alias: { "@papercut": resolve(root, "remotion/src/components/papercut") },
  nodePaths: [resolve(root, "remotion/node_modules")],
  define: { "process.env.NODE_ENV": '"production"' }, logLevel: "warning",
});
const js = r.outputFiles[0].text.replace(/<\/script/g, "<\/script");
const vi = process.argv.indexOf("--voice");
const voice = vi > 0 ? readFileSync(process.argv[vi + 1], "utf8").replace(/<\//g, "<\\/") : ""; // "<\/" is the same JSON string
if (!voice && existsSync(resolve(dir, "config.json")) && JSON.parse(readFileSync(resolve(dir, "config.json"), "utf8")).voice) {
  console.warn('config.json has "voice": true but no voice was given: build with python scripts/papercut_build_html.py to embed it');
}
const vtag = voice ? `<script type="application/json" id="pc-voice">${voice}</script>` : "";
const out = resolve(dir, "film.html");
writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><title>Paper-cut film</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;background:#05060f}</style></head><body><div id="root"></div>${vtag}<script>${js}</script></body></html>`);
console.log(`wrote ${out} (${((js.length + voice.length) / 1024).toFixed(0)} KB, music${voice ? " and voice" : ""} included)`);
