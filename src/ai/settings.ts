/**
 * Settings for the optional AI verse assistant: the "understanding" step that
 * recognises paraphrased or described passages ("the verse about the Good
 * Shepherd"). It runs on transcribed text, so it works with any speech engine.
 */

export type AiProviderType = 'anthropic' | 'openai' | 'ollama' | 'openai-compatible';

export interface AiAssistantSettings {
  enabled: boolean;
  provider: AiProviderType;
  model: string;
  /** Local servers only */
  baseUrl: string;
  /** 'cues': only sentences that sound like scripture talk; 'every': every sentence (more requests) */
  trigger: 'cues' | 'every';
  /** Show confident AI matches on screen without the operator confirming */
  autoDisplay: boolean;
}

export const PROVIDER_LABELS: Record<AiProviderType, string> = {
  anthropic: 'Claude (Anthropic)',
  openai: 'OpenAI',
  ollama: 'Ollama (on this computer)',
  'openai-compatible': 'Other local server (LM Studio, Jan, llama.cpp…)',
};

export const DEFAULT_MODELS: Record<AiProviderType, string> = {
  anthropic: 'claude-opus-5-5',
  openai: '',
  ollama: 'llama3.2',
  'openai-compatible': '',
};

export const DEFAULT_BASE_URLS: Record<AiProviderType, string> = {
  anthropic: '',
  openai: '',
  ollama: 'http://localhost:11434',
  'openai-compatible': 'http://localhost:1234',
};

export const isCloudProvider = (provider: AiProviderType): provider is 'anthropic' | 'openai' =>
  provider === 'anthropic' || provider === 'openai';

const STORAGE_KEY = 'ai-assistant-settings';
export const AI_SETTINGS_CHANGED_EVENT = 'ai-assistant-settings-changed';

/** Earlier builds had a "Local AI" speech engine; carry its server and model over. */
function fromLegacySpeechSettings(): AiAssistantSettings | null {
  try {
    const legacy = JSON.parse(localStorage.getItem('cornerstone-settings') || '{}');
    if (legacy.speechEngine !== 'ollama') return null;
    const provider: AiProviderType = legacy.localLlmApiType === 'openai-compatible' ? 'openai-compatible' : 'ollama';
    return {
      ...defaults(),
      enabled: true,
      provider,
      model: legacy.ollamaModel || DEFAULT_MODELS[provider],
      baseUrl: legacy.ollamaUrl || DEFAULT_BASE_URLS[provider],
    };
  } catch {
    return null;
  }
}

function defaults(): AiAssistantSettings {
  return {
    enabled: false,
    provider: 'anthropic',
    model: DEFAULT_MODELS.anthropic,
    baseUrl: '',
    trigger: 'cues',
    autoDisplay: false,
  };
}

export function loadAiSettings(): AiAssistantSettings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...defaults(), ...JSON.parse(saved) };
  } catch {
    // Fall through to defaults
  }
  return fromLegacySpeechSettings() ?? defaults();
}

export function saveAiSettings(settings: AiAssistantSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(AI_SETTINGS_CHANGED_EVENT));
}
