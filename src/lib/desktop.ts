/**
 * Bridge exposed by the Electron preload script (electron/preload.cjs).
 * Undefined when running in a normal browser.
 */
export interface DesktopBridge {
  platform: string;
  openai: {
    hasApiKey(): Promise<boolean>;
    setApiKey(key: string): Promise<void>;
    clearApiKey(): Promise<void>;
    /** Mint an ephemeral Realtime client secret; the API key never leaves the main process. */
    createClientSecret(session: unknown): Promise<{ value: string }>;
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
