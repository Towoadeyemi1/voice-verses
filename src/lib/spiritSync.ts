/**
 * What Voice Verses spirit learns, shared by the church's computers through the
 * library folder (spirit/learned.json, synced by iCloud Drive, Dropbox, OneDrive
 * or Google Drive). Desktop app only. Each computer merges what it finds there
 * with its own: per cue the newer change wins, and what was seen is added together.
 */
import { desktop } from '@/lib/desktop';
import { loadSpirit, normalizeSpirit, saveSpirit, SPIRIT_CHANGED, SpiritState } from '@/lib/spirit';

const FILE = 'spirit/learned.json';

/** Two computers' spirit, merged: cues by newest change, observations, events and words heard together. */
export function mergeSpirit(a: SpiritState, b: SpiritState): SpiritState {
  const cues = new Map(a.cues.map((c) => [c.id, c]));
  for (const c of b.cues) {
    const mine = cues.get(c.id);
    if (!mine || Date.parse(c.updatedAt) > Date.parse(mine.updatedAt)) cues.set(c.id, c);
  }
  const unique = <T,>(items: T[], key: (t: T) => string) => [...new Map(items.map((t) => [key(t), t])).values()];
  const byTime = <T extends { at: string }>(items: T[]) => [...items].sort((x, y) => Date.parse(x.at) - Date.parse(y.at));
  const newer = Date.parse(b.updatedAt) > Date.parse(a.updatedAt) ? b : a;
  return normalizeSpirit({
    level: newer.level,
    cues: [...cues.values()],
    observations: byTime(unique([...a.observations, ...b.observations], (o) => o.id)),
    dismissed: [...new Set([...a.dismissed, ...b.dismissed])],
    events: byTime(unique([...a.events, ...b.events], (e) => `${e.at}|${e.kind}|${e.cueId ?? ''}`)),
    heard: byTime(unique([...a.heard, ...b.heard], (h) => `${h.at}|${h.text}`)),
    updatedAt: newer.updatedAt,
  });
}

let started = false;
let writing: number | undefined;
/** What is in the file now, without its save time: nothing is written back unless it differs (no ping-pong between computers) */
let inFile = '';
const content = (s: SpiritState) => JSON.stringify({ ...s, updatedAt: undefined });

async function pull(): Promise<void> {
  const lib = desktop?.library;
  if (!lib || !(await lib.getFolder())) return;
  const text = await lib.read(FILE).catch(() => null);
  if (!text) return;
  try {
    const theirs = normalizeSpirit(JSON.parse(text));
    inFile = content(theirs);
    const mine = loadSpirit();
    const merged = mergeSpirit(mine, theirs);
    if (content(merged) !== content(mine)) saveSpirit(merged);
  } catch {
    // A half-synced file: tried again on the next change
  }
}

function push(): void {
  window.clearTimeout(writing);
  writing = window.setTimeout(async () => {
    const lib = desktop?.library;
    if (!lib || !(await lib.getFolder())) return;
    const state = loadSpirit();
    if (content(state) === inFile) return;
    inFile = content(state);
    await lib.write(FILE, JSON.stringify(state)).catch(() => {});
  }, 5000);
}

/** Starts sharing spirit through the library folder (once per window; does nothing without one). */
export function startSpiritSync(): void {
  if (started || !desktop?.library) return;
  started = true;
  void pull().then(push);
  window.addEventListener(SPIRIT_CHANGED, push);
  desktop.library.onChange(() => void pull());
}
