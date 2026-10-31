import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';
import type { Countdown } from '@/lib/countdown';
import { isNetworkViewer, NetworkSnapshot } from '@/lib/networkView';
import { saveAssignments, saveTemplates } from '@/lib/templates';
import { BibleParser } from '@/lib/bibleParser';

export type SyncMessage = {
  type: 'VERSE_UPDATE' | 'STATUS_UPDATE' | 'SLIDE_UPDATE' | 'LOGO' | 'COUNTDOWN';
  data: {
    verse?: BibleVerse | null;
    timestamp?: Date;
    isListening?: boolean;
    transcript?: string;
    slide?: Slide | null;
    index?: number;
    slideIndex?: number;
    allSlides?: Slide[];
    /** The next few slides of the service, for the confidence monitor */
    upcoming?: Slide[];
    logoUrl?: string;
    /** The running countdown, or null when stopped */
    countdown?: Countdown | null;
  };
};

/** Message types that change what is on screen; the latest one is kept so windows can catch up. */
const LIVE_TYPES = new Set<SyncMessage['type']>(['VERSE_UPDATE', 'SLIDE_UPDATE', 'LOGO']);
const LIVE_KEY = 'voice-verses-live';
// A countdown runs alongside what is on screen, so it is kept separately
const COUNTDOWN_KEY = 'voice-verses-countdown';

/**
 * Keeps the operator window and the output windows (projection, confidence,
 * lower third, monitors) in step. Each window that opens or reloads starts
 * from current(), so a screen reopened mid-service shows what is live instead
 * of going blank.
 */
class SyncService {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<(message: SyncMessage) => void> = new Set();

  constructor() {
    if (isNetworkViewer) {
      this.followNetwork();
      return;
    }
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('cornerstone-bible-sync');
      this.channel.onmessage = (event) => {
        this.listeners.forEach(listener => listener(event.data));
      };
    }
  }

  broadcast(message: SyncMessage) {
    if (LIVE_TYPES.has(message.type)) this.remember(message);
    // Licensed online text that goes on screen is reported to its publisher
    if (message.type === 'VERSE_UPDATE' && message.data.verse) void BibleParser.reportShown(message.data.verse);
    if (message.type === 'COUNTDOWN') this.rememberCountdown(message.data.countdown);

    // Same-window listeners first, then other windows
    this.listeners.forEach(listener => listener(message));
    this.channel?.postMessage(message);
  }

  /** What is on screen now, or null if nothing has been shown yet. */
  current(): SyncMessage | null {
    try {
      const saved = localStorage.getItem(LIVE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  /** The running countdown, if any. */
  currentCountdown(): Countdown | null {
    try {
      const saved = localStorage.getItem(COUNTDOWN_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }

  showLogo(logoUrl: string) {
    this.broadcast({ type: 'LOGO', data: { logoUrl } });
  }

  subscribe(callback: (message: SyncMessage) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * On another device (network outputs): follow the operator's computer. Its
   * templates, logo and translation are stored here so the screens draw the same.
   */
  private followNetwork() {
    let lastLive = '';
    let lastCountdown = '';
    const source = new EventSource('/live');
    source.onmessage = (event) => {
      const state = JSON.parse(event.data) as NetworkSnapshot;
      try {
        saveTemplates(state.templates);
        saveAssignments(state.assignments);
        if (state.logo) localStorage.setItem('global-service-logo', state.logo);
        else localStorage.removeItem('global-service-logo');
        localStorage.setItem('cornerstone-bible-version', state.bibleVersion);
        window.dispatchEvent(new StorageEvent('storage'));
      } catch {
        // Storage full: keep showing with what is there
      }
      const live = JSON.stringify(state.live);
      if (state.live && live !== lastLive) {
        this.remember(state.live);
        this.listeners.forEach((listener) => listener(state.live!));
      }
      lastLive = live;
      const countdown = JSON.stringify(state.countdown);
      if (countdown !== lastCountdown) {
        const message: SyncMessage = { type: 'COUNTDOWN', data: { countdown: state.countdown } };
        this.rememberCountdown(state.countdown);
        this.listeners.forEach((listener) => listener(message));
      }
      lastCountdown = countdown;
    };
  }

  private rememberCountdown(countdown: Countdown | null | undefined) {
    try {
      if (countdown) localStorage.setItem(COUNTDOWN_KEY, JSON.stringify(countdown));
      else localStorage.removeItem(COUNTDOWN_KEY);
    } catch {
      // Storage full: reopened windows miss the countdown until it changes
    }
  }

  private remember(message: SyncMessage) {
    // The whole service can be large (images); outputs only need the next few slides
    const { allSlides: _allSlides, ...data } = message.data;
    try {
      localStorage.setItem(LIVE_KEY, JSON.stringify({ type: message.type, data }));
    } catch {
      // Storage full: windows that reopen will wait for the next change
    }
  }

  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const syncService = new SyncService();
