import { useState } from "react";
import { DEFAULT_PREFS, loadPrefs, savePrefs, type Prefs, type Theme } from "../prefs";
import { CHANNELS } from "./NewProject";

/** App-wide preferences, stored in this browser only. Per-project settings live in each project. */
export default function Preferences() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [saved, setSaved] = useState(false);
  const [secondsText, setSecondsText] = useState(String(prefs.defaultSeconds));

  const update = (patch: Partial<Prefs>) => {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    savePrefs(next); // applied at once: theme changes immediately, defaults seed the next new project
    setSaved(true);
  };

  return (
    <div className="page">
      <h1>Preferences</h1>
      <p className="muted">Stored in this browser. They apply to the app and to the defaults on Create New Project; each project keeps its own settings.</p>
      <div className="card settings">
        <label>Theme
          <select value={prefs.theme} onChange={(e) => update({ theme: e.target.value as Theme })}>
            <option value="system">Follow my system</option><option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </label>
        <label>Projects shown under Open Recent
          <select value={prefs.recentCount} onChange={(e) => update({ recentCount: Number(e.target.value) })}>
            {[3, 5, 8, 10].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <label>Default channel
          <select value={prefs.defaultChannel} onChange={(e) => update({ defaultChannel: e.target.value })}>
            {CHANNELS.map((c) => <option key={c.id || "standard"} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Default length (seconds)
          {/* Edited as text and committed on blur, so the field can be cleared while typing a new number. */}
          <input type="number" min={10} max={1800} value={secondsText} onChange={(e) => setSecondsText(e.target.value)}
            onBlur={() => {
              const n = Math.min(1800, Math.max(10, Math.round(Number(secondsText)) || prefs.defaultSeconds));
              setSecondsText(String(n));
              if (n !== prefs.defaultSeconds) update({ defaultSeconds: n });
            }} />
        </label>
        <label>Default voice
          <select value={prefs.defaultVoice} onChange={(e) => update({ defaultVoice: e.target.value })}>
            <option value="edge">Edge (free)</option><option value="elevenlabs">ElevenLabs</option><option value="mock">Mock (silent test)</option>
          </select>
        </label>
      </div>
      <div className="actions">
        <button className="btn" onClick={() => { setPrefs(DEFAULT_PREFS); setSecondsText(String(DEFAULT_PREFS.defaultSeconds)); savePrefs(DEFAULT_PREFS); setSaved(true); }}>Reset to defaults</button>
        {saved && <span className="muted small" role="status">Saved</span>}
      </div>
    </div>
  );
}
