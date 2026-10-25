// Stores the OpenAI API key in the main process, encrypted with the OS keychain
// (Keychain on macOS, DPAPI on Windows), and mints short-lived Realtime client
// secrets so the key itself never reaches the renderer.
import { app, safeStorage } from 'electron';
import { readFile, writeFile, rm } from 'fs/promises';
import { join } from 'path';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

const keyPath = () => join(app.getPath('userData'), 'openai-key.bin');

async function readKey() {
  try {
    const encrypted = await readFile(keyPath());
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}

export async function hasKey() {
  return (await readKey()) !== null;
}

export async function setKey(key) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('API key is empty');
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage is not available on this system, so the key cannot be saved safely.');
  }
  await writeFile(keyPath(), safeStorage.encryptString(key.trim()), { mode: 0o600 });
}

export async function clearKey() {
  await rm(keyPath(), { force: true });
}

function describeError(body, status) {
  try {
    const message = JSON.parse(body)?.error?.message;
    if (message) return message;
  } catch {
    // Not JSON
  }
  return `HTTP ${status}`;
}

export async function createClientSecret(session) {
  // Only transcription sessions may be minted from the renderer
  if (!session || typeof session !== 'object' || session.type !== 'transcription') {
    throw new Error('Invalid session configuration');
  }

  const apiKey = await readKey();
  if (!apiKey) {
    throw new Error('No OpenAI API key saved. Add it in Settings → Speech Engine.');
  }

  const response = await fetch(`${OPENAI_API_BASE}/realtime/client_secrets`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ session }),
  });

  if (!response.ok) {
    const message = describeError(await response.text(), response.status);
    throw new Error(response.status === 401 ? `OpenAI rejected the API key: ${message}` : `OpenAI error: ${message}`);
  }

  const data = await response.json();
  return { value: data.value };
}
