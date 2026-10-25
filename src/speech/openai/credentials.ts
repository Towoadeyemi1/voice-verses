import { desktop } from '@/lib/desktop';
import { readErrorResponse } from '@/lib/errors';
import { OPENAI_API_BASE, buildTranscriptionSession } from './realtimeSession';

/**
 * Where the ephemeral OpenAI Realtime client secret comes from, in priority order:
 *
 * 1. token-server: a backend we deployed (VITE_REALTIME_TOKEN_URL) holds the key.
 * 2. desktop:      the Electron main process holds the key, encrypted with the OS keychain.
 * 3. browser-key:  the user's own key, kept in this browser's localStorage.
 *
 * The static web build (GitHub Pages) has no backend, so it uses browser-key
 * unless a token server URL is configured at build time.
 */
export type CredentialMode = 'token-server' | 'desktop' | 'browser-key';

const TOKEN_SERVER_URL: string | undefined = import.meta.env.VITE_REALTIME_TOKEN_URL || undefined;

const STORAGE_KEY = 'openai_api_key';
const LEGACY_STORAGE_KEY = 'dev_openai_api_key';

export class MissingApiKeyError extends Error {
  constructor() {
    super('An OpenAI API key is required for the OpenAI speech engine. Add it in Settings → Speech Engine, or choose another engine.');
    this.name = 'MissingApiKeyError';
  }
}

export function getCredentialMode(): CredentialMode {
  if (TOKEN_SERVER_URL) return 'token-server';
  if (desktop) return 'desktop';
  return 'browser-key';
}

function readBrowserKey(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function hasApiKey(): Promise<boolean> {
  switch (getCredentialMode()) {
    case 'token-server':
      return true;
    case 'desktop':
      return desktop!.openai.hasApiKey();
    case 'browser-key':
      return !!readBrowserKey();
  }
}

export async function setApiKey(key: string): Promise<void> {
  const trimmed = key.trim();
  if (!trimmed) throw new Error('API key is empty');
  if (desktop) {
    await desktop.openai.setApiKey(trimmed);
  } else {
    localStorage.setItem(STORAGE_KEY, trimmed);
  }
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

export async function clearApiKey(): Promise<void> {
  if (desktop) await desktop.openai.clearApiKey();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}

/** Returns a short-lived client secret for a transcription session. */
export async function createClientSecret(language: string | null | undefined): Promise<string> {
  const session = buildTranscriptionSession(language);

  switch (getCredentialMode()) {
    case 'token-server': {
      const response = await fetch(TOKEN_SERVER_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
      if (!response.ok) {
        throw new Error(`Speech token server error: ${await readErrorResponse(response)}`);
      }
      return extractSecret(await response.json());
    }

    case 'desktop': {
      if (!(await desktop!.openai.hasApiKey())) throw new MissingApiKeyError();
      return extractSecret(await desktop!.openai.createClientSecret(session));
    }

    case 'browser-key': {
      const apiKey = readBrowserKey();
      if (!apiKey) throw new MissingApiKeyError();
      const response = await fetch(`${OPENAI_API_BASE}/realtime/client_secrets`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ session }),
      });
      if (!response.ok) {
        const message = await readErrorResponse(response);
        throw new Error(response.status === 401 ? `OpenAI rejected the API key: ${message}` : `OpenAI error: ${message}`);
      }
      return extractSecret(await response.json());
    }
  }
}

function extractSecret(data: unknown): string {
  // Current API returns { value }; older token servers returned { client_secret: { value } }
  const d = data as { value?: string; client_secret?: { value?: string } } | null;
  const value = d?.value ?? d?.client_secret?.value;
  if (!value) throw new Error('Invalid token response: no client secret returned');
  return value;
}
