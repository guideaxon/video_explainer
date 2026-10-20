import { useEffect, useState } from "react";
import { api, ApiError } from "../api";

interface Props {
  project: string;
  kind: "script" | "narration";
  version: number | null; // output_time: reload when the file changes on disk
  onSaved: () => void;
}

/** Raw JSON editor for the script or narration file. Validates the JSON before saving. */
export default function DocEditor({ project, kind, version, onSaved }: Props) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setError("");
    if (version === null) { setText(""); setSaved(""); return; } // nothing on disk yet: skip the 404
    api.doc(project, kind)
      .then((d) => { const t = JSON.stringify(d, null, 2); setText(t); setSaved(t); })
      .catch((e) => { if (!(e instanceof ApiError && e.status === 404)) setError(e.message); setText(""); setSaved(""); });
  }, [project, kind, version]);

  if (!saved && !error) return null;

  async function save() {
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch (e) { setError(`Not valid JSON: ${(e as Error).message}`); return; }
    if (typeof parsed !== "object" || parsed === null) { setError("The file must be a JSON object or list."); return; }
    try {
      await api.saveDoc(project, kind, parsed);
      setSaved(text);
      setError("");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="doc">
      <button className="linkish" onClick={() => setOpen(!open)} aria-expanded={open}>
        {open ? "▾" : "▸"} View and edit {kind}.json
      </button>
      {open && (
        <>
          <textarea className="mono" rows={18} value={text} onChange={(e) => setText(e.target.value)} spellCheck={false} />
          {error && <div className="banner error" role="alert">{error}</div>}
          <div className="actions">
            <button className="btn" onClick={save} disabled={text === saved}>Save changes</button>
            {text !== saved && <span className="muted small">Unsaved changes. Saving makes later steps stale.</span>}
          </div>
        </>
      )}
    </div>
  );
}
