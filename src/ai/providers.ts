import Anthropic from '@anthropic-ai/sdk';
import { readErrorResponse } from '@/lib/errors';
import { hasSecret, secretFetch } from '@/lib/secrets';
import { AiAssistantSettings, AiProviderType, isCloudProvider } from './settings';

/**
 * One chat-completion call against whichever provider the church configured.
 * Cloud providers authenticate through `secretFetch`, so on the desktop the
 * API key stays in the main process.
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  system: string;
  messages: ChatMessage[];
  /** JSON schema the reply must follow, when the provider supports it */
  jsonSchema?: Record<string, unknown>;
  signal?: AbortSignal;
}

const OPENAI_API = 'https://api.openai.com/v1';

// Current Claude generation: supports effort and structured outputs
const CURRENT_CLAUDE = /^claude-(opus|sonnet|haiku|fable|mythos)-5/;
// Models with server-side refusal fallback ("default" routing)
const CLAUDE_WITH_FALLBACK = /^claude-(opus-5|fable-5|sonnet-5-5)/;

let anthropicClient: Anthropic | null = null;
function anthropic(): Anthropic {
  // The key is added by secretFetch (desktop main process or this browser's storage)
  anthropicClient ??= new Anthropic({
    apiKey: 'added-by-secretFetch',
    fetch: secretFetch('anthropic'),
    dangerouslyAllowBrowser: true,
  });
  return anthropicClient;
}

async function chatAnthropic(model: string, request: ChatRequest): Promise<string> {
  const current = CURRENT_CLAUDE.test(model);
  const response = await anthropic().beta.messages.create(
    {
      model,
      max_tokens: 4000,
      system: request.system,
      messages: request.messages,
      ...(current && {
        // Short lookups don't need deep reasoning; keeps responses fast
        output_config: {
          effort: 'low',
          ...(request.jsonSchema && { format: { type: 'json_schema', schema: request.jsonSchema } }),
        },
      }),
      ...(CLAUDE_WITH_FALLBACK.test(model) && {
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
      }),
    },
    { signal: request.signal },
  );

  if (response.stop_reason === 'refusal') {
    throw new Error('Claude declined this request.');
  }
  return response.content
    .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');
}

async function chatOpenAIStyle(
  url: string,
  fetcher: typeof fetch,
  model: string,
  request: ChatRequest,
  jsonMode: boolean,
): Promise<string> {
  const response = await fetcher(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: request.signal,
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: request.system }, ...request.messages],
      ...(jsonMode && request.jsonSchema && { response_format: { type: 'json_object' } }),
    }),
  });
  if (!response.ok) throw new Error(await readErrorResponse(response));
  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function chatOllama(baseUrl: string, model: string, request: ChatRequest): Promise<string> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: request.signal,
    body: JSON.stringify({
      model,
      stream: false,
      messages: [{ role: 'system', content: request.system }, ...request.messages],
      ...(request.jsonSchema && { format: request.jsonSchema }),
      options: { temperature: 0 },
    }),
  });
  if (!response.ok) throw new Error(await readErrorResponse(response));
  const data = await response.json();
  return data.message?.content ?? '';
}

const trimUrl = (url: string) => url.trim().replace(/\/+$/, '');

export async function chat(settings: AiAssistantSettings, request: ChatRequest): Promise<string> {
  const { provider, model } = settings;
  if (!model) throw new Error('Choose a model in Settings → Speech → AI verse assistant.');

  switch (provider) {
    case 'anthropic':
      return chatAnthropic(model, request);
    case 'openai':
      return chatOpenAIStyle(`${OPENAI_API}/chat/completions`, secretFetch('openai'), model, request, true);
    case 'ollama':
      return chatOllama(trimUrl(settings.baseUrl), model, request);
    case 'openai-compatible':
      // Local servers vary in JSON-mode support, so rely on the prompt instead
      return chatOpenAIStyle(`${trimUrl(settings.baseUrl)}/v1/chat/completions`, fetch, model, request, false);
  }
}

/** Model names available to the current settings (installed locally, or offered by the cloud account). */
export async function listModels(settings: Pick<AiAssistantSettings, 'provider' | 'baseUrl'>): Promise<string[]> {
  const { provider } = settings;
  if (isCloudProvider(provider) && !(await hasSecret(provider))) return [];

  switch (provider) {
    case 'anthropic': {
      const ids: string[] = [];
      for await (const model of anthropic().models.list()) ids.push(model.id);
      return ids;
    }
    case 'openai': {
      const response = await secretFetch('openai')(`${OPENAI_API}/models`);
      if (!response.ok) throw new Error(await readErrorResponse(response));
      const data = await response.json();
      return (data.data ?? []).map((m: { id: string }) => m.id).sort();
    }
    case 'ollama': {
      const response = await fetch(`${trimUrl(settings.baseUrl)}/api/tags`);
      if (!response.ok) throw new Error(await readErrorResponse(response));
      const data = await response.json();
      return (data.models ?? []).map((m: { name: string }) => m.name.replace(/:latest$/, ''));
    }
    case 'openai-compatible': {
      const response = await fetch(`${trimUrl(settings.baseUrl)}/v1/models`);
      if (!response.ok) throw new Error(await readErrorResponse(response));
      const data = await response.json();
      return (data.data ?? []).map((m: { id: string }) => m.id);
    }
  }
}

/** Human-readable reason the provider can't be reached, for the settings screen. */
export function describeConnectionError(provider: AiProviderType, baseUrl: string, error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!isCloudProvider(provider) && /fetch|network|load failed/i.test(message)) {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const ollamaHint =
      provider === 'ollama' && origin.startsWith('http') && !origin.includes('localhost')
        ? ` If Ollama is running, allow this site by setting OLLAMA_ORIGINS=${origin} and restarting Ollama.`
        : '';
    return `Cannot reach ${baseUrl}. Is the server running?${ollamaHint}`;
  }
  return message;
}
