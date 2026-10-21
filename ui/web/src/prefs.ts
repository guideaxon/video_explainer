export type Theme = "system" | "light" | "dark";

export interface Prefs {
  theme: Theme;
  defaultStyleBundle: string; // "" = Standard
  defaultSeconds: number;
  defaultVoice: string;
  recentCount: number; // projects listed under Open Recent
  soundEngine: "auto" | "builtin" | "earshot"; // the Sound step's engine; Earshot is opt-in, "auto" uses it when installed
}

export const DEFAULT_PREFS: Prefs = { theme: "system", defaultStyleBundle: "", defaultSeconds: 90, defaultVoice: "edge", recentCount: 5, soundEngine: "builtin" };

const KEY = "video-studio-prefs";

// Browser storage can be missing or blocked (private windows), so every access is guarded.
export function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    const stored = raw ? JSON.parse(raw) : {};
    // Prefs saved before the channel -> style bundle rename keep their default.
    if (stored.defaultChannel !== undefined && stored.defaultStyleBundle === undefined) stored.defaultStyleBundle = stored.defaultChannel;
    delete stored.defaultChannel;
    return { ...DEFAULT_PREFS, ...stored };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* not persisted */ }
  applyTheme(prefs.theme);
  window.dispatchEvent(new Event("prefs-changed"));
}

const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

/** The theme actually shown: "system" resolves to the operating system's current setting. */
export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") return darkQuery().matches ? "dark" : "light";
  return theme;
}

/** Sets data-theme (the resolved theme the CSS keys on) and data-theme-pref (what the user chose). */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = resolveTheme(theme);
  root.dataset.themePref = theme;
  window.dispatchEvent(new Event("theme-applied"));
}

/** Re-applies the theme when the operating system switches, if the preference is "system". */
export function watchSystemTheme(): () => void {
  const query = darkQuery();
  const onChange = () => { if (loadPrefs().theme === "system") applyTheme("system"); };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
