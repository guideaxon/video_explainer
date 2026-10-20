import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import { parseRoute } from "./nav";
import NewProject from "./screens/NewProject";
import Preferences from "./screens/Preferences";
import ProjectScreen from "./screens/ProjectScreen";
import Projects from "./screens/Projects";

const COLLAPSED_KEY = "video-studio-sidebar-collapsed";

function loadCollapsed(): boolean {
  try { return window.localStorage.getItem(COLLAPSED_KEY) === "1"; } catch { return false; }
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  useEffect(() => {
    const onChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0"); } catch { /* not persisted */ }
  };

  return (
    <div className="shell">
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="content">
        {route.name === "new" && <NewProject />}
        {route.name === "projects" && <Projects />}
        {route.name === "preferences" && <Preferences />}
        {route.name === "project" && <ProjectScreen key={route.id} id={route.id} />}
      </main>
    </div>
  );
}
