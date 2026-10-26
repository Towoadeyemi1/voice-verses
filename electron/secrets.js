// API keys live in the main process, encrypted with the OS keychain (Keychain on
// macOS, DPAPI on Windows). The renderer can ask whether a key exists, replace or
// remove it, and send requests through fetchWithSecret, which adds the key only
// for that provider's own API host. The key itself never reaches the renderer.
import { app, safeStorage } from 'electron';
import { mkdir, readFile, writeFile, rm } from 'fs/promises';
import { join } from 'path';

const PROVIDERS = {
  openai: {
    origin: 'https://api.openai.com',
    authHeaders: (key) => ({ authorization: `Bearer ${key}` }),
  },
  anthropic: {
    origin: 'https://api.anthropic.com',
    authHeaders: (key) => ({ 'x-api-key': key }),
  },
};

function provider(name) {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown key name: ${name}`);
  return p;
}

const secretsDir = () => join(app.getPath('userData'), 'secrets');
const secretPath = (name) => join(secretsDir(), `${name}.bin`);
// Location used by earlier builds for the OpenAI key
const legacyOpenAIPath = () => join(app.getPath('userData'), 'openai-key.bin');

async function readSecret(name) {
  provider(name);
  const paths = name === 'openai' ? [secretPath(name), legacyOpenAIPath()] : [secretPath(name)];
  for (const path of paths) {
    try {
      return safeStorage.decryptString(await readFile(path));
    } catch {
      // Try the next location
    }
  }
  return null;
}

export async function hasSecret(name) {
  return (await readSecret(name)) !== null;
}

export async function setSecret(name, value) {
  provider(name);
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('API key is empty');
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage is not available on this system, so the key cannot be saved safely.');
  }
  await mkdir(secretsDir(), { recursive: true });
  await writeFile(secretPath(name), safeStorage.encryptString(value.trim()), { mode: 0o600 });
}

export async function clearSecret(name) {
  provider(name);
  await rm(secretPath(name), { force: true });
  if (name === 'openai') await rm(legacyOpenAIPath(), { force: true });
}

/**
 * Perform an HTTP request to a provider's API with its stored key added.
 * `request` is { url, method, headers: [[name, value]], body?: string }.
 */
export async function fetchWithSecret(name, request) {
  const { origin, authHeaders } = provider(name);
  const url = new URL(String(request?.url));
  if (url.origin !== origin) {
    throw new Error(`Requests with the ${name} key may only go to ${origin}`);
  }

  const key = await readSecret(name);
  if (!key) {
    throw new Error(`No ${name === 'anthropic' ? 'Anthropic' : 'OpenAI'} API key saved. Add it in Settings.`);
  }

  // Drop any credential headers the renderer sent; ours replace them
  const headers = Object.fromEntries(
    (request.headers ?? []).filter(([h]) => !['authorization', 'x-api-key'].includes(String(h).toLowerCase())),
  );
  const response = await fetch(url, {
    method: request.method || 'GET',
    headers: { ...headers, ...authHeaders(key) },
    body: request.body ?? undefined,
  });

  return {
    status: response.status,
    statusText: response.statusText,
    headers: [...response.headers.entries()],
    body: await response.text(),
  };
}
