/**
 * Every event Voice Verses' modules send on the event bus (1.19.4, D33), and what each carries.
 * Names are short here ("live.changed"); on the wire they are CloudEvents types,
 * "org.voiceverses.live.changed.v1". A change that would break a subscriber gets a new
 * version (v2) beside the old one, never an edit of it.
 *
 * Data carries plain values only (no pictures, no keys), so an event can safely leave the
 * app through the local API (step 2.2).
 */

export interface LiveVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

/** A slide, as much as a subscriber needs (never its pictures) */
export interface LiveSlide {
  id: string;
  type: string;
  title?: string;
  songTitle?: string;
  sectionLabel?: string;
  /** The words on it */
  content?: string;
}

export interface EventMap {
  /** What the screens show changed: a verse, a slide, the logo, or nothing */
  'live.changed': {
    kind: 'verse' | 'slide' | 'logo' | 'clear';
    reference?: string;
    translation?: string;
    text?: string;
    verse?: LiveVerse;
    slide?: LiveSlide;
  };
  /** What waits in Next changed */
  'next.changed': { kind: 'verse' | 'slide' | 'none'; reference?: string; title?: string };
  /** Countdowns running on the screens */
  'countdown.changed': { running: number };
  /** Alerts on the screens */
  'alert.changed': { count: number; text?: string };
  'listening.started': { engine: string };
  'listening.stopped': Record<string, never>;
  /** A finished sentence heard from the preacher (never sound) */
  'speech.heard': { text: string };
  /** Detection found a verse; it went to the screens (send mode Auto) or waits in Next */
  'verse.found': { reference: string; went: 'screens' | 'next' };
  /** A verse, song or part offered for the operator to choose */
  'suggestion.offered': { kind: string; reference?: string; title?: string; score?: number };
  'service.updated': { id: string; name: string; date: string; type?: string; template: boolean };
  'service.deleted': { id: string };
  'media.updated': { id: string; kind: string; name: string };
  'media.deleted': { id: string };
  /** The translation on the screens changed */
  'bible.changed': { translation: string; label: string };
  /** A module started and told the registry what it does */
  'module.registered': { id: string; name: string; version: string };
}

export type EventName = keyof EventMap;

export const EVENT_TYPE_PREFIX = 'org.voiceverses.';
export const EVENT_VERSION = 'v1';

/** "live.changed" → "org.voiceverses.live.changed.v1" */
export const cloudType = (name: EventName) => `${EVENT_TYPE_PREFIX}${name}.${EVENT_VERSION}`;
