/**
 * Colour teams: the church's colours for a season or a month ("Advent purple",
 * "November: Thanksgiving"). Looks can use a team colour instead of a fixed
 * one (written "team:primary"), so changing the team recolours every slide,
 * the lower thirds and the app's own accent at once. A team can be set to
 * start automatically in the months it belongs to.
 */
import type { Template } from './templates';

export type TeamColor = 'primary' | 'secondary' | 'highlight' | 'background' | 'text';

export interface ColorTeam {
  id: string;
  name: string;
  colors: Record<TeamColor, string>;
  /** Months it is used in (0 = January), when teams follow the calendar */
  months?: number[];
}

export const TEAM_COLORS: { key: TeamColor; label: string }[] = [
  { key: 'primary', label: 'Main' },
  { key: 'secondary', label: 'Second' },
  { key: 'highlight', label: 'Highlight' },
  { key: 'background', label: 'Background' },
  { key: 'text', label: 'Text' },
];

export const BUILT_IN_TEAMS: ColorTeam[] = [
  { id: 'team-gold', name: 'Gold', colors: { primary: '#f0b44a', secondary: '#1e3a8a', highlight: '#f5c451', background: '#0b1020', text: '#ffffff' } },
  { id: 'team-advent', name: 'Advent purple', colors: { primary: '#7c3aed', secondary: '#c4b5fd', highlight: '#f5d0fe', background: '#140a24', text: '#ffffff' }, months: [11] },
  { id: 'team-easter', name: 'Easter white & gold', colors: { primary: '#d4a017', secondary: '#fff7e0', highlight: '#ffd166', background: '#1a1408', text: '#ffffff' }, months: [3] },
  { id: 'team-pentecost', name: 'Pentecost red', colors: { primary: '#e11d48', secondary: '#f97316', highlight: '#fdba74', background: '#1f0a0a', text: '#ffffff' } },
  { id: 'team-ocean', name: 'Ocean blue', colors: { primary: '#0ea5e9', secondary: '#14b8a6', highlight: '#7dd3fc', background: '#06141f', text: '#ffffff' } },
  { id: 'team-harvest', name: 'Harvest', colors: { primary: '#ea580c', secondary: '#65a30d', highlight: '#fcd34d', background: '#1c1006', text: '#ffffff' }, months: [10] },
];

const TEAMS_KEY = 'voice-verses-color-teams';
const ACTIVE_KEY = 'voice-verses-color-team';
const AUTO_KEY = 'voice-verses-color-team-by-month';
export const TEAM_CHANGED = 'voice-verses-color-team-changed';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
};

export function loadTeams(): ColorTeam[] {
  const saved = read<ColorTeam[] | null>(TEAMS_KEY, null);
  return saved?.length ? saved : BUILT_IN_TEAMS;
}

function notify() {
  window.dispatchEvent(new Event(TEAM_CHANGED));
}

export function saveTeams(teams: ColorTeam[]): void {
  localStorage.setItem(TEAMS_KEY, JSON.stringify(teams));
  notify();
}

export const teamsFollowMonths = () => read<boolean>(AUTO_KEY, false);
export function setTeamsFollowMonths(on: boolean): void {
  localStorage.setItem(AUTO_KEY, JSON.stringify(on));
  notify();
}

export function setActiveTeam(id: string): void {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(id));
  notify();
}

/** The team in use: this month's team when teams follow the calendar, else the one chosen. */
export function activeTeam(teams = loadTeams(), now = new Date()): ColorTeam {
  if (teamsFollowMonths()) {
    const monthly = teams.find((t) => t.months?.includes(now.getMonth()));
    if (monthly) return monthly;
  }
  const chosen = read<string>(ACTIVE_KEY, '');
  return teams.find((t) => t.id === chosen) ?? teams[0] ?? BUILT_IN_TEAMS[0];
}

/** "team:highlight" → this team's highlight colour; any other colour as it is. */
export function teamColor(value: string | undefined, team: ColorTeam): string | undefined {
  if (!value?.startsWith('team:')) return value;
  return team.colors[value.slice(5) as TeamColor] ?? value;
}

/** A look with its team colours filled in, ready to draw. */
export function withTeamColors(t: Template, team: ColorTeam): Template {
  const c = (v: string | undefined) => teamColor(v, team);
  return {
    ...t,
    background: { ...t.background, color: c(t.background.color)!, gradient: t.background.gradient && { ...t.background.gradient, to: c(t.background.gradient.to)! } },
    panel: { ...t.panel, color: c(t.panel.color)! },
    text: { ...t.text, color: c(t.text.color)!, highlight: c(t.text.highlight), outlineColor: c(t.text.outlineColor) },
    label: { ...t.label, color: c(t.label.color)! },
    layers: t.layers?.map((l) => ({ ...l, color: c(l.color), fill: c(l.fill), fillTo: c(l.fillTo), borderColor: c(l.borderColor) })),
  };
}

/** "#f0b44a" → "38 85% 62%" (the app's colour variables are HSL). */
export function hexToHsl(hex: string): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h.slice(0, 6), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    hue = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** The app's accent (buttons, highlights) follows the colour team. */
export function applyTeamAccent(team = activeTeam()): void {
  const root = document.documentElement;
  const hsl = hexToHsl(team.colors.primary);
  const light = parseInt(hsl.split(' ')[2]) > 55;
  for (const v of ['--primary', '--accent', '--ring']) root.style.setProperty(v, hsl);
  // Text on the accent stays readable whatever the colour
  const on = light ? '220 30% 8%' : '0 0% 100%';
  root.style.setProperty('--primary-foreground', on);
  root.style.setProperty('--accent-foreground', on);
}
