import type { SyncMessage } from '@/lib/syncService';
import type { Countdown } from '@/lib/countdown';
import type { Assignments, Output, Template } from '@/lib/templates';
import type { ColorTeam } from '@/lib/colorTeams';
import type { ScreenShape } from '@/lib/screenShapes';

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
  /** The colour team in use, so team colours look the same everywhere */
  colorTeam?: ColorTeam;
  /** Screen shapes set on the operator's computer */
  shapes?: Partial<Record<Output, ScreenShape>>;
}

/** Where a viewer loads a picture or video from. */
export const networkMediaUrl = (id: string) => `/media/${encodeURIComponent(id)}`;
