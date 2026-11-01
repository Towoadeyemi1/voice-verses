/**
 * Starter templates: ready-made choices to begin from for every feature that
 * takes a design or a set-up, so a church never starts from a blank page.
 * - Looks for scripture, songs, announcements, countdowns and lower thirds
 * - More colour teams, and themes (a whole set of looks with a colour team)
 * - Orders of service (Sunday, Bible study, prayer, communion, youth, wedding…)
 * - Stage (confidence) monitor layouts, and countdowns
 *
 * Everything is added as the church's own copy, to change as they like.
 * No copyrighted words: titles and layouts only.
 */
import { Assignments, BUILT_IN_TEMPLATES, ContentKind, FONTS, Template, TEMPLATE_BASE } from './templates';
import type { MotionBackground } from './backgrounds';
import type { ColorTeam } from './colorTeams';
import type { ConfidenceSettings } from '@/components/ConfidenceScreen';
import type { Service, ServiceSection } from '@/types/service';

const SERIF = FONTS[0].value; // Georgia
const PALATINO = FONTS[2].value;
const SANS = FONTS[4].value; // Helvetica / Arial
const AVENIR = FONTS[5].value;
const FUTURA = FONTS[6].value;
const GREEN = '#00ff00'; // key colour for lower thirds

const b = TEMPLATE_BASE;
type LookKind = ContentKind | 'lowerThird';

export interface StarterLook {
  kind: LookKind;
  description: string;
  look: Template;
}

type LookChange = Omit<Partial<Template>, 'background' | 'area' | 'panel' | 'text' | 'label' | 'logo'> & {
  background?: Partial<Template['background']>;
  area?: Partial<Template['area']>;
  panel?: Partial<Template['panel']>;
  text?: Partial<Template['text']>;
  label?: Partial<Template['label']>;
  logo?: Partial<Template['logo']>;
};

/** An app-made background in the colour team's colours. */
const moving = (style: MotionBackground['style'], dim = 0.2, speed = 1, colors: [string, string] = ['team:primary', 'team:secondary']): Partial<Template['background']> => ({
  type: 'motion',
  color: 'team:background',
  motion: { style, colors, speed },
  dim,
});
const BLACK: Partial<Template['background']> = { type: 'color', color: '#000000', dim: 0 };
const builtIn = (id: string) => structuredClone(BUILT_IN_TEMPLATES.find((t) => t.id === id)!);

const look = (id: string, name: string, change: LookChange): Template => ({
  ...b,
  ...change,
  id,
  name,
  background: { ...b.background, ...change.background },
  area: { ...b.area, ...change.area },
  panel: { ...b.panel, ...change.panel },
  text: { ...b.text, ...change.text },
  label: { ...b.label, ...change.label },
  logo: { ...b.logo, ...change.logo },
});

export const STARTER_LOOKS: StarterLook[] = [
  // ---- Scripture -------------------------------------------------------------
  {
    kind: 'scripture',
    description: 'White serif over a soft glow in the team colours, reference underneath. Clear in any room.',
    look: builtIn('scripture-full'),
  },
  {
    kind: 'scripture',
    description: 'White serif on plain black. Nothing moves; the words are everything.',
    look: look('starter-scripture-black', 'Scripture – plain black', { background: BLACK }),
  },
  {
    kind: 'scripture',
    description: 'Beams of light from above, swaying slowly. Large serif text.',
    look: look('starter-scripture-rays', 'Scripture – light rays', {
      background: moving('rays', 0.2, 0.7, ['team:highlight', 'team:secondary']),
      text: { fontFamily: PALATINO, fontSize: 84 },
      label: { color: 'team:highlight', fontSize: 44 },
    }),
  },
  {
    kind: 'scripture',
    description: 'Like a printed page on warm paper: left-aligned serif, nothing moving.',
    look: look('starter-scripture-paper', 'Scripture – paper', {
      background: moving('texture', 0, 0),
      area: { x: 12, y: 14, width: 76, height: 72 },
      text: { fontFamily: SERIF, fontSize: 80, align: 'left', lineHeight: 1.32, shadow: false },
      label: { position: 'above', fontSize: 38, color: 'team:highlight' },
    }),
  },
  {
    kind: 'scripture',
    description: 'A quiet night sky with stars twinkling: for evening services and Christmas.',
    look: look('starter-scripture-stars', 'Scripture – night sky', {
      background: moving('stars', 0.1, 0.8),
      text: { fontFamily: PALATINO, fontSize: 84 },
      label: { color: 'team:highlight', fontSize: 44 },
    }),
  },
  {
    kind: 'scripture',
    description: 'A soft gradient in the colour team, large serif text.',
    look: look('starter-scripture-gradient', 'Scripture – team gradient', {
      background: { type: 'gradient', color: 'team:background', gradient: { to: 'team:secondary', angle: 160 }, dim: 0 },
      text: { fontFamily: PALATINO, fontSize: 86 },
      label: { color: 'team:highlight', fontSize: 44 },
    }),
  },
  {
    kind: 'scripture',
    description: 'Left-aligned like a printed page; the reference above with a thin accent line.',
    look: look('starter-scripture-editorial', 'Scripture – editorial', {
      background: { type: 'color', color: '#111013', dim: 0 },
      area: { x: 12, y: 14, width: 76, height: 72 },
      text: { fontFamily: SERIF, fontSize: 80, align: 'left', lineHeight: 1.32, shadow: false },
      label: { position: 'above', fontSize: 38, color: 'team:primary' },
      layers: [{ id: 'rule', kind: 'shape', name: 'Accent line', x: 12, y: 11, width: 6, height: 0.6, opacity: 1, fill: 'team:primary', radius: 4 }],
    }),
  },
  {
    kind: 'scripture',
    description: 'Clean sans-serif, bold reference on top. Modern and easy to read from far away.',
    look: look('starter-scripture-modern', 'Scripture – modern', {
      background: { type: 'color', color: '#0b0d12', dim: 0 },
      text: { fontFamily: AVENIR, fontSize: 76, fontWeight: 600, lineHeight: 1.3, shadow: false },
      label: { position: 'above', fontSize: 40, color: 'team:highlight' },
    }),
  },
  {
    kind: 'scripture',
    description: 'Text on a band across the lower part, so a picture or video behind stays visible.',
    look: look('scripture-lower', 'Scripture – lower part', {
      area: { x: 5, y: 58, width: 90, height: 36 },
      panel: { show: true, color: '#000000', opacity: 0.72, radius: 16 },
      text: { fontSize: 56, align: 'left', verticalAlign: 'bottom', lineHeight: 1.3 },
      label: { position: 'above', fontSize: 36 },
    }),
  },
  {
    kind: 'scripture',
    description: 'Big, bold and high-contrast, with an outline: for over busy video backgrounds.',
    look: look('starter-scripture-bold', 'Scripture – bold over video', {
      background: { type: 'color', color: '#000000', dim: 0.55 },
      text: { fontFamily: SANS, fontSize: 92, fontWeight: 800, lineHeight: 1.2, outline: 3, outlineColor: '#000000' },
      label: { fontSize: 42, color: '#ffffff' },
    }),
  },

  // ---- Songs -------------------------------------------------------------------
  {
    kind: 'lyrics',
    description: 'Bold, centred lines over slowly drifting colour: the classic worship look.',
    look: builtIn('lyrics-center'),
  },
  {
    kind: 'lyrics',
    description: 'Bold, centred lines on plain black.',
    look: look('starter-lyrics-black', 'Songs – plain black', {
      background: BLACK,
      text: { fontFamily: SANS, fontSize: 88, fontWeight: 700, lineHeight: 1.3 },
      label: { show: false, fontSize: 32, color: '#d1d5db' },
    }),
  },
  {
    kind: 'lyrics',
    description: 'Soft lights rising slowly behind the words: warm and gentle.',
    look: look('starter-lyrics-lights', 'Songs – rising lights', {
      background: moving('bokeh', 0.2, 0.8, ['team:primary', 'team:highlight']),
      text: { fontFamily: AVENIR, fontSize: 84, fontWeight: 700, lineHeight: 1.3 },
      label: { show: false },
    }),
  },
  {
    kind: 'lyrics',
    description: 'Layers of waves rolling along the bottom of the screen.',
    look: look('starter-lyrics-waves', 'Songs – waves', {
      background: moving('waves', 0.1, 0.8),
      area: { x: 6, y: 6, width: 88, height: 66 },
      text: { fontFamily: SANS, fontSize: 84, fontWeight: 700, lineHeight: 1.3 },
      label: { show: false },
    }),
  },
  {
    kind: 'lyrics',
    description: 'Dawn light rising over the horizon: for hymns of praise and Easter.',
    look: look('starter-lyrics-horizon', 'Songs – dawn', {
      background: moving('horizon', 0.15, 0.7, ['team:highlight', 'team:secondary']),
      area: { x: 6, y: 6, width: 88, height: 60 },
      text: { fontFamily: PALATINO, fontSize: 80, lineHeight: 1.35 },
      label: { show: false },
    }),
  },
  {
    kind: 'lyrics',
    description: 'Lyrics on a band low on the screen, leaving the stage visible behind.',
    look: look('starter-lyrics-lower', 'Songs – lower band', {
      area: { x: 6, y: 64, width: 88, height: 30 },
      panel: { show: true, color: '#000000', opacity: 0.6, radius: 18 },
      text: { fontFamily: SANS, fontSize: 60, fontWeight: 700, lineHeight: 1.25, verticalAlign: 'middle' },
      label: { show: false },
    }),
  },
  {
    kind: 'lyrics',
    description: 'Elegant serif on a soft team gradient: for hymns and quieter songs.',
    look: look('starter-lyrics-serif', 'Songs – hymn', {
      background: { type: 'gradient', color: 'team:background', gradient: { to: 'team:secondary', angle: 200 }, dim: 0 },
      text: { fontFamily: PALATINO, fontSize: 84, fontWeight: 400, lineHeight: 1.35 },
      label: { show: false },
    }),
  },
  {
    kind: 'lyrics',
    description: 'Clean modern sans-serif, slightly smaller: lots of lines stay readable.',
    look: look('starter-lyrics-modern', 'Songs – modern', {
      background: { type: 'color', color: '#0b0d12', dim: 0 },
      text: { fontFamily: AVENIR, fontSize: 78, fontWeight: 600, lineHeight: 1.3, shadow: false },
      label: { show: false },
    }),
  },
  {
    kind: 'lyrics',
    description: 'Uppercase with an outline, for over motion backgrounds and bright stage lights.',
    look: look('starter-lyrics-bold', 'Songs – bold uppercase', {
      background: { type: 'color', color: '#000000', dim: 0.5 },
      text: { fontFamily: FUTURA, fontSize: 82, fontWeight: 800, uppercase: true, letterSpacing: 2, lineHeight: 1.2, outline: 3, outlineColor: '#000000' },
      label: { show: false },
    }),
  },

  // ---- Announcements ---------------------------------------------------------
  {
    kind: 'announcement',
    description: 'A big title with the details underneath, over flowing team colours.',
    look: builtIn('announcement'),
  },
  {
    kind: 'announcement',
    description: 'A big title with the details underneath, on plain black.',
    look: look('starter-announce-black', 'Announcements – plain black', {
      background: BLACK,
      text: { fontFamily: SANS, fontSize: 64 },
      label: { position: 'above', fontSize: 72, color: '#ffffff', includeVersion: false },
    }),
  },
  {
    kind: 'announcement',
    description: 'Details on a glass card over drifting colour, title in the team colour.',
    look: look('starter-announce-aurora', 'Announcements – aurora card', {
      background: moving('aurora', 0.15),
      area: { x: 14, y: 18, width: 72, height: 64 },
      panel: { show: true, color: '#000000', opacity: 0.4, radius: 28 },
      text: { fontFamily: AVENIR, fontSize: 56, fontWeight: 400, shadow: false },
      label: { position: 'above', fontSize: 70, color: 'team:highlight', includeVersion: false },
    }),
  },
  {
    kind: 'announcement',
    description: 'Details on a rounded card in the middle of the screen, title in the team colour.',
    look: look('starter-announce-card', 'Announcements – card', {
      background: { type: 'gradient', color: 'team:background', gradient: { to: '#000000', angle: 180 }, dim: 0 },
      area: { x: 14, y: 18, width: 72, height: 64 },
      panel: { show: true, color: '#000000', opacity: 0.55, radius: 28 },
      text: { fontFamily: AVENIR, fontSize: 56, fontWeight: 400, shadow: false },
      label: { position: 'above', fontSize: 70, color: 'team:highlight', includeVersion: false },
    }),
  },
  {
    kind: 'announcement',
    description: 'Title on a colour bar across the top, details below: like a news banner.',
    look: look('starter-announce-banner', 'Announcements – banner', {
      background: { type: 'color', color: '#0b0d12', dim: 0 },
      area: { x: 8, y: 30, width: 84, height: 58 },
      text: { fontFamily: AVENIR, fontSize: 58, align: 'left', verticalAlign: 'top', shadow: false },
      label: { position: 'above', fontSize: 64, color: '#ffffff', includeVersion: false },
      layers: [{ id: 'band', kind: 'shape', name: 'Top bar', x: 0, y: 0, width: 100, height: 4, opacity: 1, fill: 'team:primary', fillTo: 'team:secondary' }],
    }),
  },
  {
    kind: 'announcement',
    description: 'A poster: one huge title, a short line under it. Best with a picture background.',
    look: look('starter-announce-poster', 'Announcements – poster', {
      background: { type: 'color', color: '#000000', dim: 0.45 },
      area: { x: 8, y: 20, width: 84, height: 62 },
      text: { fontFamily: AVENIR, fontSize: 52, fontWeight: 600 },
      label: { position: 'above', fontSize: 120, color: '#ffffff', includeVersion: false },
    }),
  },

  // ---- Countdowns ------------------------------------------------------------
  {
    kind: 'countdown',
    description: 'Huge numbers with the message above, over soft rising lights.',
    look: builtIn('countdown'),
  },
  {
    kind: 'countdown',
    description: 'Huge numbers on plain black.',
    look: look('starter-countdown-black', 'Countdown – plain black', {
      background: BLACK,
      area: { x: 10, y: 20, width: 80, height: 60 },
      text: { fontFamily: SANS, fontSize: 260, fontWeight: 700, lineHeight: 1.1 },
      label: { position: 'above', fontSize: 64, color: '#ffffff', includeVersion: false },
    }),
  },
  {
    kind: 'countdown',
    description: 'Numbers under a starry sky: calm before an evening service.',
    look: look('starter-countdown-stars', 'Countdown – night sky', {
      background: moving('stars', 0.05, 0.8),
      area: { x: 10, y: 22, width: 80, height: 56 },
      text: { fontFamily: AVENIR, fontSize: 240, fontWeight: 600, lineHeight: 1.05, shadow: false },
      label: { position: 'below', fontSize: 52, color: 'team:highlight', includeVersion: false },
    }),
  },
  {
    kind: 'countdown',
    description: 'Numbers over rolling waves in the team colours.',
    look: look('starter-countdown-waves', 'Countdown – waves', {
      background: moving('waves', 0.05),
      area: { x: 10, y: 14, width: 80, height: 52 },
      text: { fontFamily: AVENIR, fontSize: 240, fontWeight: 600, lineHeight: 1.05, shadow: false },
      label: { position: 'below', fontSize: 52, color: '#ffffff', includeVersion: false },
    }),
  },
  {
    kind: 'countdown',
    description: 'Numbers on the team gradient with a thin accent bar: welcoming before the service.',
    look: look('starter-countdown-bar', 'Countdown – team colours', {
      background: { type: 'gradient', color: 'team:background', gradient: { to: 'team:secondary', angle: 135 }, dim: 0 },
      area: { x: 10, y: 22, width: 80, height: 56 },
      text: { fontFamily: AVENIR, fontSize: 240, fontWeight: 600, lineHeight: 1.05, shadow: false },
      label: { position: 'below', fontSize: 52, color: 'team:highlight', includeVersion: false },
      layers: [{ id: 'bar', kind: 'shape', name: 'Accent bar', x: 44, y: 80, width: 12, height: 0.8, opacity: 1, fill: 'team:primary', radius: 4 }],
    }),
  },
  {
    kind: 'countdown',
    description: 'Quiet and small, lower right: the room sees it without it taking over.',
    look: look('starter-countdown-minimal', 'Countdown – small and quiet', {
      background: { type: 'color', color: '#000000', dim: 0 },
      area: { x: 60, y: 70, width: 34, height: 22 },
      text: { fontFamily: AVENIR, fontSize: 120, fontWeight: 600, align: 'right', verticalAlign: 'bottom', shadow: false },
      label: { position: 'above', fontSize: 34, color: '#d1d5db', includeVersion: false },
    }),
  },

  // ---- Lower thirds (stream) -----------------------------------------------------
  {
    kind: 'lowerThird',
    description: 'A dark rounded panel on green, for keying out in OBS, vMix or a switcher.',
    look: look('stream-lower-third', 'Stream – lower third (green)', {
      background: { type: 'color', color: GREEN, dim: 0 },
      area: { x: 8, y: 70, width: 84, height: 25 },
      panel: { show: true, color: '#000000', opacity: 0.78, radius: 14 },
      text: { fontSize: 46, align: 'left', verticalAlign: 'bottom', shadow: false, lineHeight: 1.3 },
      label: { position: 'below', fontSize: 30 },
    }),
  },
  {
    kind: 'lowerThird',
    description: 'A bar in the colour team with an accent edge.',
    look: look('stream-bar-team', 'Lower third – colour bar', {
      background: { type: 'color', color: GREEN, dim: 0 },
      area: { x: 9, y: 74, width: 80, height: 20 },
      text: { fontFamily: AVENIR, fontSize: 44, fontWeight: 600, align: 'left', verticalAlign: 'middle', shadow: false, lineHeight: 1.25 },
      label: { position: 'above', fontSize: 30, color: 'team:highlight' },
      layers: [
        { id: 'bar', kind: 'shape', name: 'Bar', x: 6, y: 72, width: 86, height: 24, opacity: 0.92, fill: 'team:background', fillTo: 'team:secondary', radius: 18 },
        { id: 'accent', kind: 'shape', name: 'Accent line', x: 6, y: 72, width: 1.2, height: 24, opacity: 1, fill: 'team:primary', radius: 6 },
      ],
    }),
  },
  {
    kind: 'lowerThird',
    description: 'Dark text on a white card: crisp over darker camera shots.',
    look: look('stream-bar-light', 'Lower third – light card', {
      background: { type: 'color', color: GREEN, dim: 0 },
      area: { x: 10, y: 75, width: 78, height: 18 },
      text: { fontFamily: AVENIR, fontSize: 42, fontWeight: 600, color: '#111827', align: 'left', verticalAlign: 'middle', shadow: false, lineHeight: 1.25 },
      label: { position: 'above', fontSize: 28, color: 'team:primary' },
      layers: [{ id: 'card', kind: 'shape', name: 'Card', x: 7, y: 73, width: 84, height: 22, opacity: 0.96, fill: '#ffffff', radius: 22 }],
    }),
  },
  {
    kind: 'lowerThird',
    description: 'A full-width strip with a team-colour block for the reference, like a news channel.',
    look: look('starter-lt-news', 'Lower third – news strip', {
      background: { type: 'color', color: GREEN, dim: 0 },
      area: { x: 22, y: 79, width: 74, height: 15 },
      text: { fontFamily: SANS, fontSize: 40, fontWeight: 600, align: 'left', verticalAlign: 'middle', shadow: false, lineHeight: 1.2 },
      label: { show: false },
      layers: [
        { id: 'strip', kind: 'shape', name: 'Strip', x: 0, y: 78, width: 100, height: 17, opacity: 0.94, fill: '#0b0d12' },
        { id: 'block', kind: 'shape', name: 'Colour block', x: 0, y: 78, width: 20, height: 17, opacity: 1, fill: 'team:primary', fillTo: 'team:secondary' },
      ],
    }),
  },
  {
    kind: 'lowerThird',
    description: 'No box at all: white text with a soft shadow and a thin line. Very light on the picture.',
    look: look('starter-lt-minimal', 'Lower third – minimal line', {
      background: { type: 'color', color: GREEN, dim: 0 },
      area: { x: 8, y: 76, width: 80, height: 18 },
      text: { fontFamily: AVENIR, fontSize: 44, fontWeight: 600, align: 'left', verticalAlign: 'middle', shadow: true, lineHeight: 1.25 },
      label: { position: 'above', fontSize: 28, color: 'team:highlight' },
      layers: [{ id: 'line', kind: 'shape', name: 'Line', x: 8, y: 75, width: 10, height: 0.5, opacity: 1, fill: 'team:primary', radius: 2 }],
    }),
  },
  {
    kind: 'lowerThird',
    description: 'A dark glass pill, centred low on the screen.',
    look: look('starter-lt-pill', 'Lower third – centred pill', {
      background: { type: 'color', color: GREEN, dim: 0 },
      area: { x: 16, y: 78, width: 68, height: 15 },
      panel: { show: true, color: '#111013', opacity: 0.86, radius: 999 },
      text: { fontFamily: AVENIR, fontSize: 38, fontWeight: 600, align: 'center', verticalAlign: 'middle', shadow: false, lineHeight: 1.2 },
      label: { position: 'below', fontSize: 26, color: 'team:highlight' },
    }),
  },
];

/** Adds a starter look to the church's looks (once), returning the new list. */
export function addStarterLook(templates: Template[], look: Template): Template[] {
  return templates.some((t) => t.id === look.id) ? templates : [...templates, structuredClone(look)];
}

export const LOOK_KINDS: { kind: LookKind; label: string }[] = [
  { kind: 'scripture', label: 'Scripture' },
  { kind: 'lyrics', label: 'Songs' },
  { kind: 'announcement', label: 'Announcements' },
  { kind: 'countdown', label: 'Countdowns' },
  { kind: 'lowerThird', label: 'Lower thirds' },
];

// ---- Colour teams ----------------------------------------------------------------

export const STARTER_TEAMS: ColorTeam[] = [
  { id: 'team-christmas', name: 'Christmas', colors: { primary: '#c8102e', secondary: '#0f5132', highlight: '#f2c14e', background: '#140808', text: '#ffffff' } },
  { id: 'team-lent', name: 'Lent', colors: { primary: '#6b21a8', secondary: '#3b0764', highlight: '#d8b4fe', background: '#0f0614', text: '#ffffff' }, months: [2] },
  { id: 'team-royal', name: 'Royal blue', colors: { primary: '#2952e3', secondary: '#0b1f6b', highlight: '#f5c451', background: '#050b24', text: '#ffffff' } },
  { id: 'team-mono', name: 'Graphite', colors: { primary: '#e7e5ea', secondary: '#3a383f', highlight: '#ffffff', background: '#111013', text: '#ffffff' } },
  { id: 'team-spring', name: 'Spring', colors: { primary: '#16a34a', secondary: '#0d9488', highlight: '#fbcfe8', background: '#04140c', text: '#ffffff' }, months: [4] },
  { id: 'team-youth', name: 'Youth', colors: { primary: '#ec4899', secondary: '#8b5cf6', highlight: '#22d3ee', background: '#0c0618', text: '#ffffff' } },
  { id: 'team-thanksgiving', name: 'Thanksgiving', colors: { primary: '#b45309', secondary: '#7c2d12', highlight: '#fde68a', background: '#160b04', text: '#ffffff' } },
];

// ---- Themes: a set of looks and a colour team ----------------------------------

export interface StarterTheme {
  id: string;
  name: string;
  description: string;
  teamId: string;
  assignments: Assignments;
}

const theme = (
  id: string,
  name: string,
  description: string,
  teamId: string,
  room: [string, string, string, string],
  stream: string,
): StarterTheme => ({
  id,
  name,
  description,
  teamId,
  assignments: {
    projection: { scripture: room[0], lyrics: room[1], announcement: room[2], countdown: room[3] },
    stream: { scripture: stream, lyrics: stream, announcement: stream, countdown: stream },
  },
});

export const STARTER_THEMES: StarterTheme[] = [
  theme('living', 'Living colour', 'The built-in looks: soft moving backgrounds in your team colours, serif scripture, bold songs.', 'team-gold', ['scripture-full', 'lyrics-center', 'announcement', 'countdown'], 'stream-lower-third'),
  theme('classic', 'Classic black', 'Serif scripture, bold songs, plain black backgrounds. Nothing moves. Works everywhere.', 'team-gold', ['starter-scripture-black', 'starter-lyrics-black', 'starter-announce-black', 'starter-countdown-black'], 'stream-lower-third'),
  theme('night', 'Night sky', 'Stars and soft rising lights: for evening services and carols.', 'team-royal', ['starter-scripture-stars', 'starter-lyrics-lights', 'starter-announce-aurora', 'starter-countdown-stars'], 'stream-bar-team'),
  theme('ocean', 'Ocean', 'Waves in blue and teal, clean sans-serif.', 'team-ocean', ['starter-scripture-modern', 'starter-lyrics-waves', 'starter-announce-aurora', 'starter-countdown-waves'], 'stream-bar-team'),
  theme('modern', 'Modern', 'Clean sans-serif, dark backgrounds, a colour bar on the stream.', 'team-ocean', ['starter-scripture-modern', 'starter-lyrics-modern', 'starter-announce-banner', 'starter-countdown-bar'], 'stream-bar-team'),
  theme('editorial', 'Editorial', 'Like a printed page: left-aligned serif on paper, quiet graphite colours.', 'team-mono', ['starter-scripture-paper', 'starter-lyrics-serif', 'starter-announce-card', 'starter-countdown-minimal'], 'starter-lt-minimal'),
  theme('christmas', 'Christmas', 'A starry night and soft lights in red, green and gold.', 'team-christmas', ['starter-scripture-stars', 'starter-lyrics-lights', 'starter-announce-card', 'starter-countdown-bar'], 'stream-bar-team'),
  theme('easter', 'Easter', 'Light rays and dawn over the horizon in white and gold.', 'team-easter', ['starter-scripture-rays', 'starter-lyrics-horizon', 'starter-announce-card', 'starter-countdown-bar'], 'stream-bar-light'),
  theme('pentecost', 'Pentecost', 'Red and orange, bold and bright.', 'team-pentecost', ['starter-scripture-gradient', 'starter-lyrics-bold', 'starter-announce-banner', 'starter-countdown-bar'], 'starter-lt-news'),
  theme('youth', 'Youth night', 'Vibrant colours, bold uppercase songs, news-strip lower thirds.', 'team-youth', ['starter-scripture-bold', 'starter-lyrics-bold', 'starter-announce-poster', 'starter-countdown-bar'], 'starter-lt-news'),
];

/** The looks a theme needs, so they can be added before it is used. */
export const looksForTheme = (t: StarterTheme): Template[] => {
  const ids = new Set([...Object.values(t.assignments.projection), ...Object.values(t.assignments.stream)]);
  return STARTER_LOOKS.filter((s) => ids.has(s.look.id)).map((s) => s.look);
};

// ---- Orders of service ---------------------------------------------------------

export interface StarterService {
  id: string;
  name: string;
  description: string;
  startTime: string;
  /** [section, [item, minutes][]][] */
  plan: [string, [string, number][]][];
}

export const STARTER_SERVICES: StarterService[] = [
  {
    id: 'sunday',
    name: 'Sunday Service',
    description: 'Worship, prayer, notices, offering, the sermon and a response. About 1 h 45.',
    startTime: '10:00',
    plan: [
      ['Before', [['Countdown and notices', 5]]],
      ['Welcome', [['Welcome', 4]]],
      ['Worship', [['Opening song', 6], ['Song 2', 6], ['Song 3', 6]]],
      ['Prayer', [['Opening prayer', 5]]],
      ['Scripture reading', [['Reading', 5]]],
      ['Notices', [['Notices', 5]]],
      ['Giving', [['Offering', 5]]],
      ['Word', [['Sermon', 40]]],
      ['Response', [['Altar call', 8]]],
      ['Closing', [['Closing song', 5], ['Benediction', 3]]],
    ],
  },
  {
    id: 'bible-study',
    name: 'Midweek Bible Study',
    description: 'Teaching through a passage with discussion. About 1 h 15.',
    startTime: '19:00',
    plan: [
      ['Welcome', [['Welcome', 5]]],
      ['Prayer', [['Opening prayer', 5]]],
      ['Worship', [['Song', 6]]],
      ['Word', [['Bible study', 45], ['Questions and discussion', 10]]],
      ['Closing', [['Closing prayer', 5]]],
    ],
  },
  {
    id: 'prayer',
    name: 'Prayer Meeting',
    description: 'Worship, a scripture, prayer points and testimonies. About an hour.',
    startTime: '19:00',
    plan: [
      ['Welcome', [['Welcome', 3]]],
      ['Worship', [['Worship', 10]]],
      ['Scripture reading', [['Scripture', 5]]],
      ['Prayer', [['Prayer points', 30]]],
      ['Response', [['Testimonies', 7]]],
      ['Closing', [['Closing prayer', 5]]],
    ],
  },
  {
    id: 'communion',
    name: 'Communion Service',
    description: 'A Sunday service with the Lord’s Supper after the sermon.',
    startTime: '10:00',
    plan: [
      ['Before', [['Countdown', 5]]],
      ['Welcome', [['Welcome', 4]]],
      ['Worship', [['Opening song', 6], ['Song 2', 6]]],
      ['Prayer', [['Prayer', 5]]],
      ['Word', [['Sermon', 30]]],
      ['Communion', [['Communion', 15], ['Song during communion', 5]]],
      ['Giving', [['Offering', 5]]],
      ['Closing', [['Closing song', 5], ['Benediction', 3]]],
    ],
  },
  {
    id: 'youth',
    name: 'Youth Service',
    description: 'Longer worship, a shorter talk and small groups.',
    startTime: '18:00',
    plan: [
      ['Before', [['Countdown', 5]]],
      ['Welcome', [['Welcome and game', 10]]],
      ['Worship', [['Worship set', 20]]],
      ['Word', [['Talk', 25]]],
      ['Response', [['Small groups', 15]]],
      ['Closing', [['Closing', 5]]],
    ],
  },
  {
    id: 'wedding',
    name: 'Wedding',
    description: 'Processional, readings, sermon, vows, rings, signing and recessional.',
    startTime: '13:00',
    plan: [
      ['Before', [['Guests arrive', 10]]],
      ['Welcome', [['Processional', 5], ['Welcome', 3]]],
      ['Worship', [['Hymn', 5]]],
      ['Scripture reading', [['Readings', 6]]],
      ['Word', [['Sermon', 15]]],
      ['Vows', [['Vows', 10], ['Rings', 5], ['Prayer and blessing', 5]]],
      ['Closing', [['Signing of the register', 10], ['Recessional', 5]]],
    ],
  },
  {
    id: 'thanksgiving',
    name: 'Thanksgiving Service (celebration of life)',
    description: 'Hymns, scripture, tributes, a sermon and the committal.',
    startTime: '11:00',
    plan: [
      ['Welcome', [['Opening hymn', 5], ['Welcome', 3]]],
      ['Scripture reading', [['Readings', 6]]],
      ['Tributes', [['Tributes', 20]]],
      ['Worship', [['Hymn', 5]]],
      ['Word', [['Sermon', 20]]],
      ['Prayer', [['Prayers', 5]]],
      ['Closing', [['Committal and benediction', 5]]],
    ],
  },
];

/** A new service from a starter order, on the date given. Item lengths become their (switched-off) timers. */
export function serviceFromStarter(s: StarterService, date: Date): Service {
  const stamp = Date.now().toString(36);
  let n = 0;
  const sections: ServiceSection[] = s.plan.map(([section, items], i) => ({
    id: `${stamp}-s${i}`,
    name: section,
    subsections: items.map(([name, minutes]) => ({
      id: `${stamp}-i${n++}`,
      name,
      slides: [],
      countdown: { enabled: false, durationMinutes: minutes, displayTargets: ['confidence'], alertEnabled: false },
    })),
  }));
  return { id: `${Date.now()}`, name: s.name, date, startTime: s.startTime, sections, isTemplate: false };
}

// ---- Stage (confidence) monitor layouts ------------------------------------------

export const STAGE_PRESETS: { id: string; name: string; description: string; settings: ConfidenceSettings }[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'The verse, what comes next and the clock.',
    settings: { currentVerseFontSize: 60, nextVerseFontSize: 24, clockFontSize: 36, backgroundColor: '#000000', textColor: '#FFFFFF', accentColor: '#3B82F6', clockFormat: '12h', nextVerseCount: 1 },
  },
  {
    id: 'large',
    name: 'Large words',
    description: 'For a stage TV far from the pulpit: the verse as big as possible.',
    settings: { currentVerseFontSize: 88, nextVerseFontSize: 28, clockFontSize: 32, backgroundColor: '#000000', textColor: '#FFFFFF', accentColor: '#F5C451', clockFormat: '12h', nextVerseCount: 1 },
  },
  {
    id: 'preacher',
    name: 'Preacher',
    description: 'A big clock and the countdown, with the verse underneath.',
    settings: { currentVerseFontSize: 52, nextVerseFontSize: 24, clockFontSize: 72, backgroundColor: '#0B0D12', textColor: '#FFFFFF', accentColor: '#F59E0B', clockFormat: '12h', nextVerseCount: 1 },
  },
  {
    id: 'singers',
    name: 'Singers',
    description: 'More of what comes next, so the band sees the following lines.',
    settings: { currentVerseFontSize: 64, nextVerseFontSize: 34, clockFontSize: 28, backgroundColor: '#000000', textColor: '#FFFFFF', accentColor: '#22C55E', clockFormat: '12h', nextVerseCount: 2 },
  },
  {
    id: 'contrast',
    name: 'High contrast',
    description: 'Yellow and white on black, for bright stages and older eyes.',
    settings: { currentVerseFontSize: 72, nextVerseFontSize: 28, clockFontSize: 40, backgroundColor: '#000000', textColor: '#FFFFFF', accentColor: '#FFD60A', clockFormat: '24h', nextVerseCount: 1 },
  },
];

// ---- Countdowns ------------------------------------------------------------------

export interface CountdownPreset {
  id: string;
  name: string;
  mode: 'duration' | 'until';
  minutes?: number;
  until?: string;
  message: string;
  projector: 'full' | 'corner' | 'off';
  confidence: boolean;
  stream: boolean;
}

export const COUNTDOWN_PRESETS: CountdownPreset[] = [
  { id: 'before', name: 'Before the service', mode: 'duration', minutes: 5, message: 'Service begins in', projector: 'full', confidence: true, stream: true },
  { id: 'until', name: 'Until the service starts', mode: 'until', until: '10:00', message: 'Welcome. We begin in', projector: 'full', confidence: true, stream: true },
  { id: 'sermon', name: 'Sermon timer (stage only)', mode: 'duration', minutes: 35, message: 'Time left', projector: 'off', confidence: true, stream: false },
  { id: 'speaker', name: 'Speaker, 5 minutes (stage only)', mode: 'duration', minutes: 5, message: 'Time left', projector: 'off', confidence: true, stream: false },
  { id: 'offering', name: 'Offering', mode: 'duration', minutes: 3, message: 'Giving', projector: 'corner', confidence: true, stream: false },
  { id: 'break', name: 'Break', mode: 'duration', minutes: 10, message: 'We continue in', projector: 'full', confidence: true, stream: true },
];
