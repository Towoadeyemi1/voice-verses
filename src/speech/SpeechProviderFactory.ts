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
        url: settings.localAsrUrl || 'wss://127.0.0.1:8765',
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
      apiKey: settings.openaiApiKey || null,
      language: settings.language || 'en',
      audioDeviceId: settings.audioDevice || null,
    },
    callbacks
  );
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
    // Convert ws:// to http:// for health check
    const healthUrl = url
      .replace('ws://', 'http://')
      .replace('wss://', 'https://')
      .replace('/asr', '/health')
      .replace(/\/$/, '') + '/health';

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
 * Load speech settings from localStorage
 */
export function loadSpeechSettings(): SpeechSettings {
  const savedSettings = localStorage.getItem('cornerstone-settings');
  const saved = savedSettings ? JSON.parse(savedSettings) : {};

  return {
    speechEngine: saved.speechEngine || 'openai',
    localEngine: saved.localEngine || 'vosk',
    localAsrUrl: saved.localAsrUrl || 'ws://127.0.0.1:8765',
    detectionAuthorityOpenAI: saved.detectionAuthorityOpenAI || 'transcript',
    openaiApiKey: saved.openaiApiKey || localStorage.getItem('dev_openai_api_key') || null,
    language: localStorage.getItem('transcription_language') || 'en',
    audioDevice: saved.audioDevice || null,
  };
}

/**
 * Save speech settings to localStorage
 */
export function saveSpeechSettings(settings: Partial<SpeechSettings>): void {
  const savedSettings = localStorage.getItem('cornerstone-settings');
  const current = savedSettings ? JSON.parse(savedSettings) : {};

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
