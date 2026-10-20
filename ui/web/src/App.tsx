import { useEffect, useState } from "react";
import Home from "./screens/Home";
import ProjectScreen from "./screens/ProjectScreen";

// Hash routes: "#/" is Home, "#/p/<id>" is a project. No router dependency needed for two screens.
function parseHash(): { projectId: string | null } {
  const m = window.location.hash.match(/^#\/p\/([a-z0-9_-]+)/);
  return { projectId: m ? m[1] : null };
}

export default function App() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const onChange = () => setRoute(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <a href="#/" className="brand">Video Studio</a>
        {route.projectId && <span className="crumb">/ {route.projectId}</span>}
      </header>
      <main>{route.projectId ? <ProjectScreen key={route.projectId} id={route.projectId} /> : <Home />}</main>
    </div>
  );
}
