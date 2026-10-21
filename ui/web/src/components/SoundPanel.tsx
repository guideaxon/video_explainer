import { useEffect, useState } from "react";
import { api } from "../api";
import type { Project, SoundInfo, Step } from "../types";

/** What the Sound step produced: which engine and palette, an audit of the cues, and each sound to play. */
export default function SoundPanel({ project, step }: { project: Project; step: Step }) {
  const [info, setInfo] = useState<SoundInfo | null>(null);
  const [error, setError] = useState("");

  // Reload whenever the step produces new output (a run finished).
  useEffect(() => {
    setError("");
    api.sound(project.id).then(setInfo).catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [project.id, step.output_time]);

  if (error) return <div className="banner error" role="alert">{error}</div>;
  if (!info?.manifest) {
    return <p className="muted">No sound effects yet. Run this step to generate them and place cues in the storyboard.</p>;
  }
  const { manifest } = info;
  const fallbacks = Object.values(manifest.sounds).filter((s) => s.engine === "builtin").length;
  const noCues = info.audit.some(([, msg]) => msg.startsWith("no SFX cues"));

  return (
    <div className="sound">
      <p>
        <strong>{manifest.engine === "earshot" ? "Earshot" : "Built-in"}</strong> engine, <strong>{manifest.palette}</strong> palette
        {manifest.engine === "earshot" && fallbacks > 0 && <> · {fallbacks} sound{fallbacks === 1 ? "" : "s"} fell back to built-in</>}
        {manifest.earshot && <span className="muted small"> · {manifest.earshot}</span>}
      </p>

      {noCues && (
        <p className="banner">No SFX cues were placed, so nothing will play in the render. The scenes have no animation the cue
          generator recognises; the sounds below are ready if you add cues by hand in storyboard.json.</p>
      )}
      <ul className="audit" aria-label="Sound audit">
        {info.audit.filter(([, msg]) => !msg.startsWith("no SFX cues")).map(([level, msg], i) => (
          <li key={i} className={`audit-${level.toLowerCase()}`}><strong>{level}</strong> {msg}</li>
        ))}
      </ul>

      <table className="sound-table">
        <thead><tr><th>Sound</th><th>Source</th><th>Length</th><th>Preview</th><th>Notes</th></tr></thead>
        <tbody>
          {Object.entries(manifest.sounds).map(([name, s]) => (
            <tr key={name}>
              <td><code>{name}</code></td>
              <td>{s.engine === "earshot" ? s.bank : "built-in"}</td>
              <td>{s.seconds.toFixed(2)} s</td>
              <td>
                <audio controls preload="none" aria-label={`Play ${name}`}
                  src={`${api.fileUrl(project.id, `sfx/${name}.wav`)}?v=${step.output_time}`} />
              </td>
              <td className="small">
                {s.fallback_reason && <span className="bad">Earshot failed: {s.fallback_reason}</span>}
                {s.warnings.map((w) => <span key={w} className="warn">{w}</span>)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
