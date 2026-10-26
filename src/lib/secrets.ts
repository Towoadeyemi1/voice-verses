import { desktop, SecretName } from './desktop';

export type { SecretName };

/**
 * API keys for cloud providers.
 *
 * Desktop: encrypted by the main process; requests go through
 * `secretFetch`, which adds the key outside the page.
 * Browser: kept in this browser's localStorage (the user's own key in their
 * own browser) and added to requests directly.
 */

const STORAGE_KEYS: Record<SecretName, string> = {
  openai: 'openai_api_key',
  anthropic: 'anthropic_api_key',
};
// Earlier builds stored the OpenAI key under this name
const LEGACY_OPENAI_KEY = 'dev_openai_api_key';

export const SECRET_LABELS: Record<SecretName, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic (Claude)',
};

export class MissingSecretError extends Error {
  constructor(name: SecretName) {
    super(`No ${SECRET_LABELS[name]} API key saved. Add it in Settings.`);
    this.name = 'MissingSecretError';
  }
}

/** Browser only: the stored key, or null. */
export function readBrowserSecret(name: SecretName): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS[name]) || (name === 'openai' ? localStorage.getItem(LEGACY_OPENAI_KEY) : null);
  } catch {
    return null;
  }
}

export async function hasSecret(name: SecretName): Promise<boolean> {
  return desktop ? desktop.secrets.has(name) : !!readBrowserSecret(name);
}

export async function setSecret(name: SecretName, value: string): Promise<void> {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('API key is empty');
  if (desktop) {
    await desktop.secrets.set(name, trimmed);
  } else {
    localStorage.setItem(STORAGE_KEYS[name], trimmed);
  }
  if (name === 'openai') localStorage.removeItem(LEGACY_OPENAI_KEY);
}

export async function clearSecret(name: SecretName): Promise<void> {
  if (desktop) await desktop.secrets.clear(name);
  localStorage.removeItem(STORAGE_KEYS[name]);
  if (name === 'openai') localStorage.removeItem(LEGACY_OPENAI_KEY);
}

const AUTH_HEADER: Record<SecretName, (key: string) => [string, string]> = {
  openai: (key) => ['Authorization', `Bearer ${key}`],
  anthropic: (key) => ['x-api-key', key],
};

/**
 * A `fetch` that authenticates as the given provider. Pass it to SDK clients
 * (their own API key option can then be a placeholder).
 */
export function secretFetch(name: SecretName): typeof fetch {
  return async (input, init) => {
    const request = new Request(input, init);

    if (!desktop) {
      const key = readBrowserSecret(name);
      if (!key) throw new MissingSecretError(name);
      const [header, value] = AUTH_HEADER[name](key);
      request.headers.set(header, value);
      return fetch(request);
    }

    const response = await desktop.secrets.fetch(name, {
      url: request.url,
      method: request.method,
      headers: [...request.headers.entries()],
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.text(),
    });
    return new Response(response.status === 204 ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  };
}
