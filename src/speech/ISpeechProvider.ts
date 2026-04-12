import { BibleVerse } from '@/types/bible';

export type DetectionInfo = {
  method: 'explicit' | 'description' | 'manual' | 'unknown';
  description?: string;
  confidence?: 'high' | 'medium' | 'low';
  engine?: 'openai' | 'vosk' | 'sherpa' | 'whisper';
};

export type SpeechEngineType = 'openai' | 'local' | 'webspeech';
export type LocalEngineType = 'vosk' | 'sherpa' | 'whisper';
export type DetectionAuthorityType = 'tool' | 'transcript' | 'hybrid';

export interface SpeechSettings {
  speechEngine: SpeechEngineType;
  localEngine: LocalEngineType;
  localAsrUrl: string;
  detectionAuthorityOpenAI: DetectionAuthorityType;
  openaiApiKey?: string | null;
  language?: string;
  audioDevice?: string | null;
}

export const DEFAULT_SPEECH_SETTINGS: SpeechSettings = {
  speechEngine: 'openai',
  localEngine: 'vosk',
  localAsrUrl: 'ws://127.0.0.1:8765',
  detectionAuthorityOpenAI: 'transcript',
  language: 'en',
};

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
