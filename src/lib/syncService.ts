import { BibleVerse } from '@/types/bible';
import { Slide } from '@/types/service';

export type SyncMessage = {
  type: 'VERSE_UPDATE' | 'STATUS_UPDATE' | 'SLIDE_UPDATE';
  data: {
    verse?: BibleVerse | null;
    timestamp?: Date;
    latency?: number;
    isListening?: boolean;
    transcript?: string;
    slide?: Slide | null;
    index?: number;
  };
};

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
    if (this.channel) {
      this.channel.postMessage(message);
    }
  }

  subscribe(callback: (message: SyncMessage) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  close() {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
}

export const syncService = new SyncService();
