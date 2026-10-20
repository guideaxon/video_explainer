import { go, type Route } from "../nav";
import ThemeToggle from "./ThemeToggle";

const CRUMBS: Record<Route["name"], string> = {
  new: "Create a video", projects: "Projects", preferences: "Preferences", project: "Projects",
};

/** Top bar: where you are, a Create / Projects switch, and the theme toggle. */
export default function TopBar({ route }: { route: Route }) {
  const creating = route.name === "new";
  const browsing = route.name === "projects" || route.name === "project";
  return (
    <header className="topbar">
      <div className="crumb">
        {route.name === "project" ? <>Projects / <strong>{route.id}</strong></> : CRUMBS[route.name]}
      </div>
      <nav className="seg nav" aria-label="Sections">
        <button className="seg-btn" aria-current={creating ? "page" : undefined} onClick={() => go("/new")}>Create</button>
        <button className="seg-btn" aria-current={browsing ? "page" : undefined} onClick={() => go("/projects")}>Projects</button>
      </nav>
      <div className="top-actions"><ThemeToggle /></div>
    </header>
  );
}
