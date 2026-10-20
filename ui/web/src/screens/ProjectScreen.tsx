import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import SettingsPanel from "../components/SettingsPanel";
import SourceEditor from "../components/SourceEditor";
import StepPanel from "../components/StepPanel";
import type { Project, Step } from "../types";

const ICON: Record<string, string> = {
  "not started": "○", ready: "●", running: "◐", "needs review": "◆", approved: "✓", done: "✓",
  stale: "↻", failed: "✗", skipped: "–",
};

function firstActionable(steps: Step[]): string {
  const order = ["running", "failed", "needs review", "stale", "ready"];
  for (const status of order) {
    const hit = steps.find((s) => s.status === status);
    if (hit) return hit.id;
  }
  return steps[steps.length - 1]?.id ?? "source";
}

export default function ProjectScreen({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const p = await api.project(id);
      setProject(p);
      setError("");
      setSelected((cur) => cur ?? firstActionable(p.steps.filter((s) => s.status !== "hidden")));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [id]);

  useEffect(() => { void refresh(); }, [refresh]);

  const running = project?.steps.some((s) => s.status === "running") ?? false;
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => { void refresh(); }, 2500);
    return () => window.clearInterval(t);
  }, [running, refresh]);

  if (error && !project) return <div className="page"><div className="banner error">{error}</div></div>;
  if (!project) return <div className="page muted">Loading…</div>;

  const steps = project.steps.filter((s) => s.status !== "hidden");
  const step = steps.find((s) => s.id === selected);

  return (
    <div className="page wide">
      <div className="proj-head">
        <h1>{project.title}</h1>
        {project.channel && <span className="badge">{project.channel}</span>}
        <span className="muted small">{project.resolution} · {project.fps} fps · target {project.target_seconds}s · voice {project.tts_provider} · {project.progress} done</span>
      </div>

      <div className="layout">
        <nav className="rail" aria-label="Pipeline steps">
          <button className={`rail-item ${selected === "source" ? "active" : ""}`} onClick={() => setSelected("source")}>
            <span className="icon">✎</span> Source document
          </button>
          {steps.map((s, i) => (
            <button
              key={s.id} onClick={() => setSelected(s.id)} disabled={s.status === "skipped"}
              className={`rail-item s-${s.status.replace(" ", "-")} ${selected === s.id ? "active" : ""}`}
              title={s.status === "skipped" ? s.note : undefined}
            >
              <span className="icon">{ICON[s.status] ?? "○"}</span>
              <span className="rail-text">{i + 1}. {s.title}<small>{s.status}</small></span>
            </button>
          ))}
          <button className={`rail-item ${selected === "settings" ? "active" : ""}`} onClick={() => setSelected("settings")}>
            <span className="icon">⚙</span> Settings
          </button>
        </nav>

        <div className="main">
          {selected === "source" && (
            <section className="panel"><h2>Source document</h2><SourceEditor project={id} onSaved={refresh} /></section>
          )}
          {selected === "settings" && <SettingsPanel key={project.title + project.tts_provider} project={project} onSaved={refresh} />}
          {step && <StepPanel key={step.id} project={project} step={step} refresh={refresh} />}
        </div>
      </div>
    </div>
  );
}
