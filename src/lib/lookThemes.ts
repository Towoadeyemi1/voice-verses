/**
 * Themes: a named set of looks (which look each screen uses for scripture,
 * songs, announcements and countdowns) with a colour team, switched in one go,
 * e.g. "Easter", "Youth Sunday", "Christmas".
 */
import { Assignments, loadAssignments, saveAssignments } from './templates';
import { activeTeam, setActiveTeam } from './colorTeams';

export interface LookTheme {
  id: string;
  name: string;
  assignments: Assignments;
  teamId?: string;
}

const KEY = 'voice-verses-look-themes';
export const THEMES_CHANGED = 'voice-verses-look-themes-changed';

export function loadLookThemes(): LookTheme[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
}

function save(themes: LookTheme[]) {
  localStorage.setItem(KEY, JSON.stringify(themes));
  window.dispatchEvent(new Event(THEMES_CHANGED));
}

/** The looks and colour team in use now, kept as a theme. */
export function saveCurrentAsTheme(name: string): LookTheme {
  const theme: LookTheme = { id: `theme-${Date.now().toString(36)}`, name, assignments: loadAssignments(), teamId: activeTeam().id };
  save([...loadLookThemes(), theme]);
  return theme;
}

export function applyLookTheme(theme: LookTheme): void {
  saveAssignments(theme.assignments);
  if (theme.teamId) setActiveTeam(theme.teamId);
}

export function deleteLookTheme(id: string): void {
  save(loadLookThemes().filter((t) => t.id !== id));
}
