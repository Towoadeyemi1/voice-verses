/** The operator's look: dark (the booth) or light (a bright room). Output screens draw their own. */
export type Theme = 'dark' | 'light';
const KEY = 'voice-verses-theme';

export function loadTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme = loadTheme()): void {
  document.documentElement.classList.toggle('light', theme === 'light');
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Applies now; not remembered
  }
  applyTheme(theme);
}
