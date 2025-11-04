export interface BibleVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface BibleContext {
  book: string;
  chapter: number;
}

export interface DisplayedVerse extends BibleVerse {
  timestamp: Date;
  latency: number;
}

export interface AudioStatus {
  isListening: boolean;
  volume: number;
  status: 'idle' | 'listening' | 'processing' | 'error';
}

export interface AppSettings {
  translation: string;
  fontSize: number;
  theme: 'light' | 'dark' | 'church';
  inputDevice: string;
}
