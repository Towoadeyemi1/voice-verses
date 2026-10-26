/**
 * Bridge exposed by the Electron preload script (electron/preload.cjs).
 * Undefined when running in a normal browser.
 */
export type SecretName = 'openai' | 'anthropic';

export interface SerializedRequest {
  url: string;
  method: string;
  headers: [string, string][];
  body?: string;
}

export interface SerializedResponse {
  status: number;
  statusText: string;
  headers: [string, string][];
  body: string;
}

export type SpeechWorkerEvent =
  | { type: 'partial'; session: number; text: string }
  | { type: 'final'; session: number; text: string; start: number; end: number }
  | { type: 'progress'; session: number; seconds: number }
  | { type: 'done'; session: number }
  | { type: 'error'; session?: number; message: string };

export interface DesktopBridge {
  platform: string;
  getVersion(): Promise<string>;
  /** A newer version exists but this build can't install it itself (unsigned macOS build) */
  onUpdateAvailable(callback: (info: { version: string; url: string }) => void): () => void;
  secrets: {
    has(name: SecretName): Promise<boolean>;
    set(name: SecretName, value: string): Promise<void>;
    clear(name: SecretName): Promise<void>;
    /** Sends the request from the main process with the stored key added; the key never reaches the page. */
    fetch(name: SecretName, request: SerializedRequest): Promise<SerializedResponse>;
  };
  speech: {
    /** Whether the bundled on-device speech models are installed */
    isAvailable(): Promise<boolean>;
    /** 'live' streams microphone audio; 'file' transcribes a recording as fast as possible */
    start(mode: 'live' | 'file'): Promise<number>;
    /** 16 kHz mono samples */
    sendAudio(session: number, samples: Float32Array): void;
    /** No more audio: transcribe what is left, then send 'done' */
    finish(session: number): void;
    stop(session: number): void;
    onEvent(callback: (event: SpeechWorkerEvent) => void): () => void;
  };
  library: {
    getFolder(): Promise<string | null>;
    chooseFolder(): Promise<string | null>;
    forgetFolder(): Promise<void>;
    list(dir: 'services' | 'media'): Promise<string[]>;
    read(path: string): Promise<string | null>;
    write(path: string, text: string): Promise<void>;
    /** Called when files in the library folder change on disk (e.g. synced from another computer). */
    onChange(callback: () => void): () => void;
  };
}

declare global {
  interface Window {
    voiceVerses?: DesktopBridge;
  }
}

export const desktop: DesktopBridge | null =
  typeof window !== 'undefined' ? window.voiceVerses ?? null : null;

export const isDesktop = desktop !== null;
