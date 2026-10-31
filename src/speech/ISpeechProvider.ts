import { BibleVerse } from '@/types/bible';

export type SpeechEngineType = 'builtin' | 'webspeech' | 'openai';

export type DetectionInfo = {
  method: 'explicit' | 'description' | 'manual' | 'unknown';
  description?: string;
  confidence?: 'high' | 'medium' | 'low';
  /** Which speech engine heard it, or 'ai' for the AI verse assistant */
  engine?: SpeechEngineType | 'ai';
  /** How sure, 0 to 1 (a reference said aloud is 1; a quote is how much of the verse was said and how clearly) */
  score?: number;
};

export interface SpeechSettings {
  speechEngine: SpeechEngineType;
  language?: string;
  audioDevice?: string | null;
  /** 0-based channel of a multichannel input device; null for its normal input */
  audioChannel?: number | null;
}

export interface TranscriptCallback {
  (text: string, isFinal: boolean): void;
}

export interface VolumeCallback {
  (volume: number): void;
}

export interface ErrorCallback {
  (error: Error): void;
}

export interface VerseCandidateCallback {
  (text: string): void;
}

export interface ISpeechProvider {
  /**
   * Initialize the speech provider (connect to service, set up audio, etc.)
   */
  init(): Promise<void>;

  /**
   * Disconnect and clean up resources
   */
  disconnect(): void;

  /**
   * Mute or unmute the microphone input
   */
  setMicrophoneMuted(muted: boolean): void;

  /**
   * Register callback for transcript events
   * Provider emits transcripts (partial/final). Some providers may only emit final.
   */
  onTranscript(cb: TranscriptCallback): void;

  /**
   * Register callback for volume updates (for visualizer)
   */
  onVolumeUpdate(cb: VolumeCallback): void;

  /**
   * Register callback for error events
   */
  onError(cb: ErrorCallback): void;

  /**
   * Optional: Provider can emit "verse candidate" events.
   * NOTE: In our final architecture, verse detection is centralized,
   * so providers should normally NOT call this.
   */
  onVerseCandidate?(cb: VerseCandidateCallback): void;

  /**
   * Get the current engine type
   */
  getEngineType(): SpeechEngineType;

  /**
   * Check if the provider is currently connected
   */
  isConnected(): boolean;
}
