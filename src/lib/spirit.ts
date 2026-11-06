/**
 * spirit: the autopilot that learns how a church runs its service
 * (docs/design/spirit.html, D29).
 *
 * - Spoken cues get a part of the service, or a sermon point, ready. Built-in
 *   ones come with the app; a church teaches its own, or accepts what spirit noticed.
 * - Every cue climbs a trust ladder: Learning (only watches) → Ready in Next
 *   (the operator Takes) → Hands-free (goes live after a countdown that can be
 *   stopped). Hands-free unlocks after 10 right in a row, and only when chosen;
 *   a correction sends it back to Ready in Next.
 * - spirit learns by watching: words said just before the operator went to a part,
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
  /** Only for these types of service (1.18.0); none = every type */
  types?: string[];
  updatedAt: string;
}

/**
 * The moves spirit can make besides spoken cues (1.18.0), each on its own
 * trust ladder. `works`: spirit makes it now; the rest come with 1.19.0.
 */
export type MoveKind = 'countdown-end' | 'next-song' | 'time-up' | 'start' | 'end' | 'clear-after-reading' | 'logo-between';
export const MOVES: { id: MoveKind; title: string; desc: string; group: string; works: boolean; handsFree: boolean }[] = [
  { id: 'start', title: 'Get the service ready', desc: 'Load today’s service, start its countdown and start listening, before it begins', group: 'Before and after the service', works: false, handsFree: false },
  { id: 'countdown-end', title: 'The countdown into the next part', desc: 'When a part’s countdown reaches zero, the part after it', group: 'Before and after the service', works: true, handsFree: true },
  { id: 'end', title: 'The end of the service', desc: 'After the benediction: the logo on every screen', group: 'Before and after the service', works: false, handsFree: false },
  { id: 'next-song', title: 'The next song', desc: 'When the last slide of a song goes up, the next song in the plan waits in Next', group: 'Songs', works: true, handsFree: false },
  { id: 'time-up', title: 'Move on when a part’s time is up', desc: 'Only between sentences, never during a verse or a song', group: 'The order of service', works: false, handsFree: false },
  { id: 'clear-after-reading', title: 'Clear after a reading', desc: 'When the reader finishes and the preacher moves on', group: 'On the screens', works: false, handsFree: false },
  { id: 'logo-between', title: 'The logo between parts', desc: 'Your habit, learned from what you do', group: 'On the screens', works: false, handsFree: false },
];

export interface MoveTrust {
  level: CueLevel;
  record: Outcome[];
  streak: number;
  updatedAt: string;
}

/** Where something happened: which service, of which type, and what it was (for How it went) */
export interface SpiritContext {
  serviceId?: string;
  type?: string;
  what?: string;
}

/** What was said just before the operator went to a part (to learn by watching) */
export interface Observation {
  id: string;
  at: string;
  part: string;
  sentences: string[];
  /** The type of service (1.18.0) */
  type?: string;
}

export interface SpiritEvent {
  at: string;
  kind: 'ready' | 'right' | 'wrong' | 'manual';
  cueId?: string;
  /** A move rather than a spoken cue (1.18.0) */
  move?: MoveKind;
  serviceId?: string;
  type?: string;
  /** What it was, e.g. "Offering" or "Point 2" */
  what?: string;
  /** For a correction: why, in words */
  note?: string;
  /** For a correction: the cue or move as it was, so "Just this once" can put it back */
  undo?: { cue?: Cue; move?: MoveTrust };
  /** "Just this once": the correction no longer counts */
  forgiven?: boolean;
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
  /** How far each move is trusted (1.18.0) */
  moves: Partial<Record<MoveKind, MoveTrust>>;
  /** How long each part ran, per type of service (1.18.0; spirit's timings in 1.19.0) */
  timings: { at: string; type: string; part: string; minutes: number }[];
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
  moves: {},
  timings: [],
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
    moves: saved.moves && typeof saved.moves === 'object' ? saved.moves : {},
    timings: (saved.timings ?? []).slice(-500),
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

/** What the operator did with what spirit got ready: Take (right) or a correction (wrong, and why). */
export function recordOutcome(state: SpiritState, id: string, outcome: Outcome, why?: { correction?: Correction; singing?: boolean }, ctx: SpiritContext = {}): SpiritState {
  const before = state.cues.find((c) => c.id === id);
  let note: string | undefined;
  let next = mapCue(state, id, (c) => {
    const record = [...c.record, outcome].slice(-RECORD);
    if (outcome === 'right') return touch(c, { record, streak: c.streak + 1 });
    const changes: Partial<Cue> = { record, streak: 0, level: c.level === 'handsfree' ? 'next' : c.level };
    if (why?.correction === 'not-now' && why.singing) Object.assign(changes, { notDuringSongs: true, note: 'not now, during a song' });
    else if (why?.correction === 'not-now') changes.note = 'not now';
    else if (why?.correction === 'wrong-part') changes.note = 'wrong part';
    if (why?.correction === 'never') {
      note = 'never for these words';
      return c.id.startsWith('builtin:') ? touch(c, { ...changes, off: true, note }) : null;
    }
    note = changes.note ?? 'corrected';
    return touch(c, changes);
  });
  const event: SpiritEvent = { at: now(), kind: outcome, cueId: id, ...ctx, ...(outcome === 'wrong' ? { note, undo: before ? { cue: before } : undefined } : {}) };
  next = { ...next, events: [...next.events, event].slice(-3000) };
  return next;
}

// ---- Moves (1.18.0) -------------------------------------------------------------------------

const newTrust = (): MoveTrust => ({ level: 'next', record: [], streak: 0, updatedAt: '1970-01-01T00:00:00.000Z' });
export const moveTrust = (state: SpiritState, move: MoveKind): MoveTrust => state.moves[move] ?? newTrust();
export const moveCanBeHandsFree = (state: SpiritState, move: MoveKind) => !!MOVES.find((m) => m.id === move)?.handsFree && moveTrust(state, move).streak >= HANDS_FREE_AFTER;

export function setMoveLevel(state: SpiritState, move: MoveKind, level: CueLevel): SpiritState {
  if (level === 'handsfree' && !moveCanBeHandsFree(state, move)) return state;
  return { ...state, moves: { ...state.moves, [move]: { ...moveTrust(state, move), level, updatedAt: now() } } };
}

/** How a move went: taken as it was (right), or corrected (wrong, back to Ready in Next). */
export function recordMove(state: SpiritState, move: MoveKind, outcome: Outcome, ctx: SpiritContext = {}, note?: string): SpiritState {
  const t = moveTrust(state, move);
  const record = [...t.record, outcome].slice(-RECORD);
  const changed: MoveTrust =
    outcome === 'right' ? { ...t, record, streak: t.streak + 1, updatedAt: now() } : { ...t, record, streak: 0, level: t.level === 'handsfree' ? 'next' : t.level, updatedAt: now() };
  const event: SpiritEvent = { at: now(), kind: outcome, move, ...ctx, ...(outcome === 'wrong' ? { note: note ?? 'corrected', undo: { move: t } } : {}) };
  return { ...state, moves: { ...state.moves, [move]: changed }, events: [...state.events, event].slice(-3000) };
}

/** "Just this once": a correction stops counting, and the cue or move is as it was before it. */
export function forgive(state: SpiritState, at: string): SpiritState {
  const e = state.events.find((x) => x.at === at && x.kind === 'wrong' && !x.forgiven);
  if (!e) return state;
  let next = { ...state, events: state.events.map((x) => (x === e ? { ...x, forgiven: true } : x)) };
  if (e.undo?.cue) {
    const back = { ...e.undo.cue, updatedAt: now() };
    next = { ...next, cues: next.cues.some((c) => c.id === back.id) ? next.cues.map((c) => (c.id === back.id ? back : c)) : [...next.cues, back] };
  }
  if (e.move && e.undo?.move) next = { ...next, moves: { ...next.moves, [e.move]: { ...e.undo.move, updatedAt: now() } } };
  return next;
}

/** How long a part ran, for this type of service (parts under a minute, or over 3 hours, are not counted). */
export function recordTiming(state: SpiritState, type: string, part: string, minutes: number): SpiritState {
  if (!(minutes >= 1 && minutes <= 180)) return state;
  return { ...state, timings: [...state.timings, { at: now(), type, part, minutes: Math.round(minutes * 10) / 10 }].slice(-500) };
}

/** How far a move goes now, the same way. Pure: no storage read. */
export function moveModeIn(state: SpiritState, move: MoveKind, paused = false): 'off' | 'learning' | 'next' | 'handsfree' {
  if (state.level === 'off' || paused) return 'off';
  const t = moveTrust(state, move);
  if (t.level === 'learning') return 'learning';
  return t.level === 'handsfree' && state.level === 'handsfree' && moveCanBeHandsFree(state, move) ? 'handsfree' : 'next';
}

/** How long a part usually runs in this type of service (the middle of its last runs), if seen at least twice. */
export function usualMinutes(state: SpiritState, type: string, part: string): number | null {
  const runs = state.timings.filter((t) => t.type === type && t.part.toLowerCase() === part.toLowerCase()).slice(-8).map((t) => t.minutes).sort((a, b) => a - b);
  return runs.length >= 2 ? runs[Math.floor(runs.length / 2)] : null;
}

export const recordReady = (state: SpiritState, cueId?: string, ctx: SpiritContext & { move?: MoveKind } = {}): SpiritState => ({
  ...state,
  events: [...state.events, { at: now(), kind: 'ready' as const, cueId, ...ctx }].slice(-3000),
});

/** The church's cues for the listening engine (plain data); with a type, cues kept for other types are left out. */
export const cuesForListening = (state: SpiritState, type?: string): SpokenCue[] =>
  state.cues
    .filter((c) => !type || !c.types?.length || c.types.includes(type))
    .map(({ id, phrase, moment, part, point, off, notDuringSongs }) => ({ id, phrase, moment, part, point, off, notDuringSongs }));

/** A cue for every type of service, or only some. */
export const setCueTypes = (state: SpiritState, id: string, types: string[]): SpiritState => mapCue(state, id, (c) => touch(c, { types: types.length ? types : undefined }));

// ---- Learning by watching -----------------------------------------------------------------

/** Remembers a finished sentence (7 days, on this computer and the library folder). */
export const hear = (state: SpiritState, text: string): SpiritState => ({ ...state, heard: [...state.heard, { at: now(), text }].slice(-3000) });

/**
 * Sentences heard but not yet saved (1.18.2). Saving spirit rewrites all it
 * has learned, so while listening sentences are kept here and saved together
 * (every 20 s, when the operator moves on, and when listening stops) instead
 * of once per sentence, which slowed the live screen and with it the sound
 * going to the speech engine.
 */
let unsaved: { at: string; text: string }[] = [];
export const hearSoon = (text: string): void => {
  unsaved.push({ at: now(), text });
};
/** Saves the sentences heard since the last save (nothing to do: nothing is written). */
export function flushHeard(): void {
  if (!unsaved.length) return;
  const batch = unsaved;
  unsaved = [];
  updateSpirit((st) => ({ ...st, heard: [...st.heard, ...batch].slice(-3000) }));
}

/** How far a spoken cue goes now (Hands-free only when spirit and the cue both allow it). Pure: no storage read. */
export function cueModeIn(state: SpiritState, cueId: string | undefined, paused = false): 'off' | 'learning' | 'next' | 'handsfree' {
  if (state.level === 'off' || paused) return 'off';
  const c = state.cues.find((x) => x.id === cueId);
  if (!c) return 'next';
  if (c.level === 'learning') return 'learning';
  return c.level === 'handsfree' && state.level === 'handsfree' && canBeHandsFree(c) ? 'handsfree' : 'next';
}

/** The operator went to a part themselves: the last few sentences said (within 15 s) are kept to learn from. */
export function observe(state: SpiritState, part: string, at = Date.now(), ctx: SpiritContext = {}): SpiritState {
  const sentences = state.heard.filter((h) => at - Date.parse(h.at) <= 15_000).slice(-3).map((h) => h.text);
  const events = [...state.events, { at: new Date(at).toISOString(), kind: 'manual' as const, what: part, ...ctx }].slice(-3000);
  if (!sentences.length) return { ...state, events };
  const id = `obs:${at.toString(36)}`;
  return { ...state, events, observations: [...state.observations, { id, at: new Date(at).toISOString(), part, sentences, type: ctx.type }].slice(-300) };
}

/** What spirit noticed and hasn't asked about yet (not already a cue, not dismissed). */
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

/** How a service went (1.18.0): the latest service spirit was part of, or the one asked for. */
export interface ServiceSummary {
  serviceId: string | null;
  type: string | null;
  day: string | null;
  /** Moves spirit made and you took as they were */
  right: number;
  /** Moves you corrected */
  wrong: number;
  /** Moves you made yourself */
  manual: number;
  ready: number;
  runs: ('right' | 'wrong' | 'manual')[];
  corrections: SpiritEvent[];
  /** Cues and moves that have earned Hands-free and are not there yet */
  earned: { kind: 'cue' | 'move'; id: string; title: string }[];
}

export function serviceSummary(state: SpiritState, serviceId?: string): ServiceSummary {
  const acted = state.events.filter((e) => e.kind !== 'ready');
  const last = [...acted].reverse().find((e) => (serviceId ? e.serviceId === serviceId : true));
  const id = serviceId ?? last?.serviceId ?? null;
  const day = last ? last.at.slice(0, 10) : null;
  // Older events (1.17.0) have no service: the day stands in for it
  const mine = (e: SpiritEvent) => (id ? e.serviceId === id : !!day && e.at.slice(0, 10) === day);
  const events = state.events.filter(mine);
  const counted = events.filter((e) => e.kind !== 'ready' && !e.forgiven);
  const count = (k: SpiritEvent['kind']) => counted.filter((e) => e.kind === k).length;
  const earned = [
    ...state.cues.filter((c) => !c.off && c.level !== 'handsfree' && canBeHandsFree(c)).map((c) => ({ kind: 'cue' as const, id: c.id, title: `“${c.phrase}”` })),
    ...MOVES.filter((m) => m.handsFree && moveTrust(state, m.id).level !== 'handsfree' && moveCanBeHandsFree(state, m.id)).map((m) => ({ kind: 'move' as const, id: m.id, title: m.title })),
  ];
  return {
    serviceId: id,
    type: last?.type ?? null,
    day,
    right: count('right'),
    wrong: count('wrong'),
    manual: count('manual'),
    ready: events.filter((e) => e.kind === 'ready').length,
    runs: counted.map((e) => e.kind as 'right' | 'wrong' | 'manual'),
    corrections: events.filter((e) => e.kind === 'wrong'),
    earned,
  };
}

/** How often a set of cues was right, over their last outcomes. */
export function accuracy(cues: Cue[]): { right: number; total: number } {
  const all = cues.flatMap((c) => c.record);
  return { right: all.filter((o) => o === 'right').length, total: all.length };
}
