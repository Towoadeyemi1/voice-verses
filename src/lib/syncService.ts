import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';

export type SyncMessage = {
  type: 'VERSE_UPDATE' | 'STATUS_UPDATE' | 'SLIDE_UPDATE' | 'LOGO';
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
  };
};

/** Message types that change what is on screen; the latest one is kept so windows can catch up. */
const LIVE_TYPES = new Set<SyncMessage['type']>(['VERSE_UPDATE', 'SLIDE_UPDATE', 'LOGO']);
const LIVE_KEY = 'voice-verses-live';

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
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('cornerstone-bible-sync');
      this.channel.onmessage = (event) => {
        this.listeners.forEach(listener => listener(event.data));
      };
    }
  }

  broadcast(message: SyncMessage) {
    if (LIVE_TYPES.has(message.type)) this.remember(message);

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

  showLogo(logoUrl: string) {
    this.broadcast({ type: 'LOGO', data: { logoUrl } });
  }

  subscribe(callback: (message: SyncMessage) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
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
