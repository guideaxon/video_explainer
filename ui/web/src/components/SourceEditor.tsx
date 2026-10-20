import { useEffect, useState } from "react";
import { api } from "../api";

export default function SourceEditor({ project, onSaved }: { project: string; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState("");
  const [state, setState] = useState<"loading" | "idle" | "saving" | "error">("loading");
  const [error, setError] = useState("");

  useEffect(() => {
    api.source(project).then((s) => { setText(s.text); setSaved(s.text); setState("idle"); })
      .catch((e) => { setError(String(e.message ?? e)); setState("error"); });
  }, [project]);

  async function save() {
    setState("saving");
    try {
      await api.saveSource(project, text);
      setSaved(text);
      setState("idle");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  return (
    <div>
      <p className="muted">The document the script is generated from (<code>input/source.md</code>). Changing it after the script exists makes later steps stale.</p>
      <textarea className="source" rows={16} value={text} disabled={state === "loading"} onChange={(e) => setText(e.target.value)} />
      {state === "error" && <div className="banner error" role="alert">{error}</div>}
      <div className="actions">
        <button className="btn primary" onClick={save} disabled={state === "saving" || text === saved}>
          {state === "saving" ? "Saving…" : "Save"}
        </button>
        {text !== saved && <span className="muted small">Unsaved changes</span>}
      </div>
    </div>
  );
}
