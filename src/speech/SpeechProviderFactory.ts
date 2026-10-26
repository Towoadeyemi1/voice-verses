import { ISpeechProvider, SpeechSettings, SpeechEngineType } from './ISpeechProvider';
import { OpenAISpeechProvider } from './providers/OpenAISpeechProvider';
import { BuiltInSpeechProvider } from './providers/BuiltInSpeechProvider';
import { WebSpeechProvider } from './providers/WebSpeechProvider';

export interface SpeechProviderCallbacks {
  onTranscript: (text: string, isFinal: boolean) => void;
  onVolumeUpdate: (volume: number) => void;
  onError: (err: Error) => void;
}

/**
 * Factory function to create the appropriate speech provider based on settings.
 * This centralizes engine selection and prevents scattered if-else logic throughout the UI.
 */
export function createSpeechProvider(
  settings: SpeechSettings,
  callbacks: SpeechProviderCallbacks
): ISpeechProvider {
  console.log('Creating speech provider with engine:', settings.speechEngine);
  const audioDeviceId = settings.audioDevice || null;

  switch (settings.speechEngine) {
    case 'builtin':
      return new BuiltInSpeechProvider({ audioDeviceId }, callbacks);
    case 'webspeech':
      return new WebSpeechProvider({ language: settings.language || 'en-US', audioDeviceId }, callbacks);
    case 'openai':
      return new OpenAISpeechProvider({ language: settings.language || 'en', audioDeviceId }, callbacks);
  }
}

/** Human-readable engine name for status messages */
export function getEngineDisplayName(settings: SpeechSettings): string {
  switch (settings.speechEngine) {
    case 'builtin':
      return 'built-in speech recognition';
    case 'webspeech':
      return 'browser speech recognition';
    case 'openai':
      return 'OpenAI';
  }
}

/**
 * Default engine when the user hasn't chosen one: built-in recognition in the
 * desktop app; on the web, the browser's own (free, no setup) where it works,
 * otherwise OpenAI.
 */
export function getDefaultSpeechEngine(): SpeechEngineType {
  if (BuiltInSpeechProvider.isSupported()) return 'builtin';
  return WebSpeechProvider.isSupported() ? 'webspeech' : 'openai';
}

const ENGINES: SpeechEngineType[] = ['builtin', 'webspeech', 'openai'];

function isUsable(engine: unknown): engine is SpeechEngineType {
  switch (engine) {
    case 'builtin':
      return BuiltInSpeechProvider.isSupported();
    case 'webspeech':
      return WebSpeechProvider.isSupported();
    default:
      return ENGINES.includes(engine as SpeechEngineType);
  }
}

function readSavedSettings(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem('cornerstone-settings') || '{}') ?? {};
  } catch {
    return {};
  }
}

/**
 * Load speech settings from localStorage
 */
export function loadSpeechSettings(): SpeechSettings {
  const saved = readSavedSettings();

  return {
    // Engines from earlier builds ("local" speech service, "ollama") or ones this
    // platform can't run fall back to the default. Ollama now lives in the AI assistant.
    speechEngine: isUsable(saved.speechEngine) ? saved.speechEngine : getDefaultSpeechEngine(),
    language: localStorage.getItem('transcription_language') || 'en',
    audioDevice: (saved.audioDevice as string) || null,
  };
}

/**
 * Save speech settings to localStorage
 */
export function saveSpeechSettings(settings: Partial<SpeechSettings>): void {
  const current = readSavedSettings();

  const updated = {
    ...current,
    speechEngine: settings.speechEngine ?? current.speechEngine,
    audioDevice: settings.audioDevice ?? current.audioDevice,
  };

  localStorage.setItem('cornerstone-settings', JSON.stringify(updated));
}
