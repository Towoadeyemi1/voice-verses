/**
 * VoiceVerses Spirit: the autopilot that learns how a church runs its service
 * (docs/design/spirit.html, D29).
 *
 * - Spoken cues get a part of the service, or a sermon point, ready. Built-in
 *   ones come with the app; a church teaches its own, or accepts what Spirit noticed.
 * - Every cue climbs a trust ladder: Learning (only watches) → Ready in Next
 *   (the operator Takes) → Hands-free (goes live after a countdown that can be
 *   stopped). Hands-free unlocks after 10 right in a row, and only when chosen;
 *   a correction sends it back to Ready in Next.
 * - Spirit learns by watching: words said just before the operator went to a part,
 *   on two or more occasions, become a suggestion.
 *
 * Saved in localStorage (every window shares it) and, with a library folder, in
 * spirit/learned.json so the church's computers learn together (lib/spiritSync.ts).
 * Pure functions take and return state, so they can be checked without a browser.
 */
import { BUILTIN_MOMENT_CUES, BUILTIN_POINT_CUES, MomentKind, noticePatterns, SpokenCue } from '@/speech/momentCues';

export type SpiritLevel = 'off' | 'next' | 'handsfree';
export type CueLevel = 'learning' | 'next' | 'handsfree';
export type Outcome = 'right' | 'wrong';
export type Correction = 'wrong-part' | 'not-now' | 'never';

export interface Cue extends SpokenCue {
  source: 'builtin' | 'taught' | 'noticed';
  level: CueLevel;
  /** The last 10 outcomes, oldest first */
  record: Outcome[];
  /** Right in a row (Hands-free unlocks at HANDS_FREE_AFTER) */
  streak: number;
  /** The last correction, in words, e.g. "not now, during a song" */
  note?: string;
  updatedAt: string;
}

/** What was said just before the operator went to a part (to learn by watching) */
export interface Observation {
  id: string;
  at: string;
  part: string;
  sentences: string[];
}

export interface SpiritEvent {
  at: string;
  kind: 'ready' | 'right' | 'wrong' | 'manual';
  cueId?: string;
}

export interface SpiritState {
  level: SpiritLevel;
  cues: Cue[];
  observations: Observation[];
  /** Suggestions the church said were not cues ("phrase|part") */
  dismissed: string[];
  events: SpiritEvent[];
  /** Words heard, kept 7 days, to pick a cue from */
  heard: { at: string; text: string }[];
  updatedAt: string;
}

export const HANDS_FREE_AFTER = 10;
export const HEARD_DAYS = 7;
const RECORD = 10;
const KEY = 'voice-verses-spirit';
export const SPIRIT_CHANGED = 'voice-verses-spirit-changed';

const now = () => new Date().toISOString();
const builtinCue = (c: SpokenCue): Cue => ({ ...c, source: 'builtin', level: 'next', record: [], streak: 0, updatedAt: '1970-01-01T00:00:00.000Z' });

/** A new church starts with every built-in cue, at Ready in Next. */
export const emptySpirit = (): SpiritState => ({
  level: 'next',
  cues: [...BUILTIN_MOMENT_CUES, ...BUILTIN_POINT_CUES.map(({ pattern: _p, ...c }) => c)].map(builtinCue),
  observations: [],
  dismissed: [],
  events: [],
  heard: [],
  updatedAt: now(),
});

/** Built-in cues added in a later version join a saved state; old heard words are let go. */
export function normalizeSpirit(saved: Partial<SpiritState> | null): SpiritState {
  const base = emptySpirit();
  if (!saved) return base;
  const cues = Array.isArray(saved.cues) ? saved.cues.filter((c) => c && typeof c.id === 'string' && typeof c.phrase === 'string') : [];
  const have = new Set(cues.map((c) => c.id));
  const cutoff = Date.now() - HEARD_DAYS * 86_400_000;
  return {
    level: saved.level === 'off' || saved.level === 'handsfree' ? saved.level : 'next',
    cues: [...cues, ...base.cues.filter((c) => !have.has(c.id))],
    observations: (saved.observations ?? []).slice(-300),
    dismissed: saved.dismissed ?? [],
    events: (saved.events ?? []).filter((e) => Date.parse(e.at) > Date.now() - 120 * 86_400_000).slice(-3000),
    heard: (saved.heard ?? []).filter((h) => Date.parse(h.at) > cutoff).slice(-3000),
    updatedAt: saved.updatedAt ?? now(),
  };
}

export function loadSpirit(): SpiritState {
  try {
    return normalizeSpirit(JSON.parse(localStorage.getItem(KEY) || 'null'));
  } catch {
    return emptySpirit();
  }
}

export function saveSpirit(state: SpiritState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: now() }));
  } catch {
    // Still applies until the app closes
  }
  window.dispatchEvent(new Event(SPIRIT_CHANGED));
}

/** Changes the saved state with a pure function, and tells every window. */
export function updateSpirit(change: (state: SpiritState) => SpiritState): SpiritState {
  const next = change(loadSpirit());
  saveSpirit(next);
  return next;
}

// ---- Cues ---------------------------------------------------------------------------------

const touch = (c: Cue, changes: Partial<Cue>): Cue => ({ ...c, ...changes, updatedAt: now() });
const mapCue = (state: SpiritState, id: string, f: (c: Cue) => Cue | null): SpiritState => ({
  ...state,
  cues: state.cues.flatMap((c) => (c.id === id ? [f(c)].filter((x): x is Cue => !!x) : [c])),
});

/** Teaches a cue: "When the preacher says ___ get ___ ready". A part by name, a kind of moment, or a sermon point. */
export function teachCue(state: SpiritState, phrase: string, target: { part?: string; moment?: MomentKind; point?: boolean }, source: Cue['source'] = 'taught'): SpiritState {
  const words = phrase.replace(/\s+/g, ' ').trim();
  if (words.split(' ').length < 2) return state;
  const id = `${source}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 6)}`;
  const cue: Cue = { id, phrase: words, ...target, source, level: 'next', record: [], streak: 0, updatedAt: now() };
  return { ...state, cues: [...state.cues.filter((c) => !(c.phrase.toLowerCase() === words.toLowerCase() && c.part === target.part && c.moment === target.moment && !!c.point === !!target.point)), cue] };
}

export const removeCue = (state: SpiritState, id: string): SpiritState =>
  id.startsWith('builtin:') ? mapCue(state, id, (c) => touch(c, { off: true })) : { ...state, cues: state.cues.filter((c) => c.id !== id) };

export const switchCue = (state: SpiritState, id: string, on: boolean): SpiritState => mapCue(state, id, (c) => touch(c, { off: !on }));

/** Hands-free only once earned; a lower level any time. */
export const canBeHandsFree = (c: Cue) => c.streak >= HANDS_FREE_AFTER;
export const setCueLevel = (state: SpiritState, id: string, level: CueLevel): SpiritState =>
  mapCue(state, id, (c) => (level === 'handsfree' && !canBeHandsFree(c) ? c : touch(c, { level })));

/** What the operator did with what Spirit got ready: Take (right) or a correction (wrong, and why). */
export function recordOutcome(state: SpiritState, id: string, outcome: Outcome, why?: { correction?: Correction; singing?: boolean }): SpiritState {
  let next = mapCue(state, id, (c) => {
    const record = [...c.record, outcome].slice(-RECORD);
    if (outcome === 'right') return touch(c, { record, streak: c.streak + 1 });
    const changes: Partial<Cue> = { record, streak: 0, level: c.level === 'handsfree' ? 'next' : c.level };
    if (why?.correction === 'not-now' && why.singing) Object.assign(changes, { notDuringSongs: true, note: 'not now, during a song' });
    else if (why?.correction === 'not-now') changes.note = 'not now';
    else if (why?.correction === 'wrong-part') changes.note = 'wrong part';
    if (why?.correction === 'never') return c.id.startsWith('builtin:') ? touch(c, { ...changes, off: true, note: 'never for these words' }) : null;
    return touch(c, changes);
  });
  next = { ...next, events: [...next.events, { at: now(), kind: outcome as SpiritEvent['kind'], cueId: id }].slice(-3000) };
  return next;
}

export const recordReady = (state: SpiritState, cueId?: string): SpiritState => ({ ...state, events: [...state.events, { at: now(), kind: 'ready' as const, cueId }].slice(-3000) });

/** The church's cues for the listening engine (plain data). */
export const cuesForListening = (state: SpiritState): SpokenCue[] =>
  state.cues.map(({ id, phrase, moment, part, point, off, notDuringSongs }) => ({ id, phrase, moment, part, point, off, notDuringSongs }));

// ---- Learning by watching -----------------------------------------------------------------

/** Remembers a finished sentence (7 days, on this computer and the library folder). */
export const hear = (state: SpiritState, text: string): SpiritState => ({ ...state, heard: [...state.heard, { at: now(), text }].slice(-3000) });

/** The operator went to a part themselves: the last few sentences said (within 15 s) are kept to learn from. */
export function observe(state: SpiritState, part: string, at = Date.now()): SpiritState {
  const sentences = state.heard.filter((h) => at - Date.parse(h.at) <= 15_000).slice(-3).map((h) => h.text);
  const events = [...state.events, { at: new Date(at).toISOString(), kind: 'manual' as const }].slice(-3000);
  if (!sentences.length) return { ...state, events };
  const id = `obs:${at.toString(36)}`;
  return { ...state, events, observations: [...state.observations, { id, at: new Date(at).toISOString(), part, sentences }].slice(-300) };
}

/** What Spirit noticed and hasn't asked about yet (not already a cue, not dismissed). */
export function noticed(state: SpiritState): { phrase: string; part: string; times: number }[] {
  const known = new Set(state.cues.map((c) => c.phrase.toLowerCase()));
  const dismissed = new Set(state.dismissed);
  return noticePatterns(state.observations).filter((n) => !known.has(n.phrase) && !dismissed.has(`${n.phrase}|${n.part}`)).slice(0, 6);
}

export const dismissNoticed = (state: SpiritState, phrase: string, part: string): SpiritState => ({ ...state, dismissed: [...state.dismissed, `${phrase}|${part}`] });

// ---- How it went --------------------------------------------------------------------------

/** The last service day's numbers: got ready, taken as they were, corrected; and the order things happened in. */
export function lastService(state: SpiritState): { day: string | null; ready: number; right: number; wrong: number; manual: number; runs: SpiritEvent['kind'][] } {
  const days = [...new Set(state.events.map((e) => e.at.slice(0, 10)))].sort();
  const day = days[days.length - 1] ?? null;
  const events = state.events.filter((e) => e.at.slice(0, 10) === day);
  const count = (k: SpiritEvent['kind']) => events.filter((e) => e.kind === k).length;
  return { day, ready: count('ready'), right: count('right'), wrong: count('wrong'), manual: count('manual'), runs: events.filter((e) => e.kind !== 'ready').map((e) => e.kind) };
}

/** How often a set of cues was right, over their last outcomes. */
export function accuracy(cues: Cue[]): { right: number; total: number } {
  const all = cues.flatMap((c) => c.record);
  return { right: all.filter((o) => o === 'right').length, total: all.length };
}
