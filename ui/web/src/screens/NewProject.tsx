import { useState } from "react";
import { api, ApiError } from "../api";
import EnvStrip from "../components/EnvStrip";
import MarkdownPreview from "../components/MarkdownPreview";
import { go } from "../nav";
import { loadPrefs } from "../prefs";

export const CHANNELS: { id: string; name: string; blurb: string; format: string }[] = [
  { id: "", name: "Standard", blurb: "Explainer from a document: script, narration, generated scenes", format: "16:9" },
  { id: "markets", name: "Markets", blurb: "Market-story explainers with charts and sentiment", format: "Portrait" },
  { id: "promo", name: "Promo", blurb: "SaaS product-launch promos, kinetic headlines", format: "Portrait" },
  { id: "launch", name: "Launch", blurb: "Playful consumer-app launch teasers", format: "Portrait" },
  { id: "lyric", name: "Lyric", blurb: "Kawaii pixel-pop lyric and music videos", format: "Portrait" },
  { id: "leaderbot", name: "Leaderbot", blurb: "Pixel-mosaic business explainers and satire", format: "Portrait" },
  { id: "demo", name: "Demo", blurb: "Narrated product demos from real screenshots", format: "16:9 or portrait" },
];

function titleFrom(text: string): string {
  const words = text.trim().replace(/\s+/g, " ").split(" ").slice(0, 6).join(" ");
  return words.length > 60 ? words.slice(0, 60) : words;
}

function CreateForm() {
  const [prefs] = useState(loadPrefs); // Preferences seed the starting channel, length and voice (read once)
  const [prompt, setPrompt] = useState("");
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState(prefs.defaultChannel);
  const [seconds, setSeconds] = useState(prefs.defaultSeconds);
  const [tts, setTts] = useState(prefs.defaultVoice);
  const [docOpen, setDocOpen] = useState(false);
  const [doc, setDoc] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const hasInput = prompt.trim() !== "" || doc.trim() !== "";

  async function readFile(file: File | undefined) {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      setError("Only .md and .txt files can be uploaded here. PDF and URL import are not in this version.");
      return;
    }
    setError("");
    setDoc(await file.text());
    setDocOpen(true);
    if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = title.trim() || titleFrom(prompt || doc);
    if (!name) { setError("Describe your video or write a document first."); return; }
    setBusy(true);
    setError("");
    try {
      const p = await api.create({ title: name, channel, prompt, source_text: doc, target_seconds: seconds, tts_provider: tts });
      go(`/p/${p.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
      setBusy(false);
    }
  }

  return (
    <form className="card create" onSubmit={submit}>
      <label className="field-label" htmlFor="prompt">What video do you want to make?</label>
      <textarea
        id="prompt" className="prompt" rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your video, e.g. a teacher explaining Physics to kids"
      />

      <div className="field-label">Channel</div>
      <div className="channels" role="radiogroup" aria-label="Channel">
        {CHANNELS.map((c) => (
          <button
            type="button" key={c.id || "standard"} role="radio" aria-checked={channel === c.id}
            className={`channel ${channel === c.id ? "selected" : ""}`} onClick={() => setChannel(c.id)}
          >
            <strong>{c.name}</strong>
            <span>{c.blurb}</span>
            <em>{c.format}</em>
          </button>
        ))}
      </div>

      <div className="row">
        <label>Title <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Optional" /></label>
        <label>Length (seconds)
          <input type="number" min={10} max={1800} value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} />
        </label>
        <label>Voice
          <select value={tts} onChange={(e) => setTts(e.target.value)}>
            <option value="edge">Edge (free)</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="mock">Mock (silent test)</option>
          </select>
        </label>
      </div>

      <button type="button" className="linkish" onClick={() => setDocOpen(!docOpen)} aria-expanded={docOpen}>
        {docOpen ? "▾" : "▸"} Or write or upload a source document (Markdown)
      </button>
      {docOpen && (
        <div className="docbox">
          <div className="split">
            <textarea rows={12} value={doc} onChange={(e) => setDoc(e.target.value)} aria-label="Source document (Markdown)"
              placeholder="# Your topic&#10;&#10;Paste or write the content the video should be based on." />
            <MarkdownPreview text={doc} />
          </div>
          <label className="upload">
            Upload a .md file <input type="file" accept=".md,.markdown,.txt" onChange={(e) => readFile(e.target.files?.[0])} />
          </label>
        </div>
      )}

      {error && <div className="banner error" role="alert">{error}</div>}
      <button className="btn primary" disabled={busy || !hasInput}>{busy ? "Creating…" : "Create project"}</button>
    </form>
  );
}

/** File > Create New Project (also the landing page). */
export default function NewProject() {
  return (
    <div className="page">
      <h1>Create a video</h1>
      <EnvStrip />
      <CreateForm />
    </div>
  );
}
