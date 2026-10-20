/** Navigate to a hash route such as "/p/my-video". Kept out of App.tsx so screens do not import it. */
export function go(path: string): void {
  window.location.hash = path;
}
