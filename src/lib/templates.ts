/**
 * Templates: how text looks on each output (font, size, colour, position,
 * background, logo). The operator assigns a template to each kind of content on
 * each output, e.g. scripture on the projector, songs on the projector, and
 * everything on the stream lower third. A slide can use a different template.
 *
 * Saved in localStorage so every output window (which shares it) updates the
 * moment a template changes.
 */

export type ContentKind = 'scripture' | 'lyrics' | 'announcement';
export type Output = 'projection' | 'stream';

export const CONTENT_KINDS: { id: ContentKind; label: string }[] = [
  { id: 'scripture', label: 'Scripture' },
  { id: 'lyrics', label: 'Songs' },
  { id: 'announcement', label: 'Announcements' },
];

export const OUTPUTS: { id: Output; label: string; description: string }[] = [
  { id: 'projection', label: 'Projector', description: 'The main screen in the room' },
  { id: 'stream', label: 'Lower third / stream', description: 'The lower-third window, for keying over the camera' },
];

export interface Template {
  id: string;
  name: string;
  background: {
    type: 'color' | 'image' | 'video';
    color: string;
    /** Picture or video from the media library */
    mediaId?: string;
    /** Darkens the picture or video so text stays readable, 0–1 */
    dim: number;
  };
  /** Where the text goes, in % of the screen */
  area: { x: number; y: number; width: number; height: number };
  /** Panel behind the text (e.g. a lower-third bar) */
  panel: { show: boolean; color: string; opacity: number; radius: number };
  text: {
    fontFamily: string;
    /** Largest size in px on a 1920×1080 screen; long passages shrink to fit */
    fontSize: number;
    fontWeight: 400 | 600 | 700 | 800;
    color: string;
    align: 'left' | 'center' | 'right';
    verticalAlign: 'top' | 'middle' | 'bottom';
    lineHeight: number;
    uppercase: boolean;
    shadow: boolean;
    /** Outline width in px, 0 for none */
    outline: number;
  };
  /** The reference ("John 3:16 KJV"), song title or announcement title */
  label: {
    show: boolean;
    position: 'above' | 'below';
    fontSize: number;
    color: string;
    includeVersion: boolean;
  };
  logo: { show: boolean; position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'; size: number };
}

export type Assignments = Record<Output, Record<ContentKind, string>>;

export const FONTS: { label: string; value: string }[] = [
  { label: 'Georgia', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Times', value: "'Times New Roman', Times, serif" },
  { label: 'Palatino', value: "Palatino, 'Palatino Linotype', 'Book Antiqua', serif" },
  { label: 'Baskerville', value: "Baskerville, 'Baskerville Old Face', Georgia, serif" },
  { label: 'Helvetica / Arial', value: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
  { label: 'Avenir / Segoe UI', value: "'Avenir Next', Avenir, 'Segoe UI', sans-serif" },
  { label: 'Futura / Century Gothic', value: "Futura, 'Century Gothic', 'Trebuchet MS', sans-serif" },
  { label: 'Gill Sans', value: "'Gill Sans', 'Gill Sans MT', Calibri, sans-serif" },
  { label: 'Optima', value: "Optima, Candara, 'Segoe UI', sans-serif" },
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Impact', value: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif" },
];

const base: Omit<Template, 'id' | 'name'> = {
  background: { type: 'color', color: '#000000', dim: 0.4 },
  area: { x: 6, y: 8, width: 88, height: 80 },
  panel: { show: false, color: '#000000', opacity: 0.7, radius: 12 },
  text: {
    fontFamily: FONTS[0].value,
    fontSize: 84,
    fontWeight: 400,
    color: '#ffffff',
    align: 'center',
    verticalAlign: 'middle',
    lineHeight: 1.35,
    uppercase: false,
    shadow: true,
    outline: 0,
  },
  label: { show: true, position: 'below', fontSize: 46, color: '#f5c451', includeVersion: true },
  logo: { show: false, position: 'bottom-right', size: 8 },
};

/** Templates every church starts with; they can be edited, and reset. */
export const BUILT_IN_TEMPLATES: Template[] = [
  { ...base, id: 'scripture-full', name: 'Scripture – full screen' },
  {
    ...base,
    id: 'scripture-lower',
    name: 'Scripture – lower part',
    area: { x: 5, y: 58, width: 90, height: 36 },
    panel: { show: true, color: '#000000', opacity: 0.72, radius: 16 },
    text: { ...base.text, fontSize: 56, align: 'left', verticalAlign: 'bottom', lineHeight: 1.3 },
    label: { ...base.label, position: 'above', fontSize: 36 },
  },
  {
    ...base,
    id: 'lyrics-center',
    name: 'Songs – centred',
    text: { ...base.text, fontFamily: FONTS[4].value, fontSize: 88, fontWeight: 700, lineHeight: 1.3 },
    label: { ...base.label, show: false, fontSize: 32, color: '#d1d5db' },
  },
  {
    ...base,
    id: 'announcement',
    name: 'Announcements',
    text: { ...base.text, fontFamily: FONTS[4].value, fontSize: 64 },
    label: { ...base.label, position: 'above', fontSize: 72, color: '#ffffff', includeVersion: false },
  },
  {
    ...base,
    id: 'stream-lower-third',
    name: 'Stream – lower third (green)',
    background: { type: 'color', color: '#00ff00', dim: 0 },
    area: { x: 8, y: 70, width: 84, height: 25 },
    panel: { show: true, color: '#000000', opacity: 0.78, radius: 14 },
    text: { ...base.text, fontSize: 46, align: 'left', verticalAlign: 'bottom', shadow: false, lineHeight: 1.3 },
    label: { ...base.label, position: 'below', fontSize: 30 },
  },
];

export const DEFAULT_ASSIGNMENTS: Assignments = {
  projection: { scripture: 'scripture-full', lyrics: 'lyrics-center', announcement: 'announcement' },
  stream: { scripture: 'stream-lower-third', lyrics: 'stream-lower-third', announcement: 'stream-lower-third' },
};

const TEMPLATES_KEY = 'voice-verses-templates';
const ASSIGNMENTS_KEY = 'voice-verses-template-assignments';
export const TEMPLATES_CHANGED = 'voice-verses-templates-changed';

function read<T>(key: string): T | null {
  try {
    const saved = localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : null;
  } catch {
    return null;
  }
}

/** Fills in fields added in later versions. */
function complete(t: Partial<Template> & { id: string; name: string }): Template {
  const defaults = BUILT_IN_TEMPLATES.find((b) => b.id === t.id) ?? BUILT_IN_TEMPLATES[0];
  return {
    ...defaults,
    ...t,
    background: { ...defaults.background, ...t.background },
    area: { ...defaults.area, ...t.area },
    panel: { ...defaults.panel, ...t.panel },
    text: { ...defaults.text, ...t.text },
    label: { ...defaults.label, ...t.label },
    logo: { ...defaults.logo, ...t.logo },
  };
}

/** The projection settings of earlier versions become the scripture template. */
function fromEarlierSettings(): Template[] {
  const old = read<{ backgroundColor?: string; textColor?: string; accentColor?: string; fontSize?: number; fontFamily?: string; showReference?: boolean; textAlign?: 'left' | 'center' | 'right' }>(
    'cornerstone-projection-settings',
  );
  if (!old) return BUILT_IN_TEMPLATES;
  return BUILT_IN_TEMPLATES.map((t) =>
    t.id !== 'scripture-full'
      ? t
      : complete({
          ...t,
          background: { ...t.background, color: old.backgroundColor ?? t.background.color },
          text: {
            ...t.text,
            color: old.textColor ?? t.text.color,
            align: old.textAlign ?? t.text.align,
            fontFamily: old.fontFamily === 'serif' || !old.fontFamily ? t.text.fontFamily : old.fontFamily,
          },
          label: { ...t.label, show: old.showReference ?? t.label.show },
        }),
  );
}

export function loadTemplates(): Template[] {
  const saved = read<Template[]>(TEMPLATES_KEY);
  return saved?.length ? saved.map(complete) : fromEarlierSettings();
}

export function loadAssignments(): Assignments {
  const saved = read<Partial<Assignments>>(ASSIGNMENTS_KEY) ?? {};
  return {
    projection: { ...DEFAULT_ASSIGNMENTS.projection, ...saved.projection },
    stream: { ...DEFAULT_ASSIGNMENTS.stream, ...saved.stream },
  };
}

function notify() {
  window.dispatchEvent(new Event(TEMPLATES_CHANGED));
}

export function saveTemplates(templates: Template[]): void {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates));
  notify();
}

export function saveAssignments(assignments: Assignments): void {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
  notify();
}

/** The template to use for this content on this output (a slide's own choice first). */
export function templateFor(
  templates: Template[],
  assignments: Assignments,
  output: Output,
  kind: ContentKind,
  slideTemplateId?: string,
): Template {
  const byId = (id?: string) => (id ? templates.find((t) => t.id === id) : undefined);
  return (
    (output === 'projection' ? byId(slideTemplateId) : undefined) ??
    byId(assignments[output][kind]) ??
    byId(DEFAULT_ASSIGNMENTS[output][kind]) ??
    templates[0] ??
    BUILT_IN_TEMPLATES[0]
  );
}

export function newTemplateId(): string {
  return `template-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
