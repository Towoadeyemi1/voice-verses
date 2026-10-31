import type { SyncMessage } from '@/lib/syncService';
import type { Countdown } from '@/lib/countdown';
import type { Assignments, Template } from '@/lib/templates';

declare global {
  interface Window {
    __VOICE_VERSES_NETWORK__?: boolean;
  }
}

/** This page was opened from another computer through network outputs (electron/network.js). */
export const isNetworkViewer = typeof window !== 'undefined' && window.__VOICE_VERSES_NETWORK__ === true;

/** What the operator's computer sends to network viewers. */
export interface NetworkSnapshot {
  live: SyncMessage | null;
  countdown: Countdown | null;
  templates: Template[];
  assignments: Assignments;
  logo: string;
  bibleVersion: string;
}

/** Where a viewer loads a picture or video from. */
export const networkMediaUrl = (id: string) => `/media/${encodeURIComponent(id)}`;
