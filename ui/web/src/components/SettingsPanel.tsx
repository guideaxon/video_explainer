import { useState } from "react";
import { api } from "../api";
import type { Project } from "../types";

const HEX = /^#[0-9a-fA-F]{6}$/;

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const valid = value === "" || HEX.test(value);
  return (
    <label>{label}
      <span className="colorrow">
        <input type="color" value={HEX.test(value) ? value : "#000000"} onChange={(e) => onChange(e.target.value)} aria-label={`${label} picker`} />
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="#rrggbb" aria-invalid={!valid} />
      </span>
      {!valid && <em className="bad">Use a hex color like #2e6ff0</em>}
    </label>
  );
}

export default function SettingsPanel({ project, onSaved }: { project: Project; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState(project.title);
  const [seconds, setSeconds] = useState(project.target_seconds ?? 90);
  const [provider, setProvider] = useState(project.tts_provider ?? "edge");
  const [voice, setVoice] = useState(project.voice_id);
  const [style, setStyle] = useState(project.style);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const colorsOk = [style.primary_color, style.secondary_color, style.background_color].every((c) => c === "" || HEX.test(c));
  // Style fields cannot be cleared (an empty one is not sent), so an emptied field counts as unchanged.
  const styleChanged = (Object.keys(style) as (keyof typeof style)[]).some((k) => (style[k] || project.style[k]) !== project.style[k]);
  const dirty =
    title !== project.title || seconds !== project.target_seconds || provider !== project.tts_provider ||
    voice !== project.voice_id || styleChanged;

  async function save() {
    setState("saving");
    setError("");
    const body: Record<string, unknown> = { title, target_seconds: seconds, tts_provider: provider, voice_id: voice, font_family: style.font_family || undefined };
    for (const k of ["primary_color", "secondary_color", "background_color"] as const) if (style[k]) body[k] = style[k];
    try {
      await api.saveSettings(project.id, body);
      await onSaved();
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  const set = (k: keyof typeof style) => (v: string) => { setStyle({ ...style, [k]: v }); setState("idle"); };

  return (
    <section className="panel">
      <h2>Settings</h2>
      <p className="muted">Resolution and frame rate are set by the channel scaffold ({project.resolution}, {project.fps} fps).
        Changing voice or colors does not redo finished steps; re-run voiceover or render to apply them.</p>
      <div className="settings">
        <label>Title <input value={title} onChange={(e) => { setTitle(e.target.value); setState("idle"); }} /></label>
        <label>Target length (seconds)
          <input type="number" min={10} max={1800} value={seconds} onChange={(e) => { setSeconds(Number(e.target.value)); setState("idle"); }} />
        </label>
        <label>Voice provider
          <select value={provider} onChange={(e) => { setProvider(e.target.value); setState("idle"); }}>
            <option value="edge">Edge (free)</option><option value="elevenlabs">ElevenLabs</option><option value="mock">Mock (silent test)</option>
          </select>
        </label>
        <label>Voice id <input value={voice} onChange={(e) => { setVoice(e.target.value); setState("idle"); }} placeholder="Provider default" /></label>
        <ColorField label="Primary color" value={style.primary_color} onChange={set("primary_color")} />
        <ColorField label="Secondary color" value={style.secondary_color} onChange={set("secondary_color")} />
        <ColorField label="Background color" value={style.background_color} onChange={set("background_color")} />
        <label>Font family <input value={style.font_family} onChange={(e) => set("font_family")(e.target.value)} placeholder="e.g. Inter" /></label>
      </div>
      {state === "error" && <div className="banner error" role="alert">{error}</div>}
      <div className="actions">
        <button className="btn primary" onClick={save} disabled={!dirty || !colorsOk || state === "saving"}>
          {state === "saving" ? "Saving…" : "Save settings"}
        </button>
        {state === "saved" && !dirty && <span className="muted small">Saved</span>}
      </div>
    </section>
  );
}
