// Bake a three-core project's simulations into projects/<project>/scenes/sim.json (docs/scene3d_design.md sections 4, 9).
//   node scripts/three_core_bake_sim.mjs <project> [--seconds blow=6.2,drift=7] [--fps 30] [--projects-dir <dir>]
// Reads SIMS from projects/<project>/scenes/sim.spec.ts, bakes every scene twice in this process and compares the
// outputs (bake stability), runs the simulation checks, and FAILS CLOSED: on any error it prints
// "BAKE FAILED: <check> ..." lines, exits 1 and writes nothing. Warnings are printed and kept in sim.json.
import { build } from "../remotion/node_modules/esbuild/lib/main.js";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [project, ...rest] = process.argv.slice(2);
const opt = (k, d) => { const i = rest.indexOf(`--${k}`); return i >= 0 ? rest[i + 1] : d; };
if (!project || !/^[A-Za-z0-9_-]{1,64}$/.test(project)) { console.error("usage: node scripts/three_core_bake_sim.mjs <project> [--seconds id=s,...] [--fps 30]"); process.exit(2); }
const dir = resolve(opt("projects-dir", resolve(root, "projects")), project);
const specFile = resolve(dir, "scenes", "sim.spec.ts");
if (!existsSync(specFile)) { console.error(`${specFile} not found`); process.exit(1); }
const config = JSON.parse(readFileSync(resolve(dir, "config.json"), "utf-8"));
const fps = Number(opt("fps", config.video?.fps ?? 30));
const seconds = Object.fromEntries((opt("seconds", "") || "").split(",").filter(Boolean).map((kv) => { const [k, v] = kv.split("="); return [k, Number(v)]; }));

// Bundle the project's specs with the core bake for Node (the specs are TypeScript and import the core's types).
const tmp = mkdtempSync(join(tmpdir(), "bake-"));
const out = join(tmp, "bake.mjs");
const core = resolve(root, "remotion", "src", "components", "three-core").replace(/\\/g, "/");
await build({
  stdin: { contents: `export { SIMS } from ${JSON.stringify(specFile.replace(/\\/g, "/"))}; export { bakeAll, formatIssue } from "${core}/bake";`, resolveDir: dir, loader: "ts" },
  bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "warning",
  alias: { "@remotion-components": resolve(root, "remotion", "src", "components") },
});
const { SIMS, bakeAll, formatIssue } = await import(pathToFileURL(out).href);
rmSync(tmp, { recursive: true, force: true });

const unknown = Object.keys(seconds).filter((k) => !(k in SIMS));
if (unknown.length) { console.error(`BAKE FAILED: unknown scene ids in --seconds: ${unknown.join(", ")} (known: ${Object.keys(SIMS).join(", ")})`); process.exit(1); }

const a = bakeAll(SIMS, fps, seconds);
const b = bakeAll(SIMS, fps, seconds);
const ja = JSON.stringify(a.scenes), jb = JSON.stringify(b.scenes);
const hash = (s) => createHash("sha1").update(s).digest("hex");
const errors = a.issues.filter((i) => i.severity === "error");
const warns = a.issues.filter((i) => i.severity === "warn");
if (hash(ja) !== hash(jb)) errors.push({ check: "bake-stability", severity: "error", body: -1, t: 0, value: 0, limit: 0, scene: "*" });
for (const w of warns) console.warn(formatIssue(w, fps));
if (errors.length) {
  for (const e of errors) console.error(formatIssue(e, fps));
  console.error(`BAKE FAILED: ${errors.length} error(s); ${resolve(dir, "scenes", "sim.json")} was not written.`);
  process.exit(1);
}
const file = resolve(dir, "scenes", "sim.json");
writeFileSync(file, JSON.stringify({ version: 1, fps, hash: hash(ja), warnings: warns, scenes: a.scenes }));
const summary = Object.entries(a.scenes).map(([id, s]) => `${id}: ${s.frames} frames, ${s.pops.length} pops, peak droplets ${s.peakDroplets}`).join("; ");
console.log(`baked ${file} (${(readFileSync(file).length / 1024).toFixed(0)} KB) at ${fps} fps; ${summary}`);
