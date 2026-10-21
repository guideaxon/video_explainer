import { useEffect, useState } from "react";
import { api } from "../api";
import type { Project } from "../types";

/** "Continue a project": every project, newest activity first. Reached from Open Recent > All. */
export default function Projects() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [query, setQuery] = useState("");
  useEffect(() => { api.projects().then(setProjects).catch(() => setProjects([])); }, []);

  const shown = (projects ?? []).filter((p) => `${p.title} ${p.id} ${p.style_bundle}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="page">
      <h1>Continue a project</h1>
      {projects === null && <p className="muted">Loading projects…</p>}
      {projects !== null && projects.length === 0 && (
        <p className="muted">No projects yet. Use <a className="inline-link" href="#/new">File → Create New Project</a> to start one.</p>
      )}
      {projects !== null && projects.length > 0 && (
        <>
          <input className="search" type="search" placeholder="Filter by title, id or style bundle" value={query}
            onChange={(e) => setQuery(e.target.value)} aria-label="Filter projects" />
          {shown.length === 0 && <p className="muted">No project matches “{query}”.</p>}
          <div className="projects">
            {shown.map((p) => {
              const [done, total] = p.progress.split("/").map(Number);
              const running = p.steps.some((s) => s.status === "running");
              return (
                <a key={p.id} className="card project" href={`#/p/${p.id}`}>
                  <div className="project-top">
                    <strong>{p.title}</strong>
                    {p.style_bundle && <span className="badge">{p.style_bundle}</span>}
                    {!p.supported && <span className="badge warn">CLI only</span>}
                    {running && <span className="badge run">running</span>}
                  </div>
                  <div className="muted small">{p.resolution} · {p.id}</div>
                  <progress value={done} max={total || 1} aria-label={`${p.progress} steps done`} />
                  <div className="muted small">{p.progress} steps done{p.has_video ? " · video ready" : ""}</div>
                </a>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
