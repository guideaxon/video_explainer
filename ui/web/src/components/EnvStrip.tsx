import { useEffect, useState } from "react";
import { api } from "../api";
import type { Chip, Health } from "../types";

const LABELS: [keyof Omit<Health, "style_bundles">, string][] = [
  ["python", "Python"], ["node", "Node"], ["ffmpeg", "ffmpeg"], ["claude", "Claude Code"],
  ["tts_edge", "edge-tts"], ["remotion", "Remotion deps"], ["earshot", "Earshot"],
];

export default function EnvStrip() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.health().then(setHealth).catch(() => setError("Cannot reach the API. Start it with: .venv\\Scripts\\python.exe -m ui.server"));
  }, []);

  if (error) return <div className="banner error">{error}</div>;
  if (!health) return null;
  return (
    <div className="env-strip" aria-label="Environment check">
      {LABELS.map(([key, label]) => {
        const chip = health[key] as Chip;
        // An optional tool that is missing is not a problem: neutral chip, the fix only in the tooltip.
        if (!chip.ok && chip.optional) {
          return <span key={key} className="chip opt" title={chip.fix}>○ {label} (optional, not installed)</span>;
        }
        return (
          <span key={key} className={`chip ${chip.ok ? "ok" : "bad"}`} title={chip.ok ? chip.detail : chip.fix}>
            {chip.ok ? "✓" : "✗"} {label}{!chip.ok && <em> — {chip.fix}</em>}
          </span>
        );
      })}
    </div>
  );
}
