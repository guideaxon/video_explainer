// Browser click-through of the pipeline UI against a running server (python -m ui.server).
// Run: npm run e2e -- <screenshot dir>     Needs Edge or Chrome; set BROWSER_PATH to override.
// Creates the throwaway project "e2e-click-test" under projects/ (delete it afterwards).
import puppeteer from "puppeteer-core";

const BASE = "http://127.0.0.1:8765";
const SHOTS = process.argv[2] || ".";
const results = [];
const check = (name, ok, extra = "") => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name} ${extra}`); };

const browser = await puppeteer.launch({
  executablePath: process.env.BROWSER_PATH || "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: "new", args: ["--no-sandbox"], defaultViewport: { width: 1280, height: 900 },
});
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
page.on("pageerror", (e) => consoleErrors.push(String(e)));
const badResponses = [];
page.on("response", (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.request().method()} ${r.url().replace(BASE, "")}`); });

const textOf = (sel) => page.$eval(sel, (el) => el.innerText).catch(() => "");
const clickText = async (selector, text) => {
  const handles = await page.$$(selector);
  for (const h of handles) {
    const t = await h.evaluate((el) => el.innerText);
    if (t.includes(text)) { await h.click(); return true; }
  }
  return false;
};
const waitText = (text, timeout = 20000) =>
  page.waitForFunction((t) => document.body.innerText.includes(t), { timeout }, text).then(() => true).catch(() => false);
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });

// ----- Home -> create
await page.goto(`${BASE}/#/`, { waitUntil: "networkidle0" });
check("home loads with env chips", (await page.$$(".chip.ok")).length >= 5);
const submitBtn = await page.$("button.btn.primary");
check("create disabled with empty prompt", await submitBtn.evaluate((b) => b.disabled));
await page.type("#prompt", "A teacher explaining Physics to kids");
check("create enabled after typing", !(await submitBtn.evaluate((b) => b.disabled)));
check("channel card selectable", await clickText("button.channel", "Promo"));
check("promo card selected", (await page.$$eval("button.channel.selected", (e) => e.map((x) => x.innerText))).join().includes("Promo"));
await page.$eval("input[placeholder='Optional']", (el) => (el.value = ""));
await page.type("input[placeholder='Optional']", "E2E click test");
await page.select("select", "mock");
await clickText("button.linkish", "write or upload");
check("doc box opens", !!(await page.$(".docbox textarea")));
await page.type(".docbox textarea", "# Physics for kids\n\nA teacher explaining Physics to kids.\n\n<img src=\"data:,\" onerror=\"window.__xss=1\">");
check("markdown preview renders heading", (await textOf(".md h1")) === "Physics for kids");
await new Promise((r) => setTimeout(r, 300));
check("preview is sanitized (no script runs)", !(await page.evaluate(() => window.__xss)));
await shot("1-home-filled");
await submitBtn.click();
check("navigates to project page", await waitText("E2E click test") && page.url().includes("#/p/e2e-click-test"));
await page.waitForSelector(".rail", { timeout: 10000 });

// ----- Project page
const railText = await textOf(".rail");
check("rail shows 8 steps + source (no treatment)", /Source document/.test(railText) && /8\. Verify/.test(railText) && !/Treatment/.test(railText));
check("script step is skipped/disabled for channel", await page.$$eval(".rail-item", (els) => els.some((e) => /Script/.test(e.innerText) && e.disabled)));
check("header shows PROMO + mock voice", /promo/i.test(await textOf(".proj-head")) && /voice mock/.test(await textOf(".proj-head")));

// Source editor: edit, save
await clickText(".rail-item", "Source document");
await page.waitForSelector("textarea.source");
await page.waitForFunction(() => document.querySelector("textarea.source")?.value.length > 0, { timeout: 5000 }).catch(() => {});
const original = await page.$eval("textarea.source", (e) => e.value);
check("source prefilled from prompt", original.includes("teacher explaining Physics"));
const saveBtn = (await page.$$(".panel .actions .btn.primary"))[0];
check("save disabled when unchanged", await saveBtn.evaluate((b) => b.disabled));
await page.click("textarea.source");
await page.keyboard.press("End");
await page.keyboard.type(" Focus on Newton's laws.");
check("unsaved changes hint", await waitText("Unsaved changes", 3000));
await saveBtn.click();
await page.waitForFunction(() => !document.body.innerText.includes("Unsaved changes"), { timeout: 5000 }).catch(() => {});
const srcApi = await (await fetch(`${BASE}/api/projects/e2e-click-test/source`)).json();
check("source saved to disk", srcApi.text.includes("Newton's laws"));

// Scenes step: scaffold (no LLM), watch live log
await clickText(".rail-item", "Scenes");
await page.waitForSelector("#step-title");
check("scenes panel shows Run", (await textOf(".panel .actions")).includes("Run"));
page.once("dialog", (d) => d.accept());
await clickText(".panel .actions .btn", "Run");
check("scenes job log appears", await waitText("Running…", 8000) || await waitText("succeeded", 8000));
check("scenes job succeeds", await waitText("succeeded (exit 0)", 30000));
await page.waitForFunction(() => /scenes/i.test(document.querySelector(".rail")?.innerText ?? "") && /needs review/.test(document.querySelector(".rail-item.active")?.innerText ?? ""), { timeout: 10000 }).catch(() => {});
check("scenes becomes needs review", /needs review/.test(await page.$eval(".rail-item.active", (e) => e.innerText)));
check("scaffold output appears in log", /Narration|scenes|Created|wrote|Scaffold/i.test(await textOf(".joblog-body")));
await shot("2-scenes-done");
{ const t = await textOf(".panel .actions"); check("scaffold is one-time: no Run, Approve offered", !t.includes("Run") && !t.includes("Re-run") && t.includes("Approve")); }

// Approve scenes
await clickText(".panel .actions .btn", "Approve and continue");
await page.waitForFunction(() => /approved/.test(document.querySelector(".rail-item.active")?.innerText ?? ""), { timeout: 8000 }).catch(() => {});
check("scenes approve works", /approved/.test(await page.$eval(".rail-item.active", (e) => e.innerText)));

// Narration: JSON editor
await clickText(".rail-item", "Narration");
await page.waitForSelector(".doc .linkish");
await page.click(".doc .linkish");
await page.waitForSelector("textarea.mono");
const narr = await page.$eval("textarea.mono", (e) => e.value);
check("narration JSON loaded", narr.includes("scene_id") || narr.includes("narration"));
await page.$eval("textarea.mono", (e) => { e.value = "{ not json"; e.dispatchEvent(new Event("input", { bubbles: true })); });
await page.focus("textarea.mono");
await page.keyboard.press("End"); await page.keyboard.type(" ");
await clickText(".doc .btn", "Save changes");
check("invalid JSON rejected with message", await waitText("Not valid JSON", 4000));
await shot("3-narration-invalid");

// Review: expected to FAIL (SAMPLE text) and show colored errors
await clickText(".rail-item", "Review");
await page.waitForSelector("#step-title");
await clickText(".panel .actions .btn", "Run");
check("review job finishes failed", await waitText("failed (exit 1)", 30000));
check("errors are styled red", (await page.$$(".ln.err")).length > 0);
await page.click(".joblog-head .problems input");
check("problems-only filter hides non-problem lines", (await page.$$eval(".joblog-body .ln", (e) => e.every((x) => /err|warn/.test(x.className)))));
check("failed banner shown", await waitText("The last run failed"));
check("rail marks review failed", /failed/.test(await page.$$eval(".rail-item", (els) => els.find((e) => /Review/.test(e.innerText))?.innerText ?? "")));
await shot("4-review-failed");

// Voiceover with mock provider: confirm dialog then run
await clickText(".rail-item", "Voiceover");
await page.waitForSelector("#step-title");
let dialogMsg = "";
page.once("dialog", async (d) => { dialogMsg = d.message(); await d.dismiss(); });
await clickText(".panel .actions .btn", "Run");
await new Promise((r) => setTimeout(r, 500));
check("costly step asks for confirmation (dismiss = no job)", dialogMsg.includes("TTS") && !(await page.$(".joblog")));
check("voice picker defaults to project provider (mock)", (await page.$eval(".panel select", (e) => e.value)) === "mock");

// Settings: validation and save
await clickText(".rail-item", "Settings");
await page.waitForSelector(".settings");
const saveSettings = (await page.$$(".panel .actions .btn.primary"))[0];
check("settings save disabled when unchanged", await saveSettings.evaluate((b) => b.disabled));
await page.$eval(".settings input[type=number]", (e) => e.select());
await page.type(".settings input[type=number]", "75");
const hex = await page.$$(".settings .colorrow input:not([type=color])");
const replaceText = async (handle, text) => {
  await handle.focus();
  await page.keyboard.down("Control"); await page.keyboard.press("KeyA"); await page.keyboard.up("Control");
  await page.keyboard.type(text);
};
await replaceText(hex[0], "nope");
check("bad color flagged and save blocked", (await waitText("Use a hex color", 2000)) && (await saveSettings.evaluate((b) => b.disabled)));
await replaceText(hex[0], "#2e6ff0");
await saveSettings.click();
await waitText("Saved", 5000);
const cfg = await (await fetch(`${BASE}/api/projects/e2e-click-test`)).json();
check("settings persisted", cfg.target_seconds === 75 && cfg.style.primary_color === "#2e6ff0" && cfg.tts_provider === "mock",
  JSON.stringify({ t: cfg.target_seconds, c: cfg.style.primary_color, v: cfg.tts_provider }));
await shot("5-settings");

// Left menu: File, Open Recent (recent projects + All), Preferences, collapse
const side = async () => textOf(".sidebar");
await page.goto(`${BASE}/#/new`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 600));
check("sidebar shows File, Open Recent, Preferences", /File/.test(await side()) && /Open Recent/.test(await side()) && /Preferences/.test(await side()));
check("File group lists Create New Project", (await side()).includes("Create New Project"));
const recentLinks = await page.$$eval("[aria-label='Open Recent'] a", (a) => a.map((x) => x.innerText));
check("recent list has the project and ends with All", recentLinks.includes("E2E click test") && recentLinks[recentLinks.length - 1] === "All", recentLinks.join(","));
await clickText("button.side-item", "Open Recent");
check("Open Recent collapses on click", (await page.$$("[aria-label='Open Recent']")).length === 0);
await clickText("button.side-item", "Open Recent");
await page.click("[aria-label='Open Recent'] a[href='#/projects']");
check("All opens the Continue a project screen", await waitText("Continue a project", 4000) && page.url().endsWith("#/projects"));
await page.waitForSelector(".projects", { timeout: 5000 }).catch(() => {});
check("Continue screen lists the project", (await textOf(".projects")).includes("E2E click test"));
await page.type("input.search", "zzzz-no-match");
check("filter hides non-matching projects", await waitText("No project matches", 2000));
await shot("6-all-projects");
await page.click("[aria-label='Open Recent'] a[href='#/p/e2e-click-test']");
check("clicking a recent project opens it", await waitText("E2E click test", 4000) && page.url().endsWith("#/p/e2e-click-test"));
check("current project is highlighted in the menu", (await page.$$eval(".side-child.active", (a) => a.map((x) => x.innerText))).includes("E2E click test"));
await page.click("button.side-toggle");
check("sidebar collapses to icons", (await page.$eval(".sidebar", (e) => e.classList.contains("collapsed"))) && !(await side()).includes("Preferences"));
await page.reload({ waitUntil: "networkidle0" });
check("collapsed state survives reload", await page.$eval(".sidebar", (e) => e.classList.contains("collapsed")));
await page.waitForFunction(() => document.querySelectorAll(".joblog-body .ln:not(.muted)").length > 0, { timeout: 5000 }).catch(() => {});
check("a finished job's log is replayed in full after reload", (await page.$$(".joblog-body .ln.err")).length > 0 && (await textOf(".joblog-head")).includes("failed"));
await shot("7-sidebar-collapsed");
await page.click("button.side-toggle");
await page.click("a.side-item[href='#/preferences']");
await waitText("Preferences", 3000);
await page.select(".card.settings select", "dark");
check("theme preference applies at once", (await page.$eval("html", (e) => e.getAttribute("data-theme"))) === "dark");
await shot("8-preferences-dark");
await page.reload({ waitUntil: "networkidle0" });
check("theme preference survives reload", (await page.$eval("html", (e) => e.getAttribute("data-theme"))) === "dark");
const lenInput = await page.$(".card.settings input[type=number]");
await replaceText(lenInput, "");
await page.keyboard.press("Backspace"); // replaceText only selects when given no text
check("default length can be cleared while typing", (await lenInput.evaluate((e) => e.value)) === "");
await page.keyboard.type("45");
await page.$eval(".card.settings input[type=number]", (e) => e.blur());
await new Promise((r) => setTimeout(r, 200));
check("default length commits on blur", JSON.parse(await page.evaluate(() => localStorage.getItem("video-studio-prefs"))).defaultSeconds === 45);
await page.select(".card.settings select", "light");
await page.$$eval(".card.settings select", (s) => s.length);
const selects = await page.$$(".card.settings select");
await selects[2].select("promo"); // default channel
await page.click("a.side-child[href='#/new']").catch(async () => { await clickText("button.side-item", "File"); await page.click("a.side-child[href='#/new']"); });
await page.waitForSelector(".channel");
check("default channel from Preferences preselects Promo", (await page.$$eval("button.channel.selected", (e) => e.map((x) => x.innerText))).join().includes("Promo"));
await page.goto(`${BASE}/#/preferences`, { waitUntil: "networkidle0" });
await clickText("button", "Reset to defaults");
check("reset restores system theme", (await page.$eval("html", (e) => e.getAttribute("data-theme"))) === null);

// Deep-link reload keeps state
await page.goto(`${BASE}/#/p/e2e-click-test`, { waitUntil: "networkidle0" });
await page.reload({ waitUntil: "networkidle0" });
await page.waitForSelector(".rail");
check("reload on project route restores page", (await textOf(".proj-head")).includes("E2E click test"));

check("no console or page errors", consoleErrors.length === 0, `${consoleErrors.join(" | ").slice(0, 200)} :: ${[...new Set(badResponses)].join(", ")}`);
await browser.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
