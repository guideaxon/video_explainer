import { useEffect, useState } from "react";
import { loadPrefs, resolveTheme, savePrefs } from "../prefs";

const svg = (children: React.ReactNode) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
const SUN = svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>);
const MOON = svg(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />);

const shownTheme = () => resolveTheme(loadPrefs().theme);

/** One button that shows the theme you would switch TO (a moon in light mode, a sun in dark mode).
 *  "Follow system" is chosen in Preferences; this button always sets an explicit light or dark. */
export default function ThemeToggle() {
  const [current, setCurrent] = useState(shownTheme);

  useEffect(() => {
    // Preferences, another toggle, or the OS switching (while on "system") can all change the theme.
    const sync = () => setCurrent(shownTheme());
    window.addEventListener("theme-applied", sync);
    return () => window.removeEventListener("theme-applied", sync);
  }, []);

  const target = current === "dark" ? "light" : "dark";
  return (
    <button className="theme-btn" onClick={() => savePrefs({ ...loadPrefs(), theme: target })}
      aria-label={`Switch to ${target} theme`} title={`Switch to ${target} theme`}>
      {target === "dark" ? MOON : SUN}
    </button>
  );
}
