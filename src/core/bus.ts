/**
 * The event bus (1.19.4, D33): modules publish what happened; any module subscribes to what it
 * needs, by name or by a pattern ("live.*", "*"). Publishers don't know who listens.
 *
 * - Envelopes are CloudEvents 1.0, so the local API (step 2.2) can pass them on unchanged.
 * - In practice (lib/practice.ts) events are marked `practice` and stay in this window; a
 *   subscriber only receives them if it asks to (most act on the room, so they must not).
 * - Events reach the app's other windows through a BroadcastChannel.
 * - A subscriber that throws never stops the publisher or the other subscribers.
 */
import { practising } from '@/lib/practice';
import { cloudType, EventMap, EventName } from './events';

export interface BusEvent<N extends EventName = EventName> {
  specversion: '1.0';
  id: string;
  /** Which module sent it, e.g. "voiceverses://app/live" */
  source: string;
  /** "org.voiceverses.live.changed.v1" */
  type: string;
  /** The short name, "live.changed" */
  name: N;
  time: string;
  datacontenttype: 'application/json';
  data: EventMap[N];
  /** Sent while practising: nothing outside this window acts on it */
  practice?: true;
  /** Arrived from another window of the app */
  remote?: true;
}

export interface SubscribeOptions {
  /** Also receive events sent while practising (default: no) */
  includePractice?: boolean;
  /** Also receive events from the app's other windows (default: yes) */
  fromOtherWindows?: boolean;
}

type Handler = (event: BusEvent) => void;
interface Listener {
  pattern: string;
  fn: Handler;
  opts: SubscribeOptions;
}

const listeners = new Set<Listener>();
const RECENT = 200;
const recent: BusEvent[] = [];

let channel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  channel = new BroadcastChannel('voice-verses-bus');
  channel.onmessage = (e: MessageEvent<BusEvent>) => {
    if (e.data && typeof e.data.name === 'string') deliver({ ...e.data, remote: true });
  };
}

/** "*" matches everything; "live.*" every name starting "live."; otherwise the exact name. */
export function matches(pattern: string, name: string): boolean {
  if (pattern === '*') return true;
  if (pattern.endsWith('.*')) return name.startsWith(pattern.slice(0, -1));
  return pattern === name;
}

const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

function deliver(event: BusEvent) {
  for (const l of [...listeners]) {
    if (!matches(l.pattern, event.name)) continue;
    if (event.practice && !l.opts.includePractice) continue;
    if (event.remote && l.opts.fromOtherWindows === false) continue;
    try {
      l.fn(event);
    } catch (error) {
      console.error(`A subscriber to ${event.name} failed`, error);
    }
  }
}

/** Sends an event to every subscriber, here and in the app's other windows. */
export function publish<N extends EventName>(name: N, data: EventMap[N], source = 'app'): BusEvent<N> {
  const event: BusEvent<N> = {
    specversion: '1.0',
    id: newId(),
    source: `voiceverses://app/${source}`,
    type: cloudType(name),
    name,
    time: new Date().toISOString(),
    datacontenttype: 'application/json',
    data,
    ...(practising() ? { practice: true as const } : {}),
  };
  recent.push(event);
  if (recent.length > RECENT) recent.splice(0, recent.length - RECENT);
  deliver(event);
  // Practice stays in this window (D31)
  if (!event.practice) {
    try {
      channel?.postMessage(event);
    } catch {
      // A value that can't be copied: the other windows miss this one
    }
  }
  return event;
}

/** Calls `fn` for every event matching `pattern`; returns a function that stops it. */
export function subscribe(pattern: EventName | `${string}.*` | '*', fn: (event: BusEvent) => void, opts: SubscribeOptions = {}): () => void {
  const listener: Listener = { pattern, fn, opts };
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The last events sent in this window, oldest first (for the local API and for checking). */
export const recentEvents = (): BusEvent[] => recent.slice();
