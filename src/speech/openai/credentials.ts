import { readErrorResponse } from '@/lib/errors';
import { MissingSecretError, hasSecret, secretFetch } from '@/lib/secrets';
import { OPENAI_API_BASE, buildTranscriptionSession } from './realtimeSession';

/** Returns a short-lived client secret for an OpenAI Realtime transcription session. */
export async function createClientSecret(language: string | null | undefined): Promise<string> {
  if (!(await hasSecret('openai'))) throw new MissingSecretError('openai');

  const response = await secretFetch('openai')(`${OPENAI_API_BASE}/realtime/client_secrets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session: buildTranscriptionSession(language) }),
  });

  if (!response.ok) {
    const message = await readErrorResponse(response);
    throw new Error(response.status === 401 ? `OpenAI rejected the API key: ${message}` : `OpenAI error: ${message}`);
  }

  const data = (await response.json()) as { value?: string };
  if (!data.value) throw new Error('Invalid token response: no client secret returned');
  return data.value;
}
