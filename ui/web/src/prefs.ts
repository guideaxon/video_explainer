export type Theme = "system" | "light" | "dark";

export interface Prefs {
  theme: Theme;
  defaultChannel: string; // "" = Standard
  defaultSeconds: number;
  defaultVoice: string;
  recentCount: number; // projects listed under Open Recent
}

export const DEFAULT_PREFS: Prefs = { theme: "system", defaultChannel: "", defaultSeconds: 90, defaultVoice: "edge", recentCount: 5 };

const KEY = "video-studio-prefs";

// Browser storage can be missing or blocked (private windows), so every access is guarded.
export function loadPrefs(): Prefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    return { ...DEFAULT_PREFS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: Prefs): void {
  try { window.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* not persisted */ }
  applyTheme(prefs.theme);
  window.dispatchEvent(new Event("prefs-changed"));
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}
