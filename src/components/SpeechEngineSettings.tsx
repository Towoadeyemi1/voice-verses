import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import { loadSpeechSettings, saveSpeechSettings, SpeechEngineType } from '@/speech';
import { getDefaultSpeechEngine } from '@/speech/SpeechProviderFactory';
import { desktop, isDesktop } from '@/lib/desktop';
import { DOWNLOAD_PAGE_URL } from '@/lib/releases';
import { ApiKeySettings } from './ApiKeySettings';
import { RecordingTest } from './RecordingTest';
import { WebSpeechProvider } from '@/speech/providers/WebSpeechProvider';
import { Note, Section } from './settings/kit';

interface EngineOption {
  value: SpeechEngineType;
  title: string;
  description: string;
  available: boolean;
  unavailableReason?: string;
}

export const SpeechEngineSettings = () => {
  const [speechEngine, setSpeechEngine] = useState<SpeechEngineType>(getDefaultSpeechEngine);
  const [builtInReady, setBuiltInReady] = useState<boolean | null>(null);

  useEffect(() => {
    setSpeechEngine(loadSpeechSettings().speechEngine);
    desktop?.speech.isAvailable().then(setBuiltInReady).catch(() => setBuiltInReady(false));
  }, []);

  const webSpeechSupported = WebSpeechProvider.isSupported();
  const options: EngineOption[] = [
    {
      value: 'builtin',
      title: 'On this computer (recommended)',
      description: 'Works without internet. Free and private.',
      available: isDesktop,
      unavailableReason: 'Available in the Voice Verses desktop app.',
    },
    {
      value: 'webspeech',
      title: 'The browser',
      description: "Uses the browser's built-in speech recognition. Free, no setup. Audio is processed by the browser maker (e.g. Google for Chrome).",
      available: webSpeechSupported,
      unavailableReason: isDesktop
        ? 'Not available in the desktop app; use Built-in instead.'
        : 'Not supported in this browser. Try Chrome or Edge.',
    },
    {
      value: 'openai',
      title: 'OpenAI',
      description: 'Over the internet, billed to your OpenAI account.',
      available: true,
    },
  ];

  const choose = (engine: SpeechEngineType) => {
    setSpeechEngine(engine);
    saveSpeechSettings({ speechEngine: engine });
    window.dispatchEvent(new CustomEvent('settings-updated'));
  };

  return (
    <>
      <Section title="How speech is heard">
        <div className="st-choices" role="radiogroup" aria-label="Speech engine">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              id={`engine-${option.value}`}
              aria-checked={speechEngine === option.value}
              disabled={!option.available}
              onClick={() => choose(option.value)}
              className="st-choice disabled:opacity-50 disabled:cursor-default"
            >
              <b>{option.title}</b>
              <span>{option.available ? option.description : option.unavailableReason}</span>
            </button>
          ))}
        </div>
        {!isDesktop && (
          <div className="st-note">
            <Download aria-hidden="true" />
            <span className="flex-1">For offline, free speech recognition, install the desktop app.</span>
            <a className="st-btn" href={DOWNLOAD_PAGE_URL} target="_blank" rel="noopener noreferrer">
              Download
            </a>
          </div>
        )}
        {speechEngine === 'builtin' && isDesktop && (
          <Note icon={builtInReady === false ? AlertTriangle : CheckCircle2} warn={builtInReady === false}>
            {builtInReady === false
              ? 'The speech model is missing from this copy of Voice Verses. Reinstall it.'
              : 'English speech model (NVIDIA Parakeet) installed. The first start takes a few seconds while it loads.'}
          </Note>
        )}
        {speechEngine === 'openai' && <ApiKeySettings secret="openai" description="High-accuracy transcription billed to your OpenAI account." />}
      </Section>
      {isDesktop && <RecordingTest />}
    </>
  );
};
