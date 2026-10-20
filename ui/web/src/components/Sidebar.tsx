import { useEffect, useState, type ReactNode } from "react";
import { api } from "../api";
import { go, parseRoute, type Route } from "../nav";
import { loadPrefs } from "../prefs";
import type { Project } from "../types";

const svg = (children: ReactNode) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const ICONS = {
  file: svg(<><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>),
  recent: svg(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  prefs: svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>),
  collapse: svg(<path d="M15 6l-6 6 6 6" />),
  expand: svg(<path d="M9 6l6 6-6 6" />),
};

interface GroupProps {
  label: string;
  icon: ReactNode;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function Group({ label, icon, collapsed, open, onToggle, children }: GroupProps) {
  const expanded = open && !collapsed;
  return (
    <div className="side-group">
      <button className="side-item" onClick={onToggle} aria-expanded={expanded} title={collapsed ? label : undefined}>
        <span className="side-icon">{icon}</span>
        {!collapsed && <span className="side-label">{label}</span>}
        {!collapsed && (
          <span className={`side-caret ${expanded ? "open" : ""}`} aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </span>
        )}
      </button>
      {expanded && <div className="side-children" role="group" aria-label={label}>{children}</div>}
    </div>
  );
}

function Child({ label, href, active, title }: { label: string; href: string; active: boolean; title?: string }) {
  return (
    <a className={`side-child ${active ? "active" : ""}`} href={href} aria-current={active ? "page" : undefined} title={title ?? label}>
      {label}
    </a>
  );
}

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

/** Left menu: File > Create New Project, Open Recent > (recent projects, All), Preferences. */
export default function Sidebar({ collapsed, onToggle }: Props) {
  const [route, setRoute] = useState<Route>(parseRoute);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentCount, setRecentCount] = useState(loadPrefs().recentCount);
  const [open, setOpen] = useState<Record<string, boolean>>({ file: true, recent: true });

  // Reload the recent list on every navigation, so a project you just created appears at once.
  useEffect(() => {
    const onChange = () => setRoute(parseRoute());
    const onPrefs = () => setRecentCount(loadPrefs().recentCount);
    window.addEventListener("hashchange", onChange);
    window.addEventListener("prefs-changed", onPrefs);
    return () => { window.removeEventListener("hashchange", onChange); window.removeEventListener("prefs-changed", onPrefs); };
  }, []);
  useEffect(() => { api.projects().then(setProjects).catch(() => setProjects([])); }, [route]);

  const toggle = (key: string) => {
    if (collapsed) { onToggle(); setOpen({ ...open, [key]: true }); return; } // an icon click re-opens the menu
    setOpen({ ...open, [key]: !open[key] });
  };

  const recent = projects.slice(0, recentCount);
  const activeProject = route.name === "project" ? route.id : null;

  const group = (id: string) => ({ id, collapsed, open: !!open[id], onToggle: () => toggle(id) });

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <a className="side-brand" href="#/" onClick={() => go("/")}>
        <strong>VS</strong>{!collapsed && <span>Video Studio</span>}
      </a>

      <nav aria-label="Main menu" className="side-nav">
        <Group {...group("file")} label="File" icon={ICONS.file}>
          <Child label="Create New Project" href="#/new" active={route.name === "new"} />
        </Group>

        <Group {...group("recent")} label="Open Recent" icon={ICONS.recent}>
          {recent.length === 0 && <span className="side-child muted">No projects yet</span>}
          {recent.map((p) => <Child key={p.id} label={p.title} href={`#/p/${p.id}`} active={activeProject === p.id} />)}
          <Child label="All" href="#/projects" active={route.name === "projects"} title="Show all projects" />
        </Group>

        <a className={`side-item ${route.name === "preferences" ? "active" : ""}`} href="#/preferences"
          aria-current={route.name === "preferences" ? "page" : undefined} title={collapsed ? "Preferences" : undefined}>
          <span className="side-icon">{ICONS.prefs}</span>
          {!collapsed && <span className="side-label">Preferences</span>}
        </a>
      </nav>

      <button className="side-toggle" onClick={onToggle} aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        title={collapsed ? "Expand menu" : "Collapse menu"}>
        <span className="side-icon">{collapsed ? ICONS.expand : ICONS.collapse}</span>
        {!collapsed && <span className="side-label">Expanded</span>}
      </button>
    </aside>
  );
}
