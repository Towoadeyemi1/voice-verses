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

export interface DesktopBridge {
  platform: string;
  secrets: {
    has(name: SecretName): Promise<boolean>;
    set(name: SecretName, value: string): Promise<void>;
    clear(name: SecretName): Promise<void>;
    /** Sends the request from the main process with the stored key added; the key never reaches the page. */
    fetch(name: SecretName, request: SerializedRequest): Promise<SerializedResponse>;
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
