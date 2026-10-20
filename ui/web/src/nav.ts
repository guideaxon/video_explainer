/** Navigate to a hash route such as "/p/my-video". Kept out of App.tsx so screens do not import it. */
export function go(path: string): void {
  window.location.hash = path;
}

export type Route =
  | { name: "new" }
  | { name: "projects" }
  | { name: "preferences" }
  | { name: "project"; id: string };

// "#/" and "#/new" are the Create screen; "#/projects" lists every project; "#/p/<id>" is one project.
export function parseRoute(hash: string = window.location.hash): Route {
  const project = hash.match(/^#\/p\/([a-z0-9_-]+)/);
  if (project) return { name: "project", id: project[1] };
  if (hash.startsWith("#/projects")) return { name: "projects" };
  if (hash.startsWith("#/preferences")) return { name: "preferences" };
  return { name: "new" };
}
