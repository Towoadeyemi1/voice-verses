import { ISpeechProvider, SpeechSettings, SpeechEngineType } from './ISpeechProvider';
import { OpenAISpeechProvider } from './providers/OpenAISpeechProvider';
import { LocalSpeechWSProvider } from './providers/LocalSpeechWSProvider';
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

  if (settings.speechEngine === 'local') {
    return new LocalSpeechWSProvider(
      {
        url: settings.localAsrUrl || 'ws://127.0.0.1:8765',
        engine: settings.localEngine || 'vosk',
        language: settings.language || 'en',
        audioDeviceId: settings.audioDevice || null,
      },
      callbacks
    );
  }

  if (settings.speechEngine === 'webspeech') {
    return new WebSpeechProvider(
      {
        language: settings.language || 'en-US',
        audioDeviceId: settings.audioDevice || null,
      },
      callbacks
    );
  }

  // Default: OpenAI
  return new OpenAISpeechProvider(
    {
      language: settings.language || 'en',
      audioDeviceId: settings.audioDevice || null,
    },
    callbacks
  );
}

/** Human-readable engine name for status messages */
export function getEngineDisplayName(settings: SpeechSettings): string {
  switch (settings.speechEngine) {
    case 'local':
      return `local ${settings.localEngine}`;
    case 'webspeech':
      return 'browser speech recognition';
    default:
      return 'OpenAI';
  }
}

/**
 * Check if a local speech service is available
 */
export async function checkLocalServiceHealth(url: string): Promise<{
  ok: boolean;
  engines?: string[];
  active?: string;
  version?: string;
  error?: string;
}> {
  try {
    // Convert ws:// to http:// for health check.
    // Strip any trailing /asr path first, then append /health exactly once.
    const healthUrl = url
      .replace('ws://', 'http://')
      .replace('wss://', 'https://')
      .replace(/\/asr$/, '')
      .replace(/\/$/, '')
      + '/health';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { ok: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    return {
      ok: data.ok ?? true,
      engines: data.engines || [],
      active: data.active,
      version: data.version,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { ok: false, error: 'Connection timeout' };
    }
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Normalize URL protocol: ensure wss:// is migrated to ws:// since the local service no longer uses TLS
 */
function normalizeLocalAsrUrl(url: string | undefined): string {
  if (!url) return 'ws://127.0.0.1:8765';
  // Migrate old wss:// to ws://
  return url.replace(/^wss:\/\//, 'ws://');
}

/**
 * Default engine when the user hasn't chosen one: the browser's built-in
 * recognition (free, no setup) where it works, otherwise OpenAI. The desktop
 * app can't use Web Speech, and stores the OpenAI key securely.
 */
export function getDefaultSpeechEngine(): SpeechEngineType {
  return WebSpeechProvider.isSupported() ? 'webspeech' : 'openai';
}

function readSavedSettings(): Partial<SpeechSettings> {
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
    // The old "Local AI" engine is now the AI verse assistant (src/ai) on top of any engine
    speechEngine: saved.speechEngine && (saved.speechEngine as string) !== 'ollama' ? saved.speechEngine : getDefaultSpeechEngine(),
    localEngine: saved.localEngine || 'vosk',
    localAsrUrl: normalizeLocalAsrUrl(saved.localAsrUrl) || 'ws://127.0.0.1:8765',
    detectionAuthorityOpenAI: saved.detectionAuthorityOpenAI || 'transcript',
    language: localStorage.getItem('transcription_language') || 'en',
    audioDevice: saved.audioDevice || null,
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
    localEngine: settings.localEngine ?? current.localEngine,
    localAsrUrl: settings.localAsrUrl ?? current.localAsrUrl,
    detectionAuthorityOpenAI: settings.detectionAuthorityOpenAI ?? current.detectionAuthorityOpenAI,
    audioDevice: settings.audioDevice ?? current.audioDevice,
  };

  localStorage.setItem('cornerstone-settings', JSON.stringify(updated));
}
